-- Database Schema: Sistem Nilai Zero Trust

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'dosen', 'mahasiswa')),
    nama TEXT NOT NULL,
    identifier TEXT NOT NULL -- NIP untuk dosen, NIM untuk mahasiswa, ADM untuk admin
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id TEXT UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_clients (
    client_id TEXT PRIMARY KEY,
    client_secret TEXT NOT NULL,
    service_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kelas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_mk TEXT NOT NULL,
    nama_mk TEXT NOT NULL,
    dosen_id INTEGER NOT NULL REFERENCES users(id),
    sks INTEGER NOT NULL DEFAULT 3,
    semester TEXT NOT NULL,
    is_final INTEGER DEFAULT 0 -- 0: belum final, 1: sudah final
);

CREATE TABLE IF NOT EXISTS nilai (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
    mahasiswa_id INTEGER NOT NULL REFERENCES users(id),
    nim TEXT NOT NULL,
    nilai_angka REAL,
    nilai_huruf TEXT,
    is_final INTEGER DEFAULT 0 -- 0: belum final, 1: sudah final
);

CREATE TABLE IF NOT EXISTS transkrip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mahasiswa_id INTEGER NOT NULL REFERENCES users(id),
    nim TEXT NOT NULL,
    kelas_id INTEGER NOT NULL REFERENCES kelas(id),
    kode_mk TEXT NOT NULL,
    nama_mk TEXT NOT NULL,
    sks INTEGER NOT NULL,
    nilai_angka REAL,
    nilai_huruf TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mahasiswa_id, kelas_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    subject TEXT NOT NULL,
    role TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    device_id TEXT,
    decision TEXT NOT NULL CHECK(decision IN ('ALLOW', 'DENY')),
    reason TEXT NOT NULL,
    ip_address TEXT
);
