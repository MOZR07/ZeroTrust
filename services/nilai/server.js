const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const db = require('../../database/db');
const { verifyZeroTrustResource } = require('../verifyResource');
const { syncTranskripViaGateway } = require('./client');

const app = express();
const PORT = process.env.PORT_NILAI || 3001;

app.use(express.json());

// Apply Zero Trust Verification to all incoming routes
app.use(verifyZeroTrustResource);

// Helper function to calculate letter grade
function calculateGrade(num) {
    if (num >= 85) return 'A';
    if (num >= 80) return 'A-';
    if (num >= 75) return 'B+';
    if (num >= 70) return 'B';
    if (num >= 65) return 'B-';
    if (num >= 60) return 'C+';
    if (num >= 55) return 'C';
    if (num >= 40) return 'D';
    return 'E';
}

/**
 * GET /nilai
 * Mahasiswa: hanya nilai miliknya.
 * Dosen: hanya nilai dari kelas yang diampunya.
 */
app.get('/nilai', (req, res) => {
    const user = req.serviceAuth;

    if (user.role === 'mahasiswa') {
        const rows = db.prepare(`
            SELECT 
                n.id, 
                n.kelas_id, 
                k.kode_mk, 
                k.nama_mk, 
                k.sks, 
                k.semester,
                n.nim, 
                n.nilai_angka, 
                n.nilai_huruf, 
                n.is_final
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            WHERE n.mahasiswa_id = ?
        `).all(user.sub);

        return res.json({
            role: 'mahasiswa',
            mahasiswa: user.nama,
            nim: user.identifier,
            total_items: rows.length,
            data: rows
        });
    }

    if (user.role === 'dosen') {
        const rows = db.prepare(`
            SELECT 
                n.id, 
                n.kelas_id, 
                k.kode_mk, 
                k.nama_mk, 
                k.sks, 
                k.semester,
                n.nim, 
                u.nama AS nama_mahasiswa,
                n.nilai_angka, 
                n.nilai_huruf, 
                n.is_final
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            JOIN users u ON n.mahasiswa_id = u.id
            WHERE k.dosen_id = ?
            ORDER BY k.id, n.nim
        `).all(user.sub);

        return res.json({
            role: 'dosen',
            dosen: user.nama,
            total_items: rows.length,
            data: rows
        });
    }

    return res.status(403).json({ error: 'Role not authorized for this resource' });
});

/**
 * PUT /nilai/:id
 * Dosen mengubah nilai mahasiswa untuk kelas yang diampunya.
 */
app.put('/nilai/:id', (req, res) => {
    const nilaiId = parseInt(req.params.id, 10);
    const { nilai_angka } = req.body || {};

    if (nilai_angka === undefined || isNaN(nilai_angka)) {
        return res.status(400).json({ error: 'Field nilai_angka (numeric) is required' });
    }

    const numVal = parseFloat(nilai_angka);
    if (numVal < 0 || numVal > 100) {
        return res.status(400).json({ error: 'nilai_angka must be between 0 and 100' });
    }

    const huruf = calculateGrade(numVal);

    // Update in database
    db.prepare(`
        UPDATE nilai
        SET nilai_angka = ?, nilai_huruf = ?
        WHERE id = ?
    `).run(numVal, huruf, nilaiId);

    const updated = db.prepare(`
        SELECT n.id, n.kelas_id, k.nama_mk, n.nim, u.nama as nama_mahasiswa, n.nilai_angka, n.nilai_huruf, n.is_final
        FROM nilai n
        JOIN kelas k ON n.kelas_id = k.id
        JOIN users u ON n.mahasiswa_id = u.id
        WHERE n.id = ?
    `).get(nilaiId);

    return res.json({
        message: 'Nilai updated successfully',
        data: updated
    });
});

/**
 * POST /kelas/:id/finalisasi
 * Dosen memfinalisasi nilai pada kelas yang diampunya.
 * Setelah finalisasi, Service Nilai memanggil Service Transkrip via Gateway (PEP).
 */
app.post('/kelas/:id/finalisasi', async (req, res) => {
    const kelasId = parseInt(req.params.id, 10);

    try {
        // 1. Update status kelas and nilai to final
        db.prepare('UPDATE kelas SET is_final = 1 WHERE id = ?').run(kelasId);
        db.prepare('UPDATE nilai SET is_final = 1 WHERE kelas_id = ?').run(kelasId);

        // 2. Fetch all student grades for this class to be synced
        const items = db.prepare(`
            SELECT 
                n.mahasiswa_id,
                n.nim,
                k.id AS kelas_id,
                k.kode_mk,
                k.nama_mk,
                k.sks,
                n.nilai_angka,
                n.nilai_huruf
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            WHERE n.kelas_id = ?
        `).all(kelasId);

        console.log(`[SERVICE NILAI] Kelas ID ${kelasId} finalized. Initiating sync for ${items.length} students...`);

        // 3. Inter-service call: Service Nilai calls Service Transkrip through API Gateway
        const syncResult = await syncTranskripViaGateway(kelasId, items);

        return res.json({
            message: `Kelas ID ${kelasId} successfully finalized and synced to Transkrip`,
            kelas_id: kelasId,
            items_synced: items.length,
            gateway_sync_result: syncResult
        });
    } catch (err) {
        console.error('[SERVICE NILAI FINALISASI ERROR]', err.message);
        return res.status(500).json({
            error: 'Finalization process encountered an error',
            details: err.message
        });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[SERVICE NILAI] Resource server listening on port ${PORT}`);
    });
}

module.exports = app;
