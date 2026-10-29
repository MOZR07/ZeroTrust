const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'super-secure-internal-gateway-secret-2026';
const JWT_SECRET = process.env.JWT_SECRET || 'jwt-access-secret-zerotrust-2026';
const JWT_SERVICE_SECRET = process.env.JWT_SERVICE_SECRET || 'jwt-service-secret-zerotrust-2026';

/**
 * Zero Trust Resource Verification Middleware
 * Sesuai Kebutuhan 4.1:
 * - Gateway secret: menolak request tanpa X-Gateway-Secret valid
 * - Verifikasi ulang di service: memverifikasi tanda tangan dan masa berlaku token
 */
function verifyZeroTrustResource(req, res, next) {
    // 1. Gateway Secret Check (Prevents direct access bypassing the Gateway PEP)
    const gatewaySecret = req.headers['x-gateway-secret'];
    if (!gatewaySecret || gatewaySecret !== GATEWAY_SECRET) {
        console.warn(`[ZERO TRUST VIOLATION] Direct access attempted on ${req.method} ${req.url} without valid X-Gateway-Secret`);
        return res.status(403).json({
            error: 'Direct access forbidden',
            reason: 'Missing or invalid X-Gateway-Secret header. All traffic must pass through the API Gateway.'
        });
    }

    // 2. Token Re-verification (Assume Breach / Never Trust, Always Verify)
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication failed',
            reason: 'Resource service requires Authorization Bearer token'
        });
    }

    const token = authHeader.split(' ')[1];
    let payload = null;

    try {
        const decoded = jwt.decode(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Authentication failed', reason: 'Malformed token' });
        }

        const secret = decoded.role === 'service' ? JWT_SERVICE_SECRET : JWT_SECRET;
        payload = jwt.verify(token, secret);
    } catch (err) {
        return res.status(401).json({
            error: 'Token verification failed at resource service',
            reason: err.message
        });
    }

    // Attach validated token payload
    req.serviceAuth = payload;
    next();
}

module.exports = { verifyZeroTrustResource };
