const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../database/db');
const { logAudit } = require('./audit');
const {
    generateAccessToken,
    generateRefreshToken,
    generateServiceToken,
    verifyToken,
    isDeviceRegistered,
    evaluatePolicy
} = require('./policy');

const app = express();
const PORT = process.env.PORT_GATEWAY || 3000;
const PORT_NILAI = process.env.PORT_NILAI || 3001;
const PORT_TRANSKRIP = process.env.PORT_TRANSKRIP || 3002;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'super-secure-internal-gateway-secret-2026';

// Global parser
app.use(express.json());

// ----------------------------------------------------
// 1. Policy Administrator (PA) / Auth Endpoints (Port 3000)
// ----------------------------------------------------

/**
 * POST /auth/login
 * User login: validates credentials and registered device.
 */
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    const deviceId = req.headers['x-device-id'];
    const ip = req.ip || req.socket.remoteAddress;

    if (!username || !password) {
        logAudit({
            subject: username || 'anonymous',
            role: 'none',
            endpoint: '/auth/login',
            method: 'POST',
            deviceId: deviceId,
            decision: 'DENY',
            reason: 'Missing username or password in request body',
            ipAddress: ip
        });
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Verify user credentials
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        logAudit({
            subject: username,
            role: 'none',
            endpoint: '/auth/login',
            method: 'POST',
            deviceId: deviceId,
            decision: 'DENY',
            reason: 'Invalid username or password',
            ipAddress: ip
        });
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Zero Trust Context Check: Device registration
    if (!deviceId) {
        logAudit({
            subject: username,
            role: user.role,
            endpoint: '/auth/login',
            method: 'POST',
            deviceId: null,
            decision: 'DENY',
            reason: 'Missing X-Device-ID header. Device identification is required.',
            ipAddress: ip
        });
        return res.status(403).json({ error: 'X-Device-ID header is required for login' });
    }

    if (!isDeviceRegistered(user.id, deviceId)) {
        logAudit({
            subject: username,
            role: user.role,
            endpoint: '/auth/login',
            method: 'POST',
            deviceId: deviceId,
            decision: 'DENY',
            reason: `Device '${deviceId}' is not registered for user '${username}'`,
            ipAddress: ip
        });
        return res.status(403).json({ error: `Device '${deviceId}' is not registered for this user` });
    }

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    logAudit({
        subject: username,
        role: user.role,
        endpoint: '/auth/login',
        method: 'POST',
        deviceId: deviceId,
        decision: 'ALLOW',
        reason: 'Login successful, access and refresh token issued',
        ipAddress: ip
    });

    return res.json({
        message: 'Login successful',
        token_type: 'Bearer',
        access_token: accessToken,
        expires_in: 600, // 10 minutes
        refresh_token: refreshToken,
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            nama: user.nama,
            identifier: user.identifier
        }
    });
});

/**
 * POST /auth/refresh
 * Refresh access token using non-revoked refresh token.
 */
app.post('/auth/refresh', (req, res) => {
    const { refresh_token } = req.body || {};
    const ip = req.ip || req.socket.remoteAddress;

    if (!refresh_token) {
        logAudit({
            subject: 'anonymous',
            role: 'none',
            endpoint: '/auth/refresh',
            method: 'POST',
            deviceId: null,
            decision: 'DENY',
            reason: 'Missing refresh_token in request body',
            ipAddress: ip
        });
        return res.status(400).json({ error: 'refresh_token is required' });
    }

    const row = db.prepare(`
        SELECT r.*, u.username, u.role, u.nama, u.identifier
        FROM refresh_tokens r
        JOIN users u ON r.user_id = u.id
        WHERE r.token = ?
    `).get(refresh_token);

    if (!row) {
        logAudit({
            subject: 'anonymous',
            role: 'none',
            endpoint: '/auth/refresh',
            method: 'POST',
            deviceId: null,
            decision: 'DENY',
            reason: 'Refresh token not found in database',
            ipAddress: ip
        });
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (row.revoked === 1) {
        logAudit({
            subject: row.username,
            role: row.role,
            endpoint: '/auth/refresh',
            method: 'POST',
            deviceId: null,
            decision: 'DENY',
            reason: 'Refresh token has been revoked',
            ipAddress: ip
        });
        return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    if (new Date(row.expires_at) < new Date()) {
        logAudit({
            subject: row.username,
            role: row.role,
            endpoint: '/auth/refresh',
            method: 'POST',
            deviceId: null,
            decision: 'DENY',
            reason: 'Refresh token has expired',
            ipAddress: ip
        });
        return res.status(401).json({ error: 'Refresh token has expired' });
    }

    // Issue new access token
    const newAccessToken = generateAccessToken({
        id: row.user_id,
        username: row.username,
        role: row.role,
        identifier: row.identifier,
        nama: row.nama
    });

    logAudit({
        subject: row.username,
        role: row.role,
        endpoint: '/auth/refresh',
        method: 'POST',
        deviceId: null,
        decision: 'ALLOW',
        reason: 'New access token successfully generated from refresh token',
        ipAddress: ip
    });

    return res.json({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 600
    });
});

/**
 * POST /auth/logout
 * Revokes refresh token in database.
 */
app.post('/auth/logout', (req, res) => {
    const { refresh_token } = req.body || {};
    const ip = req.ip || req.socket.remoteAddress;

    if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token is required for logout' });
    }

    const row = db.prepare('SELECT user_id, revoked FROM refresh_tokens WHERE token = ?').get(refresh_token);
    if (!row) {
        return res.status(404).json({ error: 'Refresh token not found' });
    }

    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?').run(refresh_token);

    const user = db.prepare('SELECT username, role FROM users WHERE id = ?').get(row.user_id);

    logAudit({
        subject: user ? user.username : `user_${row.user_id}`,
        role: user ? user.role : 'none',
        endpoint: '/auth/logout',
        method: 'POST',
        deviceId: req.headers['x-device-id'] || null,
        decision: 'ALLOW',
        reason: 'Refresh token revoked, user logged out',
        ipAddress: ip
    });

    return res.json({ message: 'Logout successful, refresh token revoked' });
});

/**
 * POST /auth/service
 * Authenticates microservice clients (Service Nilai) via Client ID and Secret.
 * Generates service token with role: "service", TTL: 5 minutes.
 */
app.post('/auth/service', (req, res) => {
    const { client_id, client_secret } = req.body || {};
    const ip = req.ip || req.socket.remoteAddress;

    if (!client_id || !client_secret) {
        logAudit({
            subject: client_id || 'unknown_service',
            role: 'service',
            endpoint: '/auth/service',
            method: 'POST',
            deviceId: null,
            decision: 'DENY',
            reason: 'Missing client_id or client_secret in request body',
            ipAddress: ip
        });
        return res.status(400).json({ error: 'client_id and client_secret are required' });
    }

    const client = db.prepare('SELECT * FROM service_clients WHERE client_id = ? AND client_secret = ?').get(client_id, client_secret);

    if (!client) {
        logAudit({
            subject: client_id,
            role: 'service',
            endpoint: '/auth/service',
            method: 'POST',
            deviceId: null,
            decision: 'DENY',
            reason: 'Invalid service client credentials',
            ipAddress: ip
        });
        return res.status(401).json({ error: 'Invalid client_id or client_secret' });
    }

    const serviceToken = generateServiceToken(client.client_id, client.service_name);

    logAudit({
        subject: client.client_id,
        role: 'service',
        endpoint: '/auth/service',
        method: 'POST',
        deviceId: null,
        decision: 'ALLOW',
        reason: `Service token generated for '${client.service_name}' (TTL: 5m, role: service)`,
        ipAddress: ip
    });

    return res.json({
        access_token: serviceToken,
        token_type: 'Bearer',
        expires_in: 300,
        role: 'service',
        client_id: client.client_id
    });
});

/**
 * GET /audit-logs
 * Inspection endpoint for Admin to view Zero Trust audit trail.
 */
app.get('/audit-logs', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
    }
    const token = authHeader.split(' ')[1];
    const ver = verifyToken(token);
    if (!ver.valid || ver.payload.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Only admin can view audit logs' });
    }

    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50').all();
    return res.json({ total: logs.length, logs });
});

// Serve static frontend assets from public/
app.use(express.static(path.resolve(__dirname, '../public')));

// ----------------------------------------------------
// 2. Policy Enforcement Point (PEP) Middleware
// ----------------------------------------------------

app.use((req, res, next) => {
    // Health check endpoint
    if (req.path === '/health') {
        return res.json({ status: 'API Gateway PEP running on port ' + PORT });
    }

    // Policy Engine Evaluation
    const decision = evaluatePolicy(req);

    const subject = req.user ? (req.user.username || req.user.sub) : 'anonymous';
    const role = req.user ? req.user.role : 'none';
    const deviceId = req.headers['x-device-id'] || null;
    const ip = req.ip || req.socket.remoteAddress;

    logAudit({
        subject: subject,
        role: role,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        deviceId: deviceId,
        decision: decision.allowed ? 'ALLOW' : 'DENY',
        reason: decision.reason,
        ipAddress: ip
    });

    if (!decision.allowed) {
        return res.status(decision.status || 403).json({
            error: 'Access Denied by Policy Engine',
            reason: decision.reason
        });
    }

    // Policy passed -> continue to proxy forwarder
    next();
});

// ----------------------------------------------------
// 3. Reverse Proxy to Microservices with Zero Trust Headers
// ----------------------------------------------------

const setupProxyHeaders = (proxyReq, req) => {
    // 1. Mandatory Gateway Secret: Service refuses any request without this
    proxyReq.setHeader('x-gateway-secret', GATEWAY_SECRET);

    // 2. Forward Authorization header (Token) so service re-verifies token signature & expiry
    if (req.headers['authorization']) {
        proxyReq.setHeader('authorization', req.headers['authorization']);
    }

    // 3. Forward verified identity attributes from Policy Engine
    if (req.user) {
        proxyReq.setHeader('x-user-sub', String(req.user.sub));
        proxyReq.setHeader('x-user-role', req.user.role);
        if (req.user.identifier) proxyReq.setHeader('x-user-identifier', req.user.identifier);
        if (req.user.username) proxyReq.setHeader('x-user-username', req.user.username);
    }

    // Forward JSON body properly
    fixRequestBody(proxyReq, req);
};

// Route: /nilai and /kelas -> Service Nilai (port 3001)
const proxyNilai = createProxyMiddleware({
    target: `http://localhost:${PORT_NILAI}`,
    changeOrigin: true,
    on: {
        proxyReq: setupProxyHeaders
    }
});

// Route: /transkrip -> Service Transkrip (port 3002)
const proxyTranskrip = createProxyMiddleware({
    target: `http://localhost:${PORT_TRANSKRIP}`,
    changeOrigin: true,
    on: {
        proxyReq: setupProxyHeaders
    }
});

app.use((req, res, next) => {
    if (req.path.startsWith('/nilai') || req.path.startsWith('/kelas')) {
        return proxyNilai(req, res, next);
    }
    if (req.path.startsWith('/transkrip')) {
        return proxyTranskrip(req, res, next);
    }
    next();
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[API GATEWAY] PEP listening on port ${PORT}`);
        console.log(`[API GATEWAY] Enforcing NIST SP 800-207 Zero Trust Architecture`);
    });
}

module.exports = app;
