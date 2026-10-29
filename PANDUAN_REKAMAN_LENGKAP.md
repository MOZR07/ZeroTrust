# PANDUAN MASTER REKAMAN VIDEO DEMO ZERO TRUST (6–9 MENIT)
**Mata Kuliah:** Keamanan Informasi (KP70065004) · Informatika Universitas Siliwangi  
**Standar Arsitektur:** NIST SP 800-207 Zero Trust Architecture  
**Target Durasi:** 07:30 – 08:30 (Sesuai ketentuan PDF: 6–9 menit)  
**URL Frontend:** `http://localhost:3000`

---

## 🖥️ PERSIAPAN SEBELUM MENEKAN TOMBOL "RECORD"

1. **Atur Tampilan Layar (Side-by-Side):**
   - **Sebelah Kiri:** Visual Studio Code menampilkan struktur folder proyek.
     - Siapkan tab file yang sudah dibuka:
       1. `gateway/policy.js`
       2. `services/verifyResource.js`
       3. `services/nilai/client.js`
       4. `audit.log`
   - **Sebelah Kanan:** Browser (Google Chrome / Edge) membuka `http://localhost:3000`.
   - **Sebelah Kanan Bawah / Terminal Bawah:** Git Bash siap mengeksekusi perintah cURL dan `npm test`.

2. **Bersihkan Data Uji (Clean Slate):**
   Jalankan perintah ini di terminal agar database kembali ke kondisi awal:
   ```bash
   npm run seed
   ```

3. **Pastikan Server Berjalan:**
   ```bash
   npm start
   ```

4. **Kredensial Cepat (Semua Password: `password123`):**
   - `admin1` (Device: `DEV-ADMIN-01`) -> Admin
   - `dosen_budi` (Device: `DEV-DOSEN-BUDI`) -> Dosen Kelas IF301 (Keamanan Informasi)
   - `dosen_siti` (Device: `DEV-DOSEN-SITI`) -> Dosen Kelas IF302 (Arsitektur Komputer)
   - `mhs_andi` (Device: `DEV-MHS-ANDI`, NIM: `227006001`) -> Mahasiswa
   - `mhs_rani` (Device: `DEV-MHS-RANI`, NIM: `227006002`) -> Mahasiswa

---

# 🎬 SKENARIO DEMO STEP-BY-STEP & KATA-DEMI-KATA

---

## ⏱️ BAGIAN 1: PEMBUKAAN & ARSITEKTUR NIST SP 800-207
- **Target Waktu:** Menit 00:00 – 01:15 (Durasi: ~75 detik)
- **Fokus Layar:** Tampilkan diagram di `README.md` dan struktur project di VS Code.

### 📌 STEP-BY-STEP TINDAKAN:
1. Buka file `README.md` pada bagian diagram ASCII arsitektur sistem.
2. Arahkan kursor mouse ke tiga kotak: API Gateway (port 3000), Service Nilai (port 3001), dan Service Transkrip (port 3002).

### 🗣️ APA YANG HARUS DIJELASKAN (NASKAH BICARA):
> *"Halo semuanya. Perkenalkan nama saya **[Sebutkan Nama Anda]**, NIM **[Sebutkan NIM Anda]**, mahasiswa Informatika Universitas Siliwangi. Hari ini saya akan mendemonstrasikan hasil pengerjaan Tugas Praktikum Keamanan Informasi mengenai penerapan arsitektur **Zero Trust Security** berbasis dokumen standar **NIST SP 800-207** pada Sistem Nilai Akademik.*
>
> *Pada arsitektur tradisional perimeter-based, siapa pun yang berada di jaringan internal dianggap aman. Namun pada Zero Trust, kami menerapkan 3 prinsip utama:*
> 1. *Pertama, **Never Trust, Always Verify**: setiap akses ke sumber daya harus melalui pemeriksaan otentikasi dan otorisasi yang ketat, tanpa memandang dari mana request tersebut berasal.*
> 2. *Kedua, **Least Privilege**: setiap pengguna hanya diberikan hak akses seminimal mungkin sesuai perannya dan data yang menjadi hak miliknya.*
> 3. *Ketiga, **Assume Breach**: kami mengasumsikan perimeter jaringan sudah berhasil dijebol oleh penyerang, sehingga service internal tidak boleh percaya begitu saja pada lalu lintas jaringan lokal.*
>
> *Sistem yang dibangun terbagi menjadi tiga service terpisah:*
> - *Di port **3000** berjalan **API Gateway** yang berperan sebagai **Policy Enforcement Point (PEP)** dan memuat modul **Policy Engine**.*
> - *Di port **3001** berjalan **Service Nilai** sebagai Resource Server.*
> - *Di port **3002** berjalan **Service Transkrip** juga sebagai Resource Server.*
> *Seluruh request dari luar maupun antar-service wajib melewati API Gateway."*

---

## ⏱️ BAGIAN 2: KEBUTUHAN 4.1 – AUTENTIKASI, TOKEN & PERLINDUNGAN RESOURCE
- **Target Waktu:** Menit 01:15 – 02:45 (Durasi: ~90 detik)
- **Fokus Layar:** Buka tab `gateway/policy.js`, lalu `services/verifyResource.js`, kemudian terminal Git Bash.

### 📌 STEP-BY-STEP TINDAKAN:
1. Di VS Code, buka file `gateway/policy.js`.
   - Sorot baris 38 (`generateAccessToken`): tunjukkan JWT dengan expired 10 menit.
   - Sorot baris 53 (`generateRefreshToken`): tunjukkan penyimpanan token ke tabel SQLite `refresh_tokens`.
   - Sorot baris 66 (`generateServiceToken`): tunjukkan token untuk microservice berumur 5 menit dengan klaim `role: "service"`.
2. Buka file `services/verifyResource.js`.
   - Sorot pengecekan header `x-gateway-secret`.
   - Sorot pemanggilan `jwt.verify(token, secret)` di level service.
3. Beralih ke terminal Git Bash untuk melakukan demo penetrasi langsung.

### 🗣️ APA YANG HARUS DIJELASKAN (NASKAH BICARA):
> *"Sekarang mari kita lihat pemenuhan Bagian 4.1 pada dokumen tugas.*
>
> *Di file `gateway/policy.js`, Policy Engine menerbitkan **Access Token JWT** yang berlaku selama 10 menit berisi klaim identitas subjek dan role. Sistem juga menerbitkan **Refresh Token** berumur 1 hari yang disimpan di database sehingga dapat dicabut kapan saja saat pengguna melakukan logout.*
> *Khusus untuk Service Nilai, tersedia endpoint `POST /auth/service` yang menerbitkan Service Token berdurasi 5 menit dengan `role: service`.*
>
> *Untuk mencegah penyerang membypass gateway dan langsung mengakses service internal di port 3001 atau 3002, Gateway menyisipkan header rahasia `X-Gateway-Secret` saat mem-forward request.*
>
> *Dan di file `services/verifyResource.js`, service menerapkan prinsip **Assume Breach**: selain memeriksa `X-Gateway-Secret`, service juga memverifikasi ulang tanda tangan digital JWT secara independen. Jika token tidak valid atau hilang, request tetap ditolak meskipun membawa gateway secret.*
>
> *Mari kita buktikan secara langsung melalui terminal:"*

### 💻 EKSEKUSI DI TERMINAL (DEMO 1):
1. **Uji Coba Bypass Service Langsung (Port 3001 tanpa Gateway):**
   Ketik perintah ini di terminal:
   ```bash
   curl -i http://localhost:3001/nilai
   ```
   *Tunjukkan respon:* Layar menampilkan **HTTP/1.1 403 Forbidden - Direct access forbidden: Missing or invalid X-Gateway-Secret**.
   > *"Bisa dilihat, tembakan langsung ke port 3001 ditolak 403 karena tidak melalui Gateway."*

2. **Uji Coba Kirim Secret Palsu Tanpa Token:**
   Ketik perintah ini di terminal:
   ```bash
   curl -i http://localhost:3001/nilai -H "X-Gateway-Secret: super-secure-internal-gateway-secret-2026"
   ```
   *Tunjukkan respon:* Layar menampilkan **HTTP/1.1 401 Unauthorized - Resource service requires Authorization Bearer token**.
   > *"Bahkan jika membawa gateway secret, service tetap menolak 401 karena tidak membawa token JWT yang sah. Ini membuktikan verifikasi ulang di level resource berjalan."*

---

## ⏱️ BAGIAN 3: KEBUTUHAN 4.3 – VERIFIKASI KONTEKS (DEVICE ID & JAM AKSES)
- **Target Waktu:** Menit 02:45 – 04:15 (Durasi: ~90 detik)
- **Fokus Layar:** Browser `http://localhost:3000` dan file `gateway/policy.js`.

### 📌 STEP-BY-STEP TINDAKAN:
1. Tampilkan dashboard browser di `http://localhost:3000`.
2. Tunjukkan baris kode `isDeviceRegistered` dan `checkAccessHours` di `gateway/policy.js`.
3. Lakukan pengujian di web UI.

### 🗣️ APA YANG HARUS DIJELASKAN (NASKAH BICARA):
> *"Sesuai Bagian 4.3 dokumen tugas, Zero Trust tidak hanya memeriksa username dan password, tetapi juga konteks lingkungan saat akses diminta:*
> 1. *Pertama, **Device Terdaftar**: setiap request wajib menyertakan header `X-Device-ID`. Jika perangkat tidak terdaftar untuk pengguna tersebut, akses ditolak.*
> 2. *Kedua, **Jam Akses**: perubahan dan finalisasi nilai dibatasi hanya boleh dilakukan pada jam operasional 07.00 sampai 21.00.*
>
> *Mari kita demonstrasikan di antarmuka web:*

### 💻 EKSEKUSI DI BROWSER (DEMO 2):
1. **Uji Device Tidak Terdaftar:**
   - Di panel preset akun sebelah kiri, klik tombol **Andi (Mahasiswa)**. Form otomatis terisi username `mhs_andi` dan device `DEV-MHS-ANDI`.
   - Ubah teks pada kolom `Header X-Device-ID` menjadi: `DEV-PENYUSUP-HP`.
   - Klik tombol **Login & Minta Token**.
   - *Tunjukkan alert merah yang muncul:* **[DENY 403] Device 'DEV-PENYUSUP-HP' is not registered for user 'mhs_andi'**.
   > *"Meskipun username dan password Andi benar, login ditolak 403 oleh Policy Engine karena perangkat penyerang tidak terdaftar di database."*

2. **Uji Login Sah:**
   - Kembalikan Device ID menjadi `DEV-MHS-ANDI`.
   - Klik **Login & Minta Token**.
   - *Tunjukkan alert hijau:* Login Berhasil. Payload token JWT langsung tampil di panel kiri bawah memperlihatkan nama Andi, role mahasiswa, dan NIM `227006001`.

3. **Uji Jam Akses (07.00 – 21.00):**
   - Klik tombol **Logout** di navbar kanan atas.
   - Klik preset **Dr. Budi (Dosen)**, lalu klik **Login & Minta Token**.
   - Pada dropdown **Simulasi Jam Akses (X-Mock-Hour)**, pilih **Jam 23:00 (Di Luar Jam Kerja)**.
   - Di tabel data nilai sebelah kanan, coba klik tombol **Edit Nilai** pada salah satu baris mahasiswa, masukkan angka `95`, lalu klik OK.
   - *Tunjukkan alert merah yang muncul:* **[DENY 403] Access denied: Nilai updates are only permitted between 7:00 and 21:00 (current hour: 23:00)**.
   > *"Sesuai aturan, di luar jam kerja dosen tidak diizinkan mengubah nilai."*
   - Sekarang, ubah dropdown Simulasi Jam Akses kembali ke **Jam 10:00 (Dalam Jam Kerja)**.
   - Klik tombol **Edit Nilai** lagi, masukkan angka `92`, lalu klik OK.
   - *Tunjukkan alert hijau:* Nilai berhasil diupdate menjadi 92 dan nilai huruf otomatis terkalkulasi menjadi A.

---

## ⏱️ BAGIAN 4: KEBUTUHAN 4.2 – KEBIJAKAN AKSES DATA (ABAC / LEAST PRIVILEGE)
- **Target Waktu:** Menit 04:15 – 05:45 (Durasi: ~90 detik)
- **Fokus Layar:** Browser tab **Service Nilai** dan **Service Transkrip**, sesekali tunjukkan query SQLite di `gateway/policy.js`.

### 📌 STEP-BY-STEP TINDAKAN:
1. Di VS Code, sorot fungsi `evaluatePolicy(req)` di `gateway/policy.js` yang melakukan query kepemilikan:
   `SELECT dosen_id FROM kelas WHERE id = ?`.
2. Lakukan pengujian di web UI untuk 4 skenario pengguna.

### 🗣️ APA YANG HARUS DIJELASKAN (NASKAH BICARA):
> *"Masuk ke Bagian 4.2 mengenai Kebijakan Akses. Di sini kita menerapkan Attribute-Based Access Control atau ABAC. Hak akses tidak bisa diputuskan hanya dari isi token saja, melainkan Policy Engine membaca kepemilikan data di database.*
>
> *Mari kita buktikan 4 skenario kebijakan:*

### 💻 EKSEKUSI DI BROWSER (DEMO 3):
1. **Skenario 1: Mahasiswa Hanya Melihat Nilai Miliknya Sendiri**
   - Logout, lalu login sebagai **Andi (`mhs_andi`)**.
   - Lihat tabel di tab Service Nilai.
   > *"Perhatikan: Andi hanya melihat nilai miliknya sendiri (NIM 227006001). Nilai milik mahasiswa lain seperti Rani atau Cahyo tidak muncul sama sekali. Selain itu kolom aksi berstatus Read-only, mahasiswa tidak memiliki tombol edit."*

2. **Skenario 2: Mahasiswa Ditolak Mengintip Transkrip Mahasiswa Lain**
   - Pindah ke tab **Service Transkrip (Port 3002)**.
   - Kolom NIM sudah otomatis terisi `227006001`. Klik tombol **Lihat Transkrip**.
   - Data transkrip Andi tampil (atau masih kosong jika belum difinalisasi).
   - Sekarang, ganti kolom NIM menjadi milik mahasiswa lain: `227006002` (milik Rani), lalu klik **Lihat Transkrip**.
   - *Tunjukkan alert merah:* **[DENY 403] Forbidden: Mahasiswa 'mhs_andi' (NIM: 227006001) can only access their own transcript, not NIM '227006002'**.
   > *"Policy Engine mencocokkan identitas token dengan parameter NIM URL, dan langsung menolak jika tidak cocok."*

3. **Skenario 3: Dosen Ditolak Mengubah Nilai Kelas yang Tidak Diampunya**
   - Logout, lalu login sebagai **Siti M.Kom (`dosen_siti`)** dengan Device `DEV-DOSEN-SITI`.
   - Dosen Siti mengampu kelas IF302 (Arsitektur Komputer).
   - Di backend, jika Dosen Siti mencoba menembak `PUT /nilai/1` (yang merupakan kelas IF301 milik Dr. Budi), Policy Engine memeriksa tabel kelas dan menolak dengan alasan: Dosen Siti bukan pengampu kelas tersebut.

4. **Skenario 4: Admin Diizinkan Melihat Semua Transkrip**
   - Logout, lalu login sebagai **Administrator Sistem (`admin1`)** dengan Device `DEV-ADMIN-01`.
   - Buka tab Service Transkrip. Masukkan NIM `227006001` lalu klik Lihat Transkrip -> Berhasil.
   - Ganti ke NIM `227006002` lalu klik Lihat Transkrip -> Berhasil.
   > *"Admin memiliki kewenangan penuh melihat transkrip seluruh mahasiswa."*

---

## ⏱️ BAGIAN 5: FINALISASI KELAS & PANGGILAN ANTAR-SERVICE DENGAN SERVICE TOKEN
- **Target Waktu:** Menit 05:45 – 07:15 (Durasi: ~90 detik)
- **Fokus Layar:** Buka file `services/nilai/client.js` di VS Code, lalu beralih ke UI browser.

### 📌 STEP-BY-STEP TINDAKAN:
1. Di VS Code, buka file `services/nilai/client.js`.
   - Sorot fungsi `getServiceToken()`: memperlihatkan pemanggilan `POST /auth/service` menggunakan client ID `service-nilai` dan secret.
   - Sorot fungsi `syncTranskripViaGateway()`: memperlihatkan Service Nilai memanggil `POST /transkrip/sinkron` lewat Gateway PEP dengan `Authorization: Bearer <service_token>`.
2. Buka `services/transkrip/server.js`:
   - Sorot pengecekan `if (auth.role !== 'service') return res.status(403)`.
3. Beralih ke browser untuk mengeksekusi finalisasi.

### 🗣️ APA YANG HARUS DIJELASKAN (NASKAH BICARA):
> *"Berikutnya adalah alur finalisasi nilai dan komunikasi antar-service.*
> *Ketika dosen memfinalisasi kelas, nilai kelas tersebut akan dikunci dan dikirim ke Service Transkrip. Di arsitektur Zero Trust, Service Nilai tidak boleh memanggil database Service Transkrip secara langsung.*
>
> *Sebagaimana terlihat di file `services/nilai/client.js`, Service Nilai mengotentikasi diri ke Gateway melalui `POST /auth/service` untuk mendapatkan Service Token khusus dengan masa berlaku 5 menit dan `role: service`.*
> *Setelah itu, Service Nilai memanggil `POST /transkrip/sinkron` melalui Gateway PEP. Endpoint sinkronisasi ini dirancang sangat ketat: jika dipanggil menggunakan token user biasa—bahkan token Admin sekalipun—akan ditolak 403 Forbidden. Hanya token dengan role service yang diizinkan.*
>
> *Mari kita eksekusi prosesnya di web UI:"*

### 💻 EKSEKUSI DI BROWSER (DEMO 4):
1. Logout, lalu login kembali sebagai **Dr. Budi (`dosen_budi`)**.
2. Pastikan tab berada di **Service Nilai (Port 3001)**.
3. Di bawah tabel, klik tombol hijau: **Finalisasi Kelas IF301 (Dosen Budi)**.
4. Klik tombol **OK** pada dialog konfirmasi browser.
5. *Tunjukkan alert hijau yang muncul:* **Kelas #1 berhasil difinalisasi! 3 nilai tersinkron via token service**.
6. *Perhatikan perubahan pada tabel:*
   - Kolom status berubah menjadi badge biru bertuliskan **FINAL**.
   - Tombol edit berubah menjadi **Terkunci** (disabled).
7. Coba klik paksa atau panggil PUT nilai: Policy Engine menolak karena status nilai sudah final dan tidak dapat diubah lagi.
8. Pindah ke tab **Service Transkrip (Port 3002)**.
9. Masukkan NIM Andi (`227006001`), klik **Lihat Transkrip**.
   - *Tunjukkan hasilnya:* Nilai Keamanan Informasi (IF301) kini otomatis muncul di transkrip Andi, lengkap dengan SKS (3 SKS), nilai huruf (A), dan IPK (4.00) yang terhitung otomatis.
   > *"Proses sinkronisasi antar-service melalui gateway dengan token service berhasil 100%."*

---

## ⏱️ BAGIAN 6: KEBUTUHAN 4.4 – AUDIT LOGGING & TEST SUITE OTOMATIS
- **Target Waktu:** Menit 07:15 – 08:15 (Durasi: ~60 detik)
- **Fokus Layar:** Browser tab **PEP Audit Logs**, file `audit.log` di VS Code, dan Terminal Git Bash.

### 📌 STEP-BY-STEP TINDAKAN:
1. Di browser, login sebagai Admin (`admin1`).
2. Klik tab **PEP Audit Logs (Real-time)**.
3. Di VS Code, buka file `audit.log`.
4. Di terminal Git Bash, jalankan perintah `npm test`.

### 🗣️ APA YANG HARUS DIJELASKAN (NASKAH BICARA):
> *"Bagian 4.4 mewajibkan gateway mencatat audit log atas setiap keputusan akses yang diambil.*
> *Di tab PEP Audit Logs, kita dapat melihat riwayat lengkap secara transparan:*
> - *Mencatat waktu presisi.*
> - *Keputusan apakah **ALLOW** atau **DENY**.*
> - *Subjek pengguna dan perannya.*
> - *Device ID yang digunakan.*
> - *Endpoint dan method HTTP.*
> - *Serta alasan detail kebijakan mengapa request tersebut diizinkan atau ditolak.*
>
> *Perhatikan baris-baris merah DENY yang tercatat saat kita tadi mencoba menggunakan Device ID asing, mencoba mengubah nilai di luar jam kerja, dan mencoba mengintip transkrip orang lain.*
> *Catatan ini juga ditulis secara persisten ke file `audit.log` di server.*
>
> *Sebagai penutup pengujian teknis, kami telah menyiapkan test suite otomatis yang menguji seluruh skenario Zero Trust secara menyeluruh. Mari kita jalankan di terminal:"*

### 💻 EKSEKUSI DI TERMINAL (DEMO 5):
Ketik dan jalankan perintah:
```bash
npm test
```
Tunggu hingga pengujian selesai (± 2 detik) dan layar menampilkan hasil:
```
======================================================
TEST SUMMARY: 23 PASSED, 0 FAILED
======================================================
```
> *"Dapat kita lihat, seluruh 23 skenario pengujian mulai dari direct access blocking, token verification, device check, access hours, ABAC data isolation, class finalization, hingga audit logging lolos seratus persen tanpa ada kegagalan."*

---

## ⏱️ BAGIAN 7: KESIMPULAN & PENUTUP
- **Target Waktu:** Menit 08:15 – 08:45 (Durasi: ~30 detik)
- **Fokus Layar:** Halaman utama dashboard web `http://localhost:3000`.

### 🗣️ NASKAH BICARA:
> *"Sebagai kesimpulan, sistem yang dibangun telah berhasil menerapkan arsitektur Zero Trust Security sesuai standar NIST SP 800-207:*
> 1. *API Gateway bertindak sebagai Policy Enforcement Point tunggal.*
> 2. *Service resource internal terlindungi dengan gateway secret dan verifikasi ulang token mandiri.*
> 3. *Verifikasi konteks diterapkan melalui Device ID dan pembatasan jam operasional.*
> 4. *Kontrol akses data menggunakan prinsip Least Privilege berbasis kepemilikan data (ABAC).*
> 5. *Komunikasi antar-service diamankan dengan service token khusus.*
> 6. *Seluruh aktivitas diawasi melalui audit trail yang komprehensif.*
>
> *Sekian demonstrasi tugas praktikum individu Keamanan Informasi dari saya. Terima kasih atas perhatian Bapak/Ibu dosen dan rekan-rekan sekalian. Wassalamu’alaikum warahmatullahi wabarakatuh."*

---

## 🎯 DAFTAR PERIKSA KELENGKAPAN SEBELUM UPLOAD VIDEO:
- [ ] Durasi video berada di antara **6 sampai 9 menit**.
- [ ] Suara rekaman jelas, tidak ada dengung atau noise berlebih.
- [ ] Resolusi rekaman tajam (minimal 720p atau 1080p agar teks kode terbaca).
- [ ] Seluruh 4 kebutuhan pada Bagian 4 dokumen tugas tertampilkan dan terjelaskan kodenya.
- [ ] Link repository GitHub dicantumkan di deskripsi video atau lembar pengumpulan tugas.
