const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

function seedDatabase() {
    console.log('[SEED] Running schema.sql...');
    const schemaSql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schemaSql);

    console.log('[SEED] Clearing existing records for clean state...');
    db.exec(`
        DELETE FROM audit_logs;
        DELETE FROM transkrip;
        DELETE FROM nilai;
        DELETE FROM kelas;
        DELETE FROM refresh_tokens;
        DELETE FROM devices;
        DELETE FROM users;
        DELETE FROM service_clients;
        DELETE FROM sqlite_sequence;
    `);

    console.log('[SEED] Inserting users and devices...');
    const defaultPassword = 'password123';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, role, nama, identifier)
        VALUES (@username, @password_hash, @role, @nama, @identifier)
    `);

    const insertDevice = db.prepare(`
        INSERT INTO devices (user_id, device_id, device_name)
        VALUES (@user_id, @device_id, @device_name)
    `);

    const usersData = [
        { username: 'admin1', password_hash: passwordHash, role: 'admin', nama: 'Administrator Sistem', identifier: 'ADM001', device_id: 'DEV-ADMIN-01', device_name: 'Laptop Admin HP ProBook' },
        { username: 'dosen_budi', password_hash: passwordHash, role: 'dosen', nama: 'Dr. Budi Santoso, M.T.', identifier: 'NIP19800101', device_id: 'DEV-DOSEN-BUDI', device_name: 'MacBook Pro Dosen Budi' },
        { username: 'dosen_siti', password_hash: passwordHash, role: 'dosen', nama: 'Siti Aminah, M.Kom.', identifier: 'NIP19850202', device_id: 'DEV-DOSEN-SITI', device_name: 'ThinkPad Dosen Siti' },
        { username: 'mhs_andi', password_hash: passwordHash, role: 'mahasiswa', nama: 'Andi Pratama', identifier: '227006001', device_id: 'DEV-MHS-ANDI', device_name: 'ASUS ROG Andi' },
        { username: 'mhs_rani', password_hash: passwordHash, role: 'mahasiswa', nama: 'Rani Maharani', identifier: '227006002', device_id: 'DEV-MHS-RANI', device_name: 'Dell Inspiron Rani' },
        { username: 'mhs_cahyo', password_hash: passwordHash, role: 'mahasiswa', nama: 'Cahyo Wibowo', identifier: '227006003', device_id: 'DEV-MHS-CAHYO', device_name: 'Acer Swift Cahyo' }
    ];

    const userMap = {};
    for (const u of usersData) {
        const info = insertUser.run({
            username: u.username,
            password_hash: u.password_hash,
            role: u.role,
            nama: u.nama,
            identifier: u.identifier
        });
        const userId = info.lastInsertRowid;
        userMap[u.username] = { id: userId, ...u };

        insertDevice.run({
            user_id: userId,
            device_id: u.device_id,
            device_name: u.device_name
        });
    }

    console.log('[SEED] Inserting service client...');
    const insertClient = db.prepare(`
        INSERT INTO service_clients (client_id, client_secret, service_name)
        VALUES (@client_id, @client_secret, @service_name)
    `);
    insertClient.run({
        client_id: 'service-nilai',
        client_secret: 'secret-nilai-12345',
        service_name: 'Service Nilai'
    });

    console.log('[SEED] Inserting classes (kelas)...');
    const insertKelas = db.prepare(`
        INSERT INTO kelas (kode_mk, nama_mk, dosen_id, sks, semester, is_final)
        VALUES (@kode_mk, @nama_mk, @dosen_id, @sks, @semester, 0)
    `);

    const kelas1 = insertKelas.run({
        kode_mk: 'IF301',
        nama_mk: 'Keamanan Informasi',
        dosen_id: userMap['dosen_budi'].id,
        sks: 3,
        semester: 'Ganjil 2026'
    });
    const kelas1Id = kelas1.lastInsertRowid;

    const kelas2 = insertKelas.run({
        kode_mk: 'IF302',
        nama_mk: 'Arsitektur Komputer',
        dosen_id: userMap['dosen_siti'].id,
        sks: 3,
        semester: 'Ganjil 2026'
    });
    const kelas2Id = kelas2.lastInsertRowid;

    console.log('[SEED] Inserting nilai mahasiswa...');
    const insertNilai = db.prepare(`
        INSERT INTO nilai (kelas_id, mahasiswa_id, nim, nilai_angka, nilai_huruf, is_final)
        VALUES (@kelas_id, @mahasiswa_id, @nim, @nilai_angka, @nilai_huruf, 0)
    `);

    // Nilai Kelas 1 (Dosen Budi - Keamanan Informasi)
    insertNilai.run({ kelas_id: kelas1Id, mahasiswa_id: userMap['mhs_andi'].id, nim: '227006001', nilai_angka: 85.0, nilai_huruf: 'A' });
    insertNilai.run({ kelas_id: kelas1Id, mahasiswa_id: userMap['mhs_rani'].id, nim: '227006002', nilai_angka: 78.0, nilai_huruf: 'B+' });
    insertNilai.run({ kelas_id: kelas1Id, mahasiswa_id: userMap['mhs_cahyo'].id, nim: '227006003', nilai_angka: 90.0, nilai_huruf: 'A' });

    // Nilai Kelas 2 (Dosen Siti - Arsitektur Komputer)
    insertNilai.run({ kelas_id: kelas2Id, mahasiswa_id: userMap['mhs_andi'].id, nim: '227006001', nilai_angka: 82.0, nilai_huruf: 'A-' });
    insertNilai.run({ kelas_id: kelas2Id, mahasiswa_id: userMap['mhs_rani'].id, nim: '227006002', nilai_angka: 88.0, nilai_huruf: 'A' });
    insertNilai.run({ kelas_id: kelas2Id, mahasiswa_id: userMap['mhs_cahyo'].id, nim: '227006003', nilai_angka: 74.0, nilai_huruf: 'B' });

    console.log('[SEED] Database seeding complete!');
    console.log('--- Summary Seed Data ---');
    console.log('1 Admin: admin1 (Device: DEV-ADMIN-01)');
    console.log('2 Dosen: dosen_budi (DEV-DOSEN-BUDI), dosen_siti (DEV-DOSEN-SITI)');
    console.log('3 Mahasiswa: mhs_andi (DEV-MHS-ANDI), mhs_rani (DEV-MHS-RANI), mhs_cahyo (DEV-MHS-CAHYO)');
    console.log('Password default semua akun: password123');
    console.log('2 Kelas: IF301 (Dosen Budi, ID: ' + kelas1Id + '), IF302 (Dosen Siti, ID: ' + kelas2Id + ')');
    console.log('Service Client: ID: service-nilai, Secret: secret-nilai-12345');
}

if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
