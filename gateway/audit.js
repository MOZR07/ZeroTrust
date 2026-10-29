const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const logFilePath = path.resolve(__dirname, '../audit.log');

const insertLogStmt = db.prepare(`
    INSERT INTO audit_logs (subject, role, endpoint, method, device_id, decision, reason, ip_address)
    VALUES (@subject, @role, @endpoint, @method, @device_id, @decision, @reason, @ip_address)
`);

function logAudit({ subject, role, endpoint, method, deviceId, decision, reason, ipAddress }) {
    const timestamp = new Date().toISOString();
    const safeSubject = subject || 'anonymous';
    const safeRole = role || 'none';
    const safeDevice = deviceId || '-';
    const safeIp = ipAddress || '-';

    // 1. Insert into SQLite database
    try {
        insertLogStmt.run({
            subject: safeSubject,
            role: safeRole,
            endpoint: endpoint,
            method: method,
            device_id: safeDevice,
            decision: decision,
            reason: reason,
            ip_address: safeIp
        });
    } catch (err) {
        console.error('[AUDIT DB ERROR]', err.message);
    }

    // 2. Append to audit.log text file
    const logLine = `[${timestamp}] [${decision}] [${method} ${endpoint}] Subject: ${safeSubject} (Role: ${safeRole}) Device: ${safeDevice} IP: ${safeIp} - Reason: ${reason}\n`;
    try {
        fs.appendFileSync(logFilePath, logLine, 'utf8');
    } catch (err) {
        console.error('[AUDIT FILE ERROR]', err.message);
    }

    // 3. Console output for live tracking
    const color = decision === 'ALLOW' ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    console.log(`${color}[AUDIT] [${decision}]${reset} ${method} ${endpoint} | Subject: ${safeSubject} (${safeRole}) | Device: ${safeDevice} | Reason: ${reason}`);
}

module.exports = { logAudit };
