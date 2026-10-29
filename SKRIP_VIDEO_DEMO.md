# SKRIP VIDEO DEMO PRAKTIKUM ZERO TRUST SECURITY (NIST SP 800-207)
**Durasi:** 7–8 Menit (Sesuai Ketentuan PDF: 6–9 Menit)  
**Mata Kuliah:** Keamanan Informasi (KP70065004) · Informatika Universitas Siliwangi  
**Aplikasi:** Sistem Nilai & Transkrip Berbasis Zero Trust  
**URL Frontend:** `http://localhost:3000`

---

## 📋 PERSIAPAN SEBELUM RECORDING
1. Buka 3 jendela di layar:
   - **Kiri:** VS Code (menampilkan folder proyek: `gateway/`, `services/`, `database/`).
   - **Kanan Atas:** Browser membuka `http://localhost:3000`.
   - **Kanan Bawah:** Terminal Git Bash.
2. Pastikan database dalam kondisi segar:
   ```bash
   npm run seed
   ```
3. Pastikan server running:
   ```bash
   npm start
   ```

---

## ⏱️ TIMELINE & NASKAH LENGKAP DEMO

---

### MENIT 00:00 – 01:00 | 1. Pembukaan & Arsitektur Sistem (NIST SP 800-207)
- **Tampilan Layar:** Tampilkan diagram arsitektur di `README.md` dan struktur folder VS Code.
- **Naskah:**
  > "Halo semuanya. Nama saya [Nama Anda], NIM [NIM Anda]. Hari ini saya akan mendemonstrasikan tugas praktikum Keamanan Informasi mengenai penerapan arsitektur **Zero Trust Security** berbasis dokumen **NIST SP 800-207** pada Sistem Nilai Universitas Siliwangi.
  >
  > Sistem ini dibangun dengan prinsip utama:
  > 1. **Never Trust, Always Verify:** Setiap request wajib diautentikasi dan diotorisasi tanpa memandang lokasi jaringan.
  > 2. **Least Privilege:** Akses dibatasi seketat mungkin sesuai peran dan kepemilikan data.
  > 3. **Assume Breach:** Service internal mengasumsikan perimeter sudah ditembus sehingga tetap memverifikasi token dan secret.
  >
  > Arsitektur terdiri dari 3 service:
  > - **Port 3000:** API Gateway sebagai Policy Enforcement Point (PEP) dan Policy Engine.
  > - **Port 3001:** Service Nilai sebagai Resource Server.
  > - **Port 3002:** Service Transkrip sebagai Resource Server.
  > Keduanya terhubung ke satu database bersama SQLite."

---

### MENIT 01:00 – 02:30 | 2. Kebutuhan 4.1: Autentikasi, Token & Verifikasi Ulang Service
- **Tampilan Layar:** 
  1. Buka file `gateway/policy.js` (tunjukkan fungsi `generateAccessToken`, `generateRefreshToken`, `generateServiceToken`).
  2. Buka file `services/verifyResource.js` (tunjukkan cek `X-Gateway-Secret` dan `jwt.verify`).
  3. Beralih ke terminal untuk eksekusi cURL bypass.
- **Naskah:**
  > "Mari kita bedah kebutuhan pertama pada bagian 4.1.
  > Di file `gateway/policy.js`, sistem menerbitkan **Access Token JWT berdurasi 10 menit** berisi `sub` dan `role`. Disediakan juga **Refresh Token** berdurasi 1 hari yang disimpan di SQLite agar dapat dicabut saat logout.
  >
  > Untuk mencegah bypass, gateway menyisipkan header rahasia `X-Gateway-Secret` saat meneruskan request.
  > Di file `services/verifyResource.js`, service resource menerapkan prinsip *Assume Breach*. Service memeriksa dua lapis:
  > Pertama: apakah ada header `X-Gateway-Secret`? Jika tidak ada, request ditolak 403.
  > Kedua: service memverifikasi ulang keaslian dan masa berlaku tanda tangan JWT secara independen. Jika token tidak valid, ditolak 401.
  >
  > Mari kita buktikan di terminal:"
- **Aksi Terminal:**
  1. Tes akses langsung ke Service Nilai (port 3001) mem-bypass gateway:
     ```bash
     curl -i http://localhost:3001/nilai
     ```
     *(Arahkan mouse ke respon: **HTTP/1.1 403 Forbidden - Direct access forbidden**)*
  2. Tes tembak pakai gateway secret tapi tanpa token JWT:
     ```bash
     curl -i http://localhost:3001/nilai -H "X-Gateway-Secret: super-secure-internal-gateway-secret-2026"
     ```
     *(Arahkan mouse ke respon: **HTTP/1.1 401 Unauthorized - Resource service requires Authorization Bearer token**)*
  > "Terbukti service tidak bisa ditembus langsung dari luar maupun dari dalam tanpa token valid."

---

### MENIT 02:30 – 04:00 | 3. Kebutuhan 4.3: Verifikasi Konteks (Device ID & Jam Akses)
- **Tampilan Layar:** Buka browser di `http://localhost:3000`. Tunjukkan form login dan dropdown simulasi jam akses.
- **Naskah:**
  > "Sekarang kita demonstrasikan Bagian 4.3: Verifikasi Konteks.
  > Zero Trust mewajibkan verifikasi lingkungan subjek:
  > Pertama, **Device ID Terdaftar**: setiap request user wajib membawa header `X-Device-ID`. Jika perangkat tidak terdaftar di database untuk user tersebut, akses ditolak.
  > Kedua, **Jam Akses**: perubahan dan finalisasi nilai hanya diizinkan pukul 07.00 sampai 21.00.
  >
  > Mari kita uji di UI:"
- **Aksi Browser:**
  1. Klik preset akun **Andi (Mahasiswa)**. Ganti kolom `Header X-Device-ID` menjadi `DEV-ASING-ILEGAL`.
  2. Klik tombol **Login & Minta Token**.
     *(Tunjukkan alert merah: **[DENY 403] Device 'DEV-ASING-ILEGAL' is not registered for user 'mhs_andi'**)*
  3. Kembalikan Device ID menjadi `DEV-MHS-ANDI`. Klik **Login**.
     *(Tunjukkan alert hijau: **Login Berhasil**, token payload tampil di panel kiri)*
  4. Sekarang uji Jam Akses: Klik preset **Dr. Budi (Dosen)**, klik **Login**.
  5. Ubah dropdown Simulasi Jam Akses menjadi **Jam 23:00 (Di Luar Jam Kerja)**.
  6. Klik tombol **Edit Nilai** pada baris nilai mahasiswa, masukkan angka `90`, klik OK.
     *(Tunjukkan alert merah: **[DENY 403] Access denied: Nilai updates are only permitted between 7:00 and 21:00**)*
  7. Ubah kembali dropdown ke **Jam 10:00 (Dalam Jam Kerja)**. Klik Edit Nilai lagi, masukkan `92`, klik OK.
     *(Tunjukkan alert hijau: **Nilai berhasil diupdate**)*
  > "Konteks perangkat asing dan jam di luar operasional berhasil dicegat oleh Policy Engine."

---

### MENIT 04:00 – 05:30 | 4. Kebutuhan 4.2: Kebijakan Akses (ABAC / Data Ownership)
- **Tampilan Layar:** Tunjukkan browser tab **Service Nilai** dan **Service Transkrip**, sesekali sorot `gateway/policy.js` (bagian ABAC query database).
- **Naskah:**
  > "Masuk ke Bagian 4.2: Kebijakan Akses berbasis kepemilikan data (ABAC). Token hanya membawa identitas; hak akses kepemilikan diputuskan Policy Engine dengan membaca database.
  >
  > Skenario 1: **Mahasiswa hanya bisa melihat nilainya sendiri**.
  > Kita login sebagai Andi (`mhs_andi`):"
- **Aksi Browser:**
  1. Klik preset **Andi**, klik Login.
  2. Lihat tabel nilai: hanya muncul nilai milik Andi (NIM 227006001). Tidak ada tombol edit nilai karena role mahasiswa *read-only*.
  3. Buka tab **Service Transkrip**. Input NIM Andi (`227006001`), klik **Lihat Transkrip**.
     *(Transkrip Andi tampil)*
  4. Coba ganti NIM menjadi milik Rani (`227006002`), klik **Lihat Transkrip**.
     *(Tunjukkan alert merah: **[DENY 403] Mahasiswa 'mhs_andi' can only access their own transcript**)*
  5. Sekarang uji Dosen lain: Login sebagai **Siti M.Kom (Dosen IF302)**.
  6. Di tabel nilai, coba klik edit pada nilai kelas IF301 milik Dr. Budi.
     *(Tunjukkan alert merah: **[DENY 403] Dosen 'dosen_siti' does not teach the class**)*
  7. Terakhir, login sebagai **Administrator Sistem (`admin1`)**.
  8. Buka tab Transkrip, cari NIM `227006001` lalu NIM `227006002`. Keduanya diizinkan karena Admin berhak melihat semua mahasiswa.

---

### MENIT 05:30 – 07:00 | 5. Finalisasi Kelas & Panggilan Antar-Service
- **Tampilan Layar:** Buka `services/nilai/client.js` di VS Code, lalu beralih ke browser tab Service Nilai.
- **Naskah:**
  > "Berikutnya adalah alur finalisasi nilai dan sinkronisasi antar-service.
  > Di file `services/nilai/client.js`: saat dosen memfinalisasi kelas, Service Nilai tidak memanggil database transkrip langsung. Sesuai prinsip Zero Trust, Service Nilai meminta **Token Service** ke Gateway via `POST /auth/service` menggunakan client ID dan secret. Token service ini berumur 5 menit dengan role `service`.
  > Setelah itu, Service Nilai memanggil Gateway pada endpoint `POST /transkrip/sinkron`. Endpoint ini strictly menolak token user manapun dan hanya menerima token ber-role service.
  >
  > Mari kita jalankan di browser:"
- **Aksi Browser:**
  1. Login sebagai **Dr. Budi (Dosen IF301)**.
  2. Klik tombol hijau: **Finalisasi Kelas IF301 (Dosen Budi)**, konfirmasi dialog OK.
     *(Tunjukkan respon sukses: Kelas berhasil difinalisasi dan tersinkron)*
  3. Perhatikan status nilai di tabel berubah menjadi badge biru **FINAL**, dan tombol edit terkunci.
  4. Coba panggil edit nilai secara paksa: sistem menolak karena status sudah final.
  5. Buka tab **Service Transkrip**, cek NIM Andi (`227006001`): nilai Keamanan Informasi (IF301) kini otomatis masuk ke transkrip beserta SKS dan kalkulasi IPK.

---

### MENIT 07:00 – 08:00 | 6. Kebutuhan 4.4: Audit Log & Uji Otomatis
- **Tampilan Layar:** Browser tab **PEP Audit Logs**, lalu file `audit.log` di VS Code, lalu terminal `npm test`.
- **Naskah:**
  > "Kebutuhan terakhir adalah Bagian 4.4: Audit Logging.
  > Seluruh keputusan PEP dicatat secara persisten ke tabel database `audit_logs` dan file teks `audit.log`.
  > Mari buka tab **PEP Audit Logs** di UI (login sebagai Admin):"
- **Aksi Browser & Terminal:**
  1. Klik tab **PEP Audit Logs**, klik Muat Ulang Log.
     *(Tunjukkan tabel log: terlihat timestamp, keputusan ALLOW/DENY, subject user, device ID, dan alasan kebijakan)*
  2. Buka file `audit.log` di VS Code untuk memperlihatkan log fisik yang tercatat.
  3. Terakhir, buka terminal dan jalankan test suite otomatis:
     ```bash
     npm test
     ```
     *(Biarkan test berjalan hingga muncul banner hijau: **23 PASSED, 0 FAILED**)*
  > "Seluruh 23 skenario uji otomatis dari grup 1 sampai grup 9 berhasil lolos 100%."

---

### MENIT 08:00 – 08:30 | 7. Penutup
- **Tampilan Layar:** Kembali ke tampilan browser utama `http://localhost:3000`.
- **Naskah:**
  > "Demikian demonstrasi tugas praktikum Zero Trust Security Sistem Nilai. Seluruh kebutuhan autentikasi, token, verifikasi konteks perangkat dan waktu, kontrol akses kepemilikan data, komunikasi aman antar-service, serta audit logging telah terimplementasi dan terverifikasi sepenuhnya sesuai standar NIST SP 800-207.
  > Terima kasih atas perhatiannya."

---

## 💡 TIPS REKAMAN:
- Gunakan OBS Studio atau Windows Game Bar (`Win + G`).
- Rekam resolusi 1080p dengan suara mic yang jelas.
- Jika ada salah bicara, jeda 2 detik lalu ulangi kalimat tersebut (mudah dipotong saat editing).
- Durasi naskah di atas berada tepat pada rentang **7 menit 30 detik**, sangat aman di dalam batas ketentuan **6–9 menit**.
