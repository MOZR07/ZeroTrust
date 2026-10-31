# Sistem Nilai Berbasis Arsitektur Zero Trust Security (NIST SP 800-207)

> **Tugas Praktikum Individu - Keamanan Informasi (KP70065004)**  
> **Program Studi Informatika · Universitas Siliwangi**

---

## 1. Ringkasan Arsitektur

Sistem ini menerapkan prinsip **Zero Trust Architecture (NIST SP 800-207)**:
- *Never Trust, Always Verify* (Jangan pernah percaya, selalu verifikasi setiap request).
- *Least Privilege* (Hak akses seminimal mungkin sesuai role dan kepemilikan data).
- *Assume Breach* (Asumsikan jaringan perimeter telah ditembus, sehingga service internal tetap memverifikasi token dan gateway secret).

```
                      +---------------------------------------+
                      |             CLIENT / USER             |
                      | (Mahasiswa, Dosen, Admin, Postman)    |
                      +-------------------+-------------------+
                                          |
                        Bearer Token + X-Device-ID
                                          v
                      +---------------------------------------+
                      |         API GATEWAY (Port 3000)       |
                      |       Policy Enforcement Point (PEP)  |
                      |---------------------------------------|
                      |  - Modul Policy Engine (PE / PA)      |
                      |  - Login, Refresh, Logout, Service Auth|
                      |  - Konteks: Device ID & Jam Akses     |
                      |  - Audit Logger (DB & audit.log)      |
                      +-------------------+-------------------+
                                          |
                X-Gateway-Secret + Bearer Token (Inter-Service)
                        +-----------------+-----------------+
                        |                                   |
                        v                                   v
        +-------------------------------+   +-------------------------------+
        |   SERVICE NILAI (Port 3001)   |   | SERVICE TRANSKRIP (Port 3002) |
        |           Resource            |   |           Resource            |
        |-------------------------------|   |-------------------------------|
        | - Verifikasi Gateway Secret   |   | - Verifikasi Gateway Secret   |
        | - Verifikasi ulang JWT        |   | - Verifikasi ulang JWT        |
        | - Kelola data nilai & kelas   |   | - Sinkron transkrip mahasiswa |
        | - Panggil Sinkron Transkrip   |   | - Hitung IPK & SKS kumulatif  |
        |   via Gateway (Port 3000)     |   +---------------+---------------+
        +---------------+---------------+                   |
                        |                                   |
                        +-----------------+-----------------+
                                          |
                                          v
                      +---------------------------------------+
                      |       SHARED DATABASE (SQLite)        |
                      |         database/zerotrust.db         |
                      +---------------------------------------+
```

---

## 2. Komponen Sistem & Port

| Komponen | Port | Peran (NIST SP 800-207) | Tanggung Jawab |
|---|---|---|---|
| **API Gateway** | `3000` | PEP (Policy Enforcement Point) | Satu-satunya pintu masuk. Memeriksa setiap request, meminta keputusan ke Policy Engine, mencatat audit log, dan mem-proxy request ke service. |
| **Policy Engine / Administrator** | Modul internal Gateway | PE / PA | Menangani login, menerbitkan/mencabut JWT dan Refresh Token, serta memutuskan allow/deny berdasarkan kebijakan data dan konteks. |
| **Service Nilai** | `3001` | Resource | Mengelola data nilai dan kelas. Memverifikasi gateway secret dan JWT. Saat finalisasi, memanggil Service Transkrip melalui gateway dengan service token. |
| **Service Transkrip** | `3002` | Resource | Mengelola data transkrip mahasiswa. Menolak token user pada endpoint sinkronisasi, hanya menerima role `service`. |
| **Database** | File SQLite | Shared Resource | Menyimpan user, devices, tokens, kelas, nilai, transkrip, dan audit logs. |

---

## 3. Data Awal (Seed Data)

Semua akun menggunakan password default: **`password123`**

| No | Username | Role | Nama Lengkap | NIM / NIP | Device ID Terdaftar | Device Name |
|---|---|---|---|---|---|---|
| 1 | `admin1` | `admin` | Administrator Sistem | `ADM001` | `DEV-ADMIN-01` | Laptop Admin HP ProBook |
| 2 | `dosen_budi` | `dosen` | Dr. Budi Santoso, M.T. | `NIP19800101` | `DEV-DOSEN-BUDI` | MacBook Pro Dosen Budi |
| 3 | `dosen_siti` | `dosen` | Siti Aminah, M.Kom. | `NIP19850202` | `DEV-DOSEN-SITI` | ThinkPad Dosen Siti |
| 4 | `mhs_andi` | `mahasiswa` | Andi Pratama | `227006001` | `DEV-MHS-ANDI` | ASUS ROG Andi |
| 5 | `mhs_rani` | `mahasiswa` | Rani Maharani | `227006002` | `DEV-MHS-RANI` | Dell Inspiron Rani |
| 6 | `mhs_cahyo` | `mahasiswa` | Cahyo Wibowo | `227006003` | `DEV-MHS-CAHYO` | Acer Swift Cahyo |

### Data Kelas & Dosen Pengampu:
- **Kelas ID 1**: `IF301` - Keamanan Informasi (3 SKS) diampu oleh **Dr. Budi Santoso, M.T.** (`dosen_budi`)
- **Kelas ID 2**: `IF302` - Arsitektur Komputer (3 SKS) diampu oleh **Siti Aminah, M.Kom.** (`dosen_siti`)

### Kredensial Service Client:
- **Client ID**: `service-nilai`
- **Client Secret**: `secret-nilai-12345`

---

## 4. Cara Menjalankan

### Persyaratan:
- Node.js versi 18+ (disarankan Node.js 20 atau 22+)
- NPM

### Langkah-langkah:

1. **Clone repository dan install dependensi:**
   ```bash
   git clone <repo-url>
   cd praktikum-zerotrust
   npm install
   ```

2. **Inisialisasi Database (Seed Data):**
   ```bash
   npm run seed
   ```

3. **Menjalankan Seluruh Service Sekaligus:**
   ```bash
   npm start
   ```
   Output terminal akan menampilkan ketiga service siap menerima request:
   - API Gateway: `http://localhost:3000`
   - Service Nilai: `http://localhost:3001`
   - Service Transkrip: `http://localhost:3002`

4. **Menjalankan Pengujian Otomatis (Automated Test Suite):**
   ```bash
   npm test
   ```
   *Suite menjalankan 23 skenario uji mencakup seluruh kebutuhan Zero Trust.*

---

## 5. Pemenuhan Kebutuhan Sistem (Bagian 4 PDF)

### 4.1 Autentikasi dan Token
- **Access Token:** JWT berumur 10 menit berisi payload `sub` (user ID), `username`, `role`, `identifier`, dan `nama`. Dikirim via header `Authorization: Bearer <token>`.
- **Refresh Token:** Disimpan di tabel SQLite `refresh_tokens`, berlaku 1 hari, dan dapat dicabut secara instan saat `POST /auth/logout`.
- **Token Service:** Service Nilai mengotentikasi diri ke Gateway via `POST /auth/service` menggunakan client ID dan secret. Diterbitkan token JWT berumur 5 menit dengan klaim `role: "service"`.
- **Gateway Secret:** Gateway menyisipkan header `X-Gateway-Secret` saat meneruskan request ke resource services. Service menolak akses langsung yang mencoba mem-bypass gateway (HTTP 403 Forbidden).
- **Verifikasi Ulang di Service (Resource Servers):** Middleware `verifyZeroTrustResource` di Service Nilai & Transkrip memverifikasi kembali tanda tangan dan masa berlaku JWT, meskipun request telah membawa gateway secret (HTTP 401 Unauthorized jika token tidak valid).

### 4.2 Kebijakan Akses (ABAC & RBAC)

| Endpoint | Ditangani | Diizinkan | Kondisi Terpenuhi |
|---|---|---|---|
| `POST /auth/login` | Gateway | Semua user | Kredensial username/password valid dan device ID terdaftar pada user tersebut. |
| `POST /auth/refresh` | Gateway | Semua user | Refresh token valid, belum kedaluwarsa, dan belum dicabut (`revoked = 0`). |
| `POST /auth/logout` | Gateway | Semua user | Menandai refresh token menjadi `revoked = 1` di database. |
| `POST /auth/service` | Gateway | Service Nilai | Client ID dan client secret valid. Menghasilkan token dengan `role: "service"`. |
| `GET /nilai` | Nilai (3001) | Mahasiswa, Dosen | Mahasiswa hanya melihat nilainya sendiri (difilter by `sub`). Dosen hanya melihat nilai kelas yang diampunya (difilter by `dosen_id`). |
| `PUT /nilai/:id` | Nilai (3001) | Dosen | Hanya dosen pengampu kelas, kelas/nilai belum difinalisasi, dan dilakukan dalam jam akses (07.00–21.00). |
| `POST /kelas/:id/finalisasi` | Nilai (3001) | Dosen | Kelas diampu oleh dosen yang login, dalam jam akses. Mengubah status final, lalu memanggil `POST /transkrip/sinkron` via gateway dengan service token. |
| `GET /transkrip/:nim` | Transkrip (3002) | Mahasiswa, Admin | Mahasiswa hanya bisa melihat NIM miliknya sendiri. Admin dapat melihat semua NIM mahasiswa. Dosen ditolak. |
| `POST /transkrip/sinkron` | Transkrip (3002) | Service Nilai | Hanya menerima token dengan klaim `role: "service"`. Token user manapun ditolak. |

### 4.3 Verifikasi Konteks
- **Device Terdaftar:** Setiap request user wajib menyertakan header `X-Device-ID`. Jika header hilang atau device tidak terdaftar untuk user tersebut, Policy Engine menolak dengan HTTP 403 Forbidden.
- **Jam Akses:** Operasi ubah nilai (`PUT /nilai/:id`) dan finalisasi (`POST /kelas/:id/finalisasi`) dibatasi pukul `07.00 - 21.00`. Rentang jam dikonfigurasi melalui `.env` (`ACCESS_HOURS_START`, `ACCESS_HOURS_END`) dan mendukung simulasi header `X-Mock-Hour` untuk pengujian.

### 4.4 Audit Log
- Gateway mencatat seluruh keputusan akses (ALLOW maupun DENY) ke:
  1. Tabel SQLite `audit_logs`.
  2. File teks `audit.log`.
  3. Standar output konsol dengan pewarnaan visual.
- Atribut yang dicatat: `timestamp`, `subject`, `role`, `endpoint`, `method`, `device_id`, `decision` (ALLOW/DENY), `reason`, dan `ip_address`.
- Endpoint `GET /audit-logs` dapat diakses oleh Admin untuk melihat log audit secara real-time.

---

## 6. Contoh Request cURL untuk Pengujian Manual

### 1. Login Mahasiswa (Mendapatkan Token)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: DEV-MHS-ANDI" \
  -d '{"username": "mhs_andi", "password": "password123"}'
```

### 2. Login Ditolak (Device Tidak Terdaftar)
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: DEV-HACKER-DEVICE" \
  -d '{"username": "mhs_andi", "password": "password123"}'
```

### 3. Mahasiswa Melihat Nilai Miliknya
```bash
curl -X GET http://localhost:3000/nilai \
  -H "Authorization: Bearer <ANDI_TOKEN>" \
  -H "X-Device-ID: DEV-MHS-ANDI"
```

### 4. Dosen Mengubah Nilai Mahasiswa (Dalam Jam Akses)
```bash
curl -X PUT http://localhost:3000/nilai/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <BUDI_TOKEN>" \
  -H "X-Device-ID: DEV-DOSEN-BUDI" \
  -d '{"nilai_angka": 92}'
```

### 5. Dosen Mengubah Nilai di Luar Jam Akses (Simulasi Jam 23.00)
```bash
curl -X PUT http://localhost:3000/nilai/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <BUDI_TOKEN>" \
  -H "X-Device-ID: DEV-DOSEN-BUDI" \
  -H "X-Mock-Hour: 23" \
  -d '{"nilai_angka": 95}'
```

### 6. Dosen Memfinalisasi Kelas (Memicu Panggilan Antar-Service)
```bash
curl -X POST http://localhost:3000/kelas/1/finalisasi \
  -H "Authorization: Bearer <BUDI_TOKEN>" \
  -H "X-Device-ID: DEV-DOSEN-BUDI"
```

### 7. Mahasiswa Melihat Transkrip Sendiri vs Transkrip Orang Lain
```bash
# Sukses (NIM Sendiri)
curl -X GET http://localhost:3000/transkrip/227006001 \
  -H "Authorization: Bearer <ANDI_TOKEN>" \
  -H "X-Device-ID: DEV-MHS-ANDI"

# Ditolak 403 (NIM Mahasiswa Lain)
curl -X GET http://localhost:3000/transkrip/227006002 \
  -H "Authorization: Bearer <ANDI_TOKEN>" \
  -H "X-Device-ID: DEV-MHS-ANDI"
```

### 8. Bukti Direct Access ke Service Ditolak
```bash
# Akses langsung ke Service Nilai tanpa Gateway PEP
curl -X GET http://localhost:3001/nilai
# Respons: 403 Direct access forbidden (Missing X-Gateway-Secret)
```

### 9. Admin Memeriksa Audit Log
```bash
curl -X GET http://localhost:3000/audit-logs \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "X-Device-ID: DEV-ADMIN-01"
```
