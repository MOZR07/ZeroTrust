# PANDUAN LENGKAP & MASTER SCENARIO REKAMAN VIDEO DEMO (6–9 MENIT)
**Tugas Praktikum Individu: Zero Trust Security (NIST SP 800-207)**  
Mata Kuliah: Keamanan Informasi (KP70065004) · Informatika Universitas Siliwangi  
URL Frontend: `http://localhost:3000`

---

## 🛠️ 1. SETUP LAYAR SEBELUM MULAI REKAM
Atur layout desktop menjadi 2 atau 3 jendela berdampingan:
1. **Jendela Kiri:** VS Code (buka project `Praktikum ZeroTrust`). Buka file-file penting di tab:
   - `gateway/policy.js`
   - `services/verifyResource.js`
   - `services/nilai/client.js`
   - `audit.log`
2. **Jendela Kanan:** Browser (Chrome/Edge) membuka `http://localhost:3000`.
3. **Jendela Terminal (bawah):** Terminal Git Bash siap pakai.

Sebelum klik tombol *Record*, reset database ke kondisi awal:
```bash
npm run seed
```

---

## 📋 2. CHEAT SHEET: AKUN & DATA PENTING
Semua password: `password123`

| User | Peran | Device ID Sah | Kelas yang Diampu / NIM |
|---|---|---|---|
| `admin1` | Admin | `DEV-ADMIN-01` | ADM001 (Akses semua transkrip & audit log) |
| `dosen_budi` | Dosen | `DEV-DOSEN-BUDI` | Kelas ID 1: IF301 (Keamanan Informasi) |
| `dosen_siti` | Dosen | `DEV-DOSEN-SITI` | Kelas ID 2: IF302 (Arsitektur Komputer) |
| `mhs_andi` | Mahasiswa | `DEV-MHS-ANDI` | NIM 227006001 |
| `mhs_rani` | Mahasiswa | `DEV-MHS-RANI` | NIM 227006002 |

---

## 🎬 3. SKENARIO DEMO STEP-BY-STEP (MENIT PER MENIT)

---

### SEGMENT 1 (00:00 – 01:15) | PENDAHULUAN & ARSITEKTUR NIST SP 800-207
#### A. Yang Harus Ditampilkan di Layar:
- Tampilkan diagram arsitektur di file `README.md` atau slide ringkas.
- Tunjukkan 3 port yang berjalan:
  - Port 3000 (Gateway PEP)
  - Port 3001 (Service Nilai)
  - Port 3002 (Service Transkrip)

#### B. Yang Harus Dijelaskan (Poin Kunci):
- **Prinsip Utama Zero Trust:**
  1. *Never Trust, Always Verify:* Tidak ada jaringan yang dipercaya otomatis. Setiap request diverifikasi dari nol.
  2. *Least Privilege:* Hak akses seminimal mungkin. Mahasiswa tidak bisa ubah nilai, dosen tidak bisa ubah kelas dosen lain.
  3. *Assume Breach:* Jaringan perimeter dianggap sudah dijebol. Karena itu service resource internal (3001 & 3002) tetap memverifikasi token dan gateway secret secara mandiri.
- **Peran Komponen NIST SP 800-207:**
  - API Gateway = Policy Enforcement Point (PEP).
  - Modul `gateway/policy.js` = Policy Engine (PE) dan Policy Administrator (PA).
  - Service Nilai & Transkrip = Resource Servers.
  - Database SQLite = Data Source.

#### C. Contoh Kalimat Bicara:
> "Halo semuanya. Perkenalkan nama saya [Nama Lengkap], NIM [NIM Anda]. Hari ini saya akan mendemonstrasikan implementasi Sistem Nilai berbasis Arsitektur Zero Trust Security sesuai standar NIST SP 800-207. 
> 
> Sistem ini terdiri dari 3 service utama: API Gateway di port 3000 sebagai Policy Enforcement Point atau PEP yang mengontrol seluruh lalu lintas, Service Nilai di port 3001, dan Service Transkrip di port 3002 sebagai Resource Server. Seluruh akses diperiksa ketat dengan prinsip Never Trust Always Verify, Least Privilege, dan Assume Breach."

---

### SEGMENT 2 (01:15 – 02:45) | KEBUTUHAN 4.1: AUTENTIKASI, TOKEN, & RESOURCE SHIELD
#### A. Yang Harus Ditampilkan di Layar:
1. Buka file `gateway/policy.js` di baris token helper:
   - Sorot `generateAccessToken` (expiresIn: '10m', klaim `sub`, `role`).
   - Sorot `generateRefreshToken` (disimpan di DB SQLite).
   - Sorot `generateServiceToken` (expiresIn: '5m', role: 'service').
2. Buka file `services/verifyResource.js`:
   - Sorot pengecekan header `x-gateway-secret`.
   - Sorot `jwt.verify(token, secret)` (verifikasi ulang independen).
3. Beralih ke terminal Git Bash untuk uji penetrasi bypass.

#### B. Yang Harus Dilakukan & Dijelaskan:
- **Tindakan 1 (Direct Bypass Test):** Penyerang mencoba bypass Gateway langsung menembak Service Nilai di port 3001.
  ```bash
  curl -i http://localhost:3001/nilai
  ```
  *Jelaskan respon:* "Hasilnya langsung ditolak HTTP 403 Forbidden karena tidak membawa header `X-Gateway-Secret`. Artinya service internal tidak dapat diakses langsung oleh siapapun dari luar."
- **Tindakan 2 (Bypass Secret Test):** Penyerang berhasil mencuri gateway secret, lalu menembak port 3001 tanpa JWT token:
  ```bash
  curl -i http://localhost:3001/nilai -H "X-Gateway-Secret: super-secure-internal-gateway-secret-2026"
  ```
  *Jelaskan respon:* "Hasilnya tetap ditolak HTTP 401 Unauthorized. Mengapa? Karena service resource menerapkan prinsip *Assume Breach* dengan memverifikasi ulang tanda tangan digital dan masa berlaku JWT secara independen."

---

### SEGMENT 3 (02:45 – 04:15) | KEBUTUHAN 4.3: VERIFIKASI KONTEKS (DEVICE ID & JAM AKSES)
#### A. Yang Harus Ditampilkan di Layar:
- Buka antarmuka web di browser: `http://localhost:3000`.
- Buka file `gateway/policy.js` dan sorot fungsi `isDeviceRegistered` dan `checkAccessHours`.

#### B. Yang Harus Dilakukan & Dijelaskan:
- **Uji Konteks 1: Device ID Tidak Terdaftar**
  1. Klik tombol preset akun **Andi (Mahasiswa)**. Form otomatis terisi `mhs_andi` dan device `DEV-MHS-ANDI`.
  2. Ganti teks kolom Device ID menjadi `DEV-HACKER-HP`.
  3. Klik tombol **Login & Minta Token**.
  4. *Tunjukkan alert merah:* `[DENY 403] Device 'DEV-HACKER-HP' is not registered for user 'mhs_andi'`.
  5. *Jelaskan:* "Meskipun username dan password benar, request ditolak karena perangkat tidak terdaftar di database untuk user ini. Ini adalah penerapan verifikasi konteks Zero Trust."
- **Uji Konteks 2: Login Sah**
  1. Kembalikan Device ID menjadi `DEV-MHS-ANDI`. Klik tombol Login.
  2. *Tunjukkan alert hijau:* Login sukses, token JWT terbit dan payload tampil di panel kiri (`sub: 4, role: mahasiswa`).
- **Uji Konteks 3: Jam Akses Operasional (07.00 - 21.00)**
  1. Logout, lalu klik preset **Dr. Budi (Dosen)**, klik Login.
  2. Pada dropdown **Simulasi Jam Akses (X-Mock-Hour)**, pilih **Jam 23:00 (Di Luar Jam Kerja)**.
  3. Di tabel nilai, coba klik tombol **Edit Nilai** pada baris nilai mahasiswa, masukkan angka `95`.
  4. *Tunjukkan alert merah:* `[DENY 403] Access denied: Nilai updates are only permitted between 7:00 and 21:00`.
  5. *Jelaskan:* "Sesuai kebutuhan 4.3, operasi perubahan dan finalisasi nilai wajib dibatasi pada jam operasional 07.00 sampai 21.00. Jika di luar jam itu, Policy Engine langsung menolak."
  6. Ubah dropdown kembali ke **Jam 10:00 (Dalam Jam Kerja)**. Klik Edit Nilai lagi, ubah jadi `92`.
  7. *Tunjukkan alert hijau:* Sukses diubah menjadi 92 dan nilai huruf otomatis terkalkulasi.

---

### SEGMENT 4 (04:15 – 05:45) | KEBUTUHAN 4.2: KEBIJAKAN AKSES BERBASIS DATA (ABAC / LEAST PRIVILEGE)
#### A. Yang Harus Ditampilkan di Layar:
- Browser UI tab **Service Nilai** dan **Service Transkrip**.
- Sorot bagian `evaluatePolicy` di `gateway/policy.js` yang mengecek kepemilikan data di database SQLite.

#### B. Yang Harus Dilakukan & Dijelaskan:
- **Kasus 1: Mahasiswa Hanya Boleh Melihat Nilai Miliknya Sendiri**
  1. Login sebagai **Andi (`mhs_andi`)**.
  2. Perhatikan tabel nilai: hanya menampilkan data nilai milik Andi (NIM `227006001`). Mahasiswa tidak melihat nilai mahasiswa lain, dan kolom aksi berstatus *Read-only*.
- **Kasus 2: Mahasiswa Dilarang Mengintip Transkrip Mahasiswa Lain**
  1. Buka tab **Service Transkrip**.
  2. Input NIM Andi: `227006001`, klik **Lihat Transkrip**. Data transkrip Andi berhasil dimuat.
  3. Ganti NIM input menjadi milik Rani: `227006002`, klik **Lihat Transkrip**.
  4. *Tunjukkan alert merah:* `[DENY 403] Forbidden: Mahasiswa 'mhs_andi' can only access their own transcript, not NIM '227006002'`.
  5. *Jelaskan:* "Policy Engine mengecek klaim identifier token terhadap parameter URL. Jika NIM berbeda, akses langsung ditolak."
- **Kasus 3: Dosen Hanya Boleh Mengubah Kelas yang Diampunya**
  1. Login sebagai **Siti M.Kom (`dosen_siti`)** yang mengampu kelas IF302.
  2. Di tabel nilai, dosen Siti mencoba mengedit nilai pada kelas IF301 milik Dr. Budi.
  3. *Tunjukkan penolakan:* Policy Engine membaca relasi kelas di database dan menolak dengan alasan Dosen Siti bukan pengampu kelas tersebut.
- **Kasus 4: Admin Boleh Melihat Semua Transkrip**
  1. Login sebagai **Administrator Sistem (`admin1`)**.
  2. Buka tab Transkrip, ketik NIM `227006001` lalu `227006002`. Keduanya sukses ditampilkan karena Admin memiliki hak melihat transkrip seluruh mahasiswa.

---

### SEGMENT 5 (05:45 – 07:15) | FINALISASI NILAI & PANGGILAN ANTAR-SERVICE DENGAN SERVICE TOKEN
#### A. Yang Harus Ditampilkan di Layar:
1. Buka `services/nilai/server.js` (endpoint `POST /kelas/:id/finalisasi`).
2. Buka `services/nilai/client.js` (fungsi `syncTranskripViaGateway`).
3. Tunjukkan browser tab Service Nilai.

#### B. Yang Harus Dilakukan & Dijelaskan:
- *Jelaskan mekanismenya terlebih dahulu:*
  > "Saat dosen memfinalisasi kelas, nilai akan dikunci permanen. Setelah itu, Service Nilai harus mengirim data ke Service Transkrip. Namun di arsitektur Zero Trust, Service Nilai tidak boleh asal menembak Service Transkrip.
  > Service Nilai pertama-tama meminta **Service Token** ke Gateway (`POST /auth/service`) menggunakan client ID dan secret. Token ini memiliki role khusus yaitu `service`. Kemudian, Service Nilai memanggil `POST /transkrip/sinkron` lewat Gateway PEP.
  > Endpoint sinkronisasi ini strictly menolak token user apapun, bahkan token Admin, dan hanya menerima token role `service`."
- **Eksekusi Demo di Browser:**
  1. Login sebagai **Dr. Budi (`dosen_budi`)**.
  2. Klik tombol hijau: **Finalisasi Kelas IF301 (Dosen Budi)**.
  3. Konfirmasi alert dialog browser.
  4. *Tunjukkan respon:* Berhasil difinalisasi dan tersinkron ke Service Transkrip.
  5. Perhatikan tabel nilai: status kelas berubah menjadi **FINAL** dengan badge biru, dan tombol edit dinonaktifkan. Nilai terkunci permanen.
  6. Buka tab **Service Transkrip**, cari NIM Andi (`227006001`).
  7. *Tunjukkan hasilnya:* Mata kuliah Keamanan Informasi (IF301) kini resmi masuk ke transkrip mahasiswa, lengkap dengan SKS dan IPK yang dihitung otomatis.
- **Eksekusi Pembuktian Terminal (Token User Ditolak di Endpoint Sinkron):**
  - Jelaskan: "Mari kita buktikan jika user biasa mencoba menembak endpoint sinkron transkrip, maka akan ditolak."
  - Jalankan cURL dengan token user ke `/transkrip/sinkron` -> ditolak 403 Forbidden (Service token only).

---

### SEGMENT 6 (07:15 – 08:15) | KEBUTUHAN 4.4: AUDIT LOGGING & SUITE PENGUJIAN OTOMATIS
#### A. Yang Harus Ditampilkan di Layar:
1. Browser tab **PEP Audit Logs**.
2. File teks `audit.log` di VS Code.
3. Terminal Git Bash menjalankan `npm test`.

#### B. Yang Harus Dilakukan & Dijelaskan:
- **Tunjukkan Tab Audit Log:**
  1. Login sebagai Admin (`admin1`), buka tab **PEP Audit Logs**, klik Muat Ulang Log.
  2. *Jelaskan:* "Sesuai kebutuhan 4.4, Gateway mencatat setiap keputusan akses secara komprehensif: waktu kejadian, subjek dan rolenya, endpoint yang dituju, Device ID yang dipakai, hasil keputusan ALLOW atau DENY, serta alasan detail penolakannya."
  3. Sorot baris-baris merah (DENY) dari percobaan hacking dan bypass yang tadi dilakukan.
  4. Buka file `audit.log` di VS Code untuk membuktikan log juga tercatat secara fisik ke file sistem.
- **Jalankan Test Otomatis (Penutup Teknis):**
  1. Buka terminal Git Bash, jalankan:
     ```bash
     npm test
     ```
  2. Biarkan script berjalan selama ± 3 detik.
  3. *Sorot hasilnya:* **23 PASSED, 0 FAILED**.
  4. *Jelaskan:* "Seluruh 23 skenario uji otomatis, mulai dari enkapsulasi service, validasi device, pembatasan jam akses, ABAC, hingga revocable refresh token telah teruji dan lolos 100%."

---

### SEGMENT 7 (08:15 – 08:45) | KESIMPULAN & PENUTUP
#### A. Yang Harus Ditampilkan di Layar:
- Tampilan depan dashboard PEP Gateway `http://localhost:3000`.

#### B. Naskah Penutup:
> "Sebagai kesimpulan, sistem yang dibangun telah memenuhi seluruh spesifikasi tugas praktikum Zero Trust Security berbasis dokumen NIST SP 800-207:
> 1. Gateway berfungsi sebagai PEP tunggal yang memverifikasi setiap request.
> 2. Penerapan kontrol akses berbasis konteks (Device ID dan jam operasional).
> 3. Pengendalian hak akses berbasis kepemilikan data (ABAC).
> 4. Komunikasi antar-service aman dengan token service dan gateway secret.
> 5. Pencatatan audit trail lengkap untuk visibilitas keamanan.
> 
> Sekian demonstrasi dari saya, mohon maaf bila ada kekurangan. Terima kasih."

---

## 📌 RINGKASAN TINDAKAN & FILE YANG DITUNJUKKAN

| Segmen | Dokumen Tugas PDF | File Kode yang Disorot | Aksi Praktik yang Dilakukan |
|---|---|---|---|
| 1 | Bagian 1–3 | `README.md` (arsitektur) | Jelaskan diagram PEP & Resource |
| 2 | Bagian 4.1 | `gateway/policy.js`, `services/verifyResource.js` | cURL tembak port 3001 langsung (tolak 403 & 401) |
| 3 | Bagian 4.3 | `gateway/policy.js` (`isDeviceRegistered`, `checkAccessHours`) | Login device asing (tolak), edit nilai jam 23.00 (tolak) |
| 4 | Bagian 4.2 | `gateway/policy.js` (ABAC SQLite query) | Mahasiswa intip NIM lain (tolak), dosen ubah kelas lain (tolak) |
| 5 | Bagian 3 & 4.1 | `services/nilai/client.js`, `services/transkrip/server.js` | Klik finalisasi kelas di UI -> trigger token service -> nilai masuk transkrip |
| 6 | Bagian 4.4 & 5 | `gateway/audit.js`, `audit.log` | Buka tab Audit Log UI, cek `audit.log`, jalankan `npm test` (23 Pass) |
| 7 | Bagian 6 | Halaman utama UI web | Rangkuman kesimpulan |
