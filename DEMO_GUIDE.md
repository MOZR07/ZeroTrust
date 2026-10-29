# PANDUAN REKAMAN VIDEO DEMO ZERO TRUST SECURITY (6–9 MENIT)

> Panduan terstruktur untuk memenuhi **Luaran 2: Video demo 6–9 menit** pada Tugas Praktikum Keamanan Informasi.  
> Setiap poin mengacu pada Bagian 4 dokumen tugas dan menunjukkan bagian kode serta demonstrasi eksekusinya.

---

## ⏱️ Rundown / Timeline Video (Total Durasi: ± 7-8 Menit)

| Waktu | Bagian | Fokus Pembahasan & Demonstrasi |
|---|---|---|
| **00:00 - 01:00** | **1. Pendahuluan & Arsitektur** | Penjelasan prinsip Zero Trust NIST SP 800-207, komponen PEP (Gateway 3000), PE/PA (policy.js), dan Resources (Nilai 3001, Transkrip 3002). |
| **01:00 - 02:45** | **2. Kebutuhan 4.1: Autentikasi & Token** | Tunjukkan kode JWT (10m), Refresh Token (DB & revoke), Service Token (5m), Gateway Secret, dan Verifikasi Ulang di Service. Demo direct access ditolak. |
| **02:45 - 04:30** | **3. Kebutuhan 4.2: Kebijakan Akses (ABAC/RBAC)** | Tunjukkan kode `policy.js`. Demo GET /nilai (Mahasiswa vs Dosen), PUT /nilai/:id (hanya dosen pengampu), GET /transkrip (NIM sendiri vs Admin). |
| **04:30 - 05:45** | **4. Kebutuhan 4.3: Verifikasi Konteks** | Tunjukkan kode pengecekan Device ID dan Jam Akses. Demo login/request dengan device asing (ditolak) dan request di luar jam 07.00-21.00 (ditolak). |
| **05:45 - 07:15** | **5. Finalisasi & Inter-Service Call** | Tunjukkan kode `client.js` dan endpoint `/transkrip/sinkron`. Demo Dosen Budi finalisasi kelas, service nilai ambil token service, panggil transkrip via gateway. |
| **07:15 - 08:15** | **6. Kebutuhan 4.4: Audit Log & Test Otomatis** | Tunjukkan tabel `audit_logs` dan file `audit.log`. Jalankan `npm test` untuk membuktikan 23/23 skenario lolos secara otomatis. |
| **08:15 - 08:45** | **7. Kesimpulan & Penutup** | Ringkasan pemenuhan prinsip *Never Trust, Always Verify*, *Least Privilege*, dan *Assume Breach*. |

---

## 🎬 Naskah Detail & Panduan Tiap Bagian

### Menit 00:00 - 01:00: Pendahuluan & Arsitektur Sistem
- **Tampilan Layar:** Tampilkan diagram arsitektur dari `README.md` atau slide ringkas.
- **Narasi:**
  > *"Halo semuanya, pada video ini saya akan mendemonstrasikan implementasi Sistem Nilai berbasis Arsitektur Zero Trust Security sesuai panduan NIST SP 800-207. Arsitektur ini terdiri dari tiga komponen utama: pertama, API Gateway pada port 3000 yang berperan sebagai Policy Enforcement Point (PEP) sekaligus memuat Policy Engine. Kedua, Service Nilai pada port 3001 sebagai Resource Service. Ketiga, Service Transkrip pada port 3002 juga sebagai Resource Service. Keduanya terhubung ke satu shared database SQLite. Prinsip utama yang diterapkan adalah Never Trust, Always Verify, Least Privilege, dan Assume Breach."*

---

### Menit 01:00 - 02:45: Bagian 4.1 - Autentikasi dan Token
- **Tampilan Kode:** Buka `gateway/policy.js` (fungsi `generateAccessToken`, `generateRefreshToken`, `generateServiceToken`) dan `services/verifyResource.js`.
- **Narasi:**
  > *"Pada bagian 4.1, autentikasi user menghasilkan Access Token JWT dengan masa berlaku 10 menit, dan Refresh Token yang disimpan pada tabel database agar dapat dicabut saat logout. Untuk komunikasi antar-service, Service Nilai dapat meminta Service Token melalui endpoint /auth/service dengan masa berlaku 5 menit dan role khusus 'service'."*
  > *"Untuk mencegah bypass gateway, kami menerapkan prinsip Assume Breach: gateway menyisipkan header X-Gateway-Secret saat meneruskan request. Service resource menolak request tanpa secret ini. Selain itu, service resource juga melakukan verifikasi ulang tanda tangan dan masa berlaku JWT secara independen."*
- **Aksi Demo (Terminal / Postman):**
  1. Coba akses langsung Service Nilai tanpa gateway:
     ```bash
     curl -i -X GET http://localhost:3001/nilai
     ```
     *(Tunjukkan respon: HTTP 403 Forbidden - Direct access forbidden: missing or invalid X-Gateway-Secret)*
  2. Coba kirim request dengan gateway secret palsu tanpa token:
     ```bash
     curl -i -X GET http://localhost:3001/nilai -H "X-Gateway-Secret: super-secure-internal-gateway-secret-2026"
     ```
     *(Tunjukkan respon: HTTP 401 Unauthorized - Resource service requires Authorization Bearer token)*

---

### Menit 02:45 - 04:30: Bagian 4.2 - Kebijakan Akses (ABAC & RBAC)
- **Tampilan Kode:** Buka `gateway/policy.js` pada fungsi `evaluatePolicy(req)`. Tunjukkan pengecekan kepemilikan kelas dan kepemilikan NIM di database.
- **Narasi:**
  > *"Masuk ke bagian 4.2 mengenai kebijakan akses. Sesuai prinsip Least Privilege dan ABAC, hak akses diputuskan tidak hanya berdasarkan role di token, tetapi juga relasi data di database. Mahasiswa hanya diizinkan melihat nilainya sendiri, sedangkan dosen hanya melihat kelas yang diampunya."*
- **Aksi Demo:**
  1. Login Mahasiswa Andi (`mhs_andi`) dengan Device `DEV-MHS-ANDI`:
     ```bash
     curl -X POST http://localhost:3000/auth/login \
       -H "Content-Type: application/json" \
       -H "X-Device-ID: DEV-MHS-ANDI" \
       -d '{"username": "mhs_andi", "password": "password123"}'
     ```
     *(Salin token Andi)*
  2. Mahasiswa Andi akses `GET /nilai`:
     ```bash
     curl -X GET http://localhost:3000/nilai \
       -H "Authorization: Bearer <TOKEN_ANDI>" \
       -H "X-Device-ID: DEV-MHS-ANDI"
     ```
     *(Tunjukkan bahwa hanya nilai NIM 227006001 yang muncul)*
  3. Mahasiswa Andi mencoba ubah nilai (`PUT /nilai/1`):
     ```bash
     curl -X PUT http://localhost:3000/nilai/1 \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <TOKEN_ANDI>" \
       -H "X-Device-ID: DEV-MHS-ANDI" \
       -d '{"nilai_angka": 95}'
     ```
     *(Tunjukkan respon: HTTP 403 Forbidden - Role 'mahasiswa' is not authorized to edit nilai)*
  4. Dosen Siti mencoba ubah nilai kelas Dosen Budi:
     ```bash
     # Login Dosen Siti
     curl -X POST http://localhost:3000/auth/login \
       -H "Content-Type: application/json" \
       -H "X-Device-ID: DEV-DOSEN-SITI" \
       -d '{"username": "dosen_siti", "password": "password123"}'

     # Coba ubah nilai kelas 1 (milik Dosen Budi)
     curl -X PUT http://localhost:3000/nilai/1 \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <TOKEN_SITI>" \
       -H "X-Device-ID: DEV-DOSEN-SITI" \
       -d '{"nilai_angka": 95}'
     ```
     *(Tunjukkan respon: HTTP 403 Forbidden - Dosen 'dosen_siti' does not teach the class for nilai ID 1)*

---

### Menit 04:30 - 05:45: Bagian 4.3 - Verifikasi Konteks (Device ID & Jam Akses)
- **Tampilan Kode:** Buka `gateway/policy.js` fungsi `isDeviceRegistered` dan `checkAccessHours`.
- **Narasi:**
  > *"Pada bagian 4.3, sistem memverifikasi konteks lingkungan: Pertama, Device ID. Setiap user wajib menyertakan header X-Device-ID yang terdaftar di database. Kedua, Jam Akses: perubahan dan finalisasi nilai hanya diizinkan antara pukul 07.00 hingga 21.00. Konfigurasi jam dapat diatur di file .env dan mendukung mock header untuk simulasi demo."*
- **Aksi Demo:**
  1. Login dengan Device ID asing:
     ```bash
     curl -X POST http://localhost:3000/auth/login \
       -H "Content-Type: application/json" \
       -H "X-Device-ID: DEVICE-PENYUSUP-99" \
       -d '{"username": "dosen_budi", "password": "password123"}'
     ```
     *(Tunjukkan respon: HTTP 403 Forbidden - Device not registered for this user)*
  2. Dosen Budi ubah nilai di luar jam akses (simulasi jam 23.00 via `X-Mock-Hour: 23`):
     ```bash
     curl -X PUT http://localhost:3000/nilai/1 \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <TOKEN_BUDI>" \
       -H "X-Device-ID: DEV-DOSEN-BUDI" \
       -H "X-Mock-Hour: 23" \
       -d '{"nilai_angka": 90}'
     ```
     *(Tunjukkan respon: HTTP 403 Forbidden - updates only permitted between 7:00 and 21:00)*
  3. Dosen Budi ubah nilai dalam jam akses (simulasi jam 10.00):
     ```bash
     curl -X PUT http://localhost:3000/nilai/1 \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <TOKEN_BUDI>" \
       -H "X-Device-ID: DEV-DOSEN-BUDI" \
       -H "X-Mock-Hour: 10" \
       -d '{"nilai_angka": 90}'
     ```
     *(Tunjukkan respon: HTTP 200 OK - Nilai updated successfully, nilai huruf terhitung otomatis)*

---

### Menit 05:45 - 07:15: Finalisasi Nilai & Panggilan Antar-Service
- **Tampilan Kode:** Buka `services/nilai/server.js` (endpoint `POST /kelas/:id/finalisasi`) dan `services/nilai/client.js` (`syncTranskripViaGateway`).
- **Narasi:**
  > *"Selanjutnya adalah proses finalisasi kelas dan sinkronisasi antar-service. Ketika Dosen memfinalisasi kelas, Service Nilai akan mengunci nilai menjadi final, lalu secara otomatis meminta Service Token ke Gateway via POST /auth/service, dan memanggil Service Transkrip melalui Gateway PEP (POST /transkrip/sinkron). Endpoint sinkronisasi ini strictly menolak token user biasa dan hanya menerima token ber-role 'service'."*
- **Aksi Demo:**
  1. Dosen Budi memfinalisasi Kelas 1:
     ```bash
     curl -X POST http://localhost:3000/kelas/1/finalisasi \
       -H "Authorization: Bearer <TOKEN_BUDI>" \
       -H "X-Device-ID: DEV-DOSEN-BUDI"
     ```
     *(Tunjukkan log di console: Service Nilai meminta token service, lalu memanggil gateway, dan transkrip mahasiswa terupdate)*
  2. Bukti nilai tidak dapat diubah lagi setelah finalisasi:
     ```bash
     curl -X PUT http://localhost:3000/nilai/1 \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer <TOKEN_BUDI>" \
       -H "X-Device-ID: DEV-DOSEN-BUDI" \
       -d '{"nilai_angka": 99}'
     ```
     *(Tunjukkan respon: HTTP 403 Forbidden - Nilai has already been finalized and cannot be modified)*
  3. Mahasiswa Andi cek transkripnya sendiri yang sudah tersinkron:
     ```bash
     curl -X GET http://localhost:3000/transkrip/227006001 \
       -H "Authorization: Bearer <TOKEN_ANDI>" \
       -H "X-Device-ID: DEV-MHS-ANDI"
     ```
     *(Tunjukkan IPK dan mata kuliah Keamanan Informasi sudah masuk)*
  4. Mahasiswa Andi mencoba intip transkrip Rani (227006002):
     ```bash
     curl -X GET http://localhost:3000/transkrip/227006002 \
       -H "Authorization: Bearer <TOKEN_ANDI>" \
       -H "X-Device-ID: DEV-MHS-ANDI"
     ```
     *(Tunjukkan respon: HTTP 403 Forbidden - Mahasiswa can only access their own transcript)*

---

### Menit 07:15 - 08:15: Bagian 4.4 - Audit Log & Test Otomatis
- **Tampilan Kode:** Buka `gateway/audit.js` dan file `audit.log`.
- **Narasi:**
  > *"Bagian 4.4 mengharuskan pencatatan audit log untuk setiap keputusan akses. Gateway mencatat timestamp, subjek, role, endpoint, method, device ID, keputusan (ALLOW/DENY), dan alasan penolakan ke tabel database dan file audit.log. Mari kita lihat isi log audit melalui akun Admin."*
- **Aksi Demo:**
  1. Admin melihat log audit:
     ```bash
     # Login Admin
     curl -X POST http://localhost:3000/auth/login \
       -H "Content-Type: application/json" \
       -H "X-Device-ID: DEV-ADMIN-01" \
       -d '{"username": "admin1", "password": "password123"}'

     # Lihat Log Audit
     curl -X GET http://localhost:3000/audit-logs \
       -H "Authorization: Bearer <TOKEN_ADMIN>" \
       -H "X-Device-ID: DEV-ADMIN-01"
     ```
  2. Buka terminal baru dan jalankan test suite otomatis:
     ```bash
     npm test
     ```
     *(Tunjukkan terminal: 23 PASSED, 0 FAILED - seluruh skenario Zero Trust terverifikasi sempurna)*

---

### Menit 08:15 - 08:45: Kesimpulan & Penutup
- **Narasi:**
  > *"Sebagai kesimpulan, sistem ini telah berhasil menerapkan seluruh prinsip Zero Trust Security sesuai NIST SP 800-207: Gateway bertindak sebagai PEP yang memeriksa seluruh traffic, Policy Engine menerapkan kontrol akses berbasis atribut dan kepemilikan data, konteks perangkat dan waktu diverifikasi ketat, serta komunikasi antar-service diamankan dengan service token dan gateway secret. Sekian demonstrasi praktikum ini, terima kasih."*
