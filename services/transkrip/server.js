const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('../../database/db');
const { verifyZeroTrustResource } = require('../verifyResource');

const app = express();
const PORT = process.env.PORT_TRANSKRIP || 3002;

app.use(express.json());

// Enable CORS for browser-based testing of direct resource access
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Apply Zero Trust Verification to all incoming routes
app.use(verifyZeroTrustResource);

// Helper function to calculate Grade Points
function gradeToPoint(huruf) {
    switch (huruf) {
        case 'A': return 4.0;
        case 'A-': return 3.7;
        case 'B+': return 3.3;
        case 'B': return 3.0;
        case 'B-': return 2.7;
        case 'C+': return 2.3;
        case 'C': return 2.0;
        case 'D': return 1.0;
        case 'E': return 0.0;
        default: return 0.0;
    }
}

/**
 * GET /transkrip/:nim
 * Mahasiswa: hanya NIM miliknya.
 * Admin: dapat melihat semua NIM mahasiswa.
 */
app.get('/transkrip/:nim', (req, res) => {
    const nim = req.params.nim;

    // Find student info
    const student = db.prepare("SELECT id, nama, identifier FROM users WHERE identifier = ? AND role = 'mahasiswa'").get(nim);
    if (!student) {
        return res.status(404).json({ error: `Mahasiswa with NIM ${nim} not found` });
    }

    const items = db.prepare(`
        SELECT 
            id,
            kelas_id,
            kode_mk,
            nama_mk,
            sks,
            nilai_angka,
            nilai_huruf,
            synced_at
        FROM transkrip
        WHERE nim = ?
        ORDER BY kode_mk
    `).all(nim);

    let totalSks = 0;
    let totalBobot = 0;

    for (const item of items) {
        const point = gradeToPoint(item.nilai_huruf);
        totalSks += item.sks;
        totalBobot += (point * item.sks);
    }

    const ipk = totalSks > 0 ? (totalBobot / totalSks).toFixed(2) : '0.00';

    return res.json({
        nim: student.identifier,
        nama: student.nama,
        total_sks: totalSks,
        ipk: parseFloat(ipk),
        transkrip: items
    });
});

/**
 * POST /transkrip/sinkron
 * Dipanggil oleh Service Nilai menggunakan token service.
 * Tabel 3: "Hanya token service. Token user mana pun ditolak."
 */
app.post('/transkrip/sinkron', (req, res) => {
    const auth = req.serviceAuth;

    // Strict Zero Trust verification: role must be service
    if (auth.role !== 'service') {
        return res.status(403).json({
            error: 'Forbidden',
            reason: `Direct access denied. Endpoint only accepts role 'service', received '${auth.role}'`
        });
    }

    const { kelas_id, items } = req.body || {};

    if (!kelas_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Payload must contain kelas_id and non-empty items array' });
    }

    const upsertStmt = db.prepare(`
        INSERT INTO transkrip (mahasiswa_id, nim, kelas_id, kode_mk, nama_mk, sks, nilai_angka, nilai_huruf)
        VALUES (@mahasiswa_id, @nim, @kelas_id, @kode_mk, @nama_mk, @sks, @nilai_angka, @nilai_huruf)
        ON CONFLICT(mahasiswa_id, kelas_id) DO UPDATE SET
            nilai_angka = excluded.nilai_angka,
            nilai_huruf = excluded.nilai_huruf,
            synced_at = CURRENT_TIMESTAMP
    `);

    const syncTransaction = db.transaction((rows) => {
        for (const row of rows) {
            upsertStmt.run({
                mahasiswa_id: row.mahasiswa_id,
                nim: row.nim,
                kelas_id: row.kelas_id,
                kode_mk: row.kode_mk,
                nama_mk: row.nama_mk,
                sks: row.sks,
                nilai_angka: row.nilai_angka,
                nilai_huruf: row.nilai_huruf
            });
        }
    });

    try {
        syncTransaction(items);
        console.log(`[SERVICE TRANSKRIP] Synced ${items.length} records for kelas ID ${kelas_id} by service '${auth.sub}'`);
        return res.json({
            message: 'Transkrip successfully synchronized',
            kelas_id: kelas_id,
            synced_records: items.length
        });
    } catch (err) {
        console.error('[SERVICE TRANSKRIP SYNC ERROR]', err.message);
        return res.status(500).json({ error: 'Sync failed', details: err.message });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[SERVICE TRANSKRIP] Resource server listening on port ${PORT}`);
    });
}

module.exports = app;
