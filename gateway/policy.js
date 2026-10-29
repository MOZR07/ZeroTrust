const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-access-secret-zerotrust-2026';
const JWT_SERVICE_SECRET = process.env.JWT_SERVICE_SECRET || 'jwt-service-secret-zerotrust-2026';
const ACCESS_TOKEN_TTL = '10m';
const SERVICE_TOKEN_TTL = '5m';

// Helper: Check Access Hours (default 07:00 - 21:00)
function checkAccessHours(req) {
    const startHour = parseInt(process.env.ACCESS_HOURS_START || '7', 10);
    const endHour = parseInt(process.env.ACCESS_HOURS_END || '21', 10);

    // Support mock hour for demonstration/testing via header or env
    let currentHour;
    if (req && req.headers['x-mock-hour'] !== undefined) {
        currentHour = parseInt(req.headers['x-mock-hour'], 10);
    } else if (process.env.MOCK_HOUR !== undefined && process.env.MOCK_HOUR !== '') {
        currentHour = parseInt(process.env.MOCK_HOUR, 10);
    } else {
        currentHour = new Date().getHours();
    }

    const isAllowed = currentHour >= startHour && currentHour < endHour;
    return {
        isAllowed,
        currentHour,
        startHour,
        endHour
    };
}

// Token generation
function generateAccessToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            role: user.role,
            identifier: user.identifier,
            nama: user.nama
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

function generateRefreshToken(userId) {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 day

    db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at, revoked)
        VALUES (?, ?, ?, 0)
    `).run(userId, token, expiresAt);

    return token;
}

function generateServiceToken(clientId, serviceName) {
    return jwt.sign(
        {
            sub: clientId,
            role: 'service',
            service_name: serviceName
        },
        JWT_SERVICE_SECRET,
        { expiresIn: SERVICE_TOKEN_TTL }
    );
}

// Token verification (checks either user secret or service secret)
function verifyToken(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded) {
            return { valid: false, reason: 'Token format is malformed' };
        }

        const secret = decoded.role === 'service' ? JWT_SERVICE_SECRET : JWT_SECRET;
        const verified = jwt.verify(token, secret);
        return { valid: true, payload: verified };
    } catch (err) {
        return { valid: false, reason: err.message };
    }
}

// Verify Device ID for user
function isDeviceRegistered(userId, deviceId) {
    if (!deviceId) return false;
    const row = db.prepare(`
        SELECT id FROM devices WHERE user_id = ? AND device_id = ?
    `).get(userId, deviceId);
    return !!row;
}

/**
 * Policy Engine / Policy Administrator decision point
 * Evaluates request against NIST SP 800-207 Zero Trust policies & Table 3
 * 
 * Returns: { allowed: boolean, reason: string, user?: object, status?: number }
 */
function evaluatePolicy(req) {
    const method = req.method.toUpperCase();
    const path = req.path;

    // 1. Auth endpoints are handled separately in Gateway auth controller
    if (path.startsWith('/auth/')) {
        return { allowed: true, reason: 'Public/Auth endpoint' };
    }

    // 2. Extract Authorization Header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            allowed: false,
            status: 401,
            reason: 'Missing or malformed Authorization header'
        };
    }

    const token = authHeader.split(' ')[1];
    const tokenVerification = verifyToken(token);
    if (!tokenVerification.valid) {
        return {
            allowed: false,
            status: 401,
            reason: `Invalid or expired token: ${tokenVerification.reason}`
        };
    }

    const user = tokenVerification.payload;
    req.user = user; // Attach verified payload to request

    // 3. Device verification (Applies to all user tokens: mahasiswa, dosen, admin)
    const deviceId = req.headers['x-device-id'];
    if (user.role !== 'service') {
        if (!deviceId) {
            return {
                allowed: false,
                status: 403,
                reason: 'Missing X-Device-ID header (Device identification is mandatory under Zero Trust)'
            };
        }

        const registered = isDeviceRegistered(user.sub, deviceId);
        if (!registered) {
            return {
                allowed: false,
                status: 403,
                reason: `Device '${deviceId}' is not registered for user '${user.username}'`
            };
        }
    }

    // 4. Resource & Attribute-Based Access Control (ABAC) Policies (Table 3)

    // Policy: GET /nilai
    if (method === 'GET' && path === '/nilai') {
        if (user.role !== 'mahasiswa' && user.role !== 'dosen') {
            return {
                allowed: false,
                status: 403,
                reason: `Role '${user.role}' is not authorized to access GET /nilai (only mahasiswa and dosen allowed)`
            };
        }
        return { allowed: true, reason: 'Authorized by role (mahasiswa/dosen)' };
    }

    // Policy: PUT /nilai/:id
    const putNilaiMatch = path.match(/^\/nilai\/(\d+)$/);
    if (method === 'PUT' && putNilaiMatch) {
        const nilaiId = parseInt(putNilaiMatch[1], 10);

        // Role check
        if (user.role !== 'dosen') {
            return {
                allowed: false,
                status: 403,
                reason: `Role '${user.role}' is not authorized to edit nilai (only dosen allowed)`
            };
        }

        // Jam akses check (07:00 - 21:00)
        const hoursCheck = checkAccessHours(req);
        if (!hoursCheck.isAllowed) {
            return {
                allowed: false,
                status: 403,
                reason: `Access denied: Nilai updates are only permitted between ${hoursCheck.startHour}:00 and ${hoursCheck.endHour}:00 (current hour: ${hoursCheck.currentHour}:00)`
            };
        }

        // Ownership and Final status check in DB
        const nilaiRecord = db.prepare(`
            SELECT n.id, n.kelas_id, n.is_final AS nilai_final, k.is_final AS kelas_final, k.dosen_id
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            WHERE n.id = ?
        `).get(nilaiId);

        if (!nilaiRecord) {
            return {
                allowed: false,
                status: 404,
                reason: `Nilai with ID ${nilaiId} not found`
            };
        }

        if (nilaiRecord.dosen_id !== user.sub) {
            return {
                allowed: false,
                status: 403,
                reason: `Forbidden: Dosen '${user.username}' does not teach the class for nilai ID ${nilaiId}`
            };
        }

        if (nilaiRecord.nilai_final === 1 || nilaiRecord.kelas_final === 1) {
            return {
                allowed: false,
                status: 403,
                reason: `Forbidden: Nilai ID ${nilaiId} or its class has already been finalized and cannot be modified`
            };
        }

        return { allowed: true, reason: 'Authorized: Dosen owns class, within access hours, and not finalized' };
    }

    // Policy: POST /kelas/:id/finalisasi
    const finalisasiMatch = path.match(/^\/kelas\/(\d+)\/finalisasi$/);
    if (method === 'POST' && finalisasiMatch) {
        const kelasId = parseInt(finalisasiMatch[1], 10);

        // Role check
        if (user.role !== 'dosen') {
            return {
                allowed: false,
                status: 403,
                reason: `Role '${user.role}' is not authorized to finalize class (only dosen allowed)`
            };
        }

        // Jam akses check (07:00 - 21:00)
        const hoursCheck = checkAccessHours(req);
        if (!hoursCheck.isAllowed) {
            return {
                allowed: false,
                status: 403,
                reason: `Access denied: Class finalization is only permitted between ${hoursCheck.startHour}:00 and ${hoursCheck.endHour}:00 (current hour: ${hoursCheck.currentHour}:00)`
            };
        }

        // Ownership check in DB
        const kelasRecord = db.prepare(`
            SELECT id, dosen_id, is_final FROM kelas WHERE id = ?
        `).get(kelasId);

        if (!kelasRecord) {
            return {
                allowed: false,
                status: 404,
                reason: `Kelas with ID ${kelasId} not found`
            };
        }

        if (kelasRecord.dosen_id !== user.sub) {
            return {
                allowed: false,
                status: 403,
                reason: `Forbidden: Dosen '${user.username}' does not teach kelas ID ${kelasId}`
            };
        }

        if (kelasRecord.is_final === 1) {
            return {
                allowed: false,
                status: 400,
                reason: `Kelas ID ${kelasId} is already finalized`
            };
        }

        return { allowed: true, reason: 'Authorized: Dosen owns class and within access hours' };
    }

    // Policy: GET /transkrip/:nim
    const transkripMatch = path.match(/^\/transkrip\/([a-zA-Z0-9_-]+)$/);
    if (method === 'GET' && transkripMatch) {
        const requestedNim = transkripMatch[1];

        if (user.role === 'admin') {
            return { allowed: true, reason: 'Authorized: Admin has access to all transcripts' };
        }

        if (user.role === 'mahasiswa') {
            if (user.identifier !== requestedNim) {
                return {
                    allowed: false,
                    status: 403,
                    reason: `Forbidden: Mahasiswa '${user.username}' (NIM: ${user.identifier}) can only access their own transcript, not NIM '${requestedNim}'`
                };
            }
            return { allowed: true, reason: 'Authorized: Mahasiswa accessing own transcript' };
        }

        return {
            allowed: false,
            status: 403,
            reason: `Role '${user.role}' is not authorized to view transcripts`
        };
    }

    // Policy: POST /transkrip/sinkron
    if (method === 'POST' && path === '/transkrip/sinkron') {
        if (user.role !== 'service') {
            return {
                allowed: false,
                status: 403,
                reason: `Forbidden: Only service token (role: service) can call /transkrip/sinkron. User tokens (${user.role}) are strictly denied`
            };
        }
        return { allowed: true, reason: 'Authorized: Verified service token for inter-service sync' };
    }

    // Default deny for unmapped protected endpoints
    return {
        allowed: false,
        status: 404,
        reason: `Endpoint ${method} ${path} is not recognized or not permitted`
    };
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateServiceToken,
    verifyToken,
    isDeviceRegistered,
    checkAccessHours,
    evaluatePolicy,
    JWT_SECRET,
    JWT_SERVICE_SECRET
};
