/**
 * Login Page Module
 * Minimalist clean login with quick preset personas for demo presentation.
 */

const LoginPage = (() => {
  function render(container) {
    container.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <div class="brand-icon">ZT</div>
            <h1 class="login-title">Sistem Nilai Akademik</h1>
            <p class="login-subtitle">Arsitektur Keamanan Zero Trust (NIST SP 800-207)</p>
          </div>

          <form id="formLogin" onsubmit="LoginPage.handleSubmit(event)">
            <div class="field">
              <label for="loginUsername">Username</label>
              <input type="text" id="loginUsername" class="input" placeholder="Masukkan username" required autofocus>
            </div>

            <div class="field">
              <label for="loginPassword">Password</label>
              <input type="password" id="loginPassword" class="input" value="password123" required>
            </div>

            <div class="field">
              <label for="loginDevice">X-Device-ID (Konteks Perangkat)</label>
              <input type="text" id="loginDevice" class="input" placeholder="Contoh: DEV-MHS-ANDI" required>
            </div>

            <div class="field">
              <label for="loginMockHour">Simulasi Jam Operasional (Opsional)</label>
              <select id="loginMockHour" class="select">
                <option value="">Normal (Sesuai Jam Komputer)</option>
                <option value="10">Pukul 10:00 (Jam Kerja 07:00–21:00)</option>
                <option value="23">Pukul 23:00 (Di Luar Jam Kerja - Policy Deny)</option>
              </select>
            </div>

            <button type="submit" id="btnLoginSubmit" class="btn btn-primary" style="width: 100%; margin-top: 8px;">
              Masuk ke Sistem
            </button>
          </form>

          <div class="login-presets">
            <div class="preset-title">
              <span>Akun Demo Cepat (1-Klik Isi)</span>
              <span style="font-weight: 400; text-transform: none;">Pass: password123</span>
            </div>
            <div class="preset-pills">
              <button class="preset-pill" onclick="LoginPage.fill('mhs_andi', 'DEV-MHS-ANDI')">Andi (Mahasiswa)</button>
              <button class="preset-pill" onclick="LoginPage.fill('mhs_rani', 'DEV-MHS-RANI')">Rani (Mahasiswa)</button>
              <button class="preset-pill" onclick="LoginPage.fill('mhs_cahyo', 'DEV-MHS-CAHYO')">Cahyo (Mahasiswa)</button>
              <button class="preset-pill" onclick="LoginPage.fill('dosen_budi', 'DEV-DOSEN-BUDI')">Dr. Budi (Dosen IF301)</button>
              <button class="preset-pill" onclick="LoginPage.fill('dosen_siti', 'DEV-DOSEN-SITI')">Siti M.Kom (Dosen IF302)</button>
              <button class="preset-pill" onclick="LoginPage.fill('admin1', 'DEV-ADMIN-01')">Admin Sistem</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function fill(username, deviceId) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = 'password123';
    document.getElementById('loginDevice').value = deviceId;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnLoginSubmit');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const deviceId = document.getElementById('loginDevice').value.trim();
    const mockHour = document.getElementById('loginMockHour').value;

    if (mockHour) {
      localStorage.setItem('zt_mock_hour', mockHour);
    } else {
      localStorage.removeItem('zt_mock_hour');
    }

    btn.disabled = true;
    btn.textContent = 'Memverifikasi Identitas...';

    try {
      const data = await Api.login(username, password, deviceId);
      Components.Toast.success(`Otentikasi berhasil! Selamat datang, ${data.user.nama}`);
      App.navigate('dashboard');
    } catch (err) {
      Components.Toast.error(err.message || 'Login gagal.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Masuk ke Sistem';
    }
  }

  return {
    render,
    fill,
    handleSubmit
  };
})();
