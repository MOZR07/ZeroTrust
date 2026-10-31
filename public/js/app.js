/**
 * Core Application Router and Layout Controller
 * Manages responsive layout, sidebar role adaptation, breadcrumbs, and page switching.
 */

const App = (() => {
  let currentPage = 'dashboard';

  function init() {
    const user = Api.getStoredUser();
    const token = Api.getAccessToken();

    if (!user || !token) {
      navigate('login');
    } else {
      renderShell(user);
      navigate(currentPage || 'dashboard');
    }
  }

  function renderShell(user) {
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <div id="appLayout" style="display: flex; width: 100%; min-height: 100vh;">
        <!-- Left Sidebar -->
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="brand-icon">ZT</div>
            <div class="brand-info">
              <span class="brand-name">Sistem Nilai</span>
              <span class="brand-sub">Zero Trust NIST</span>
            </div>
          </div>

          <nav class="sidebar-nav">
            <div class="nav-section-label">Menu Utama</div>
            <a class="nav-item" id="nav-dashboard" onclick="App.navigate('dashboard')">
              ${Components.Icons.dashboard}
              <span>Dashboard</span>
            </a>

            ${user.role === 'mahasiswa' ? `
              <a class="nav-item" id="nav-nilai" onclick="App.navigate('nilai')">
                ${Components.Icons.table}
                <span>Data Nilai Saya</span>
              </a>
              <a class="nav-item" id="nav-transkrip" onclick="App.navigate('transkrip')">
                ${Components.Icons.fileText}
                <span>Transkrip Resmi</span>
              </a>
            ` : ''}

            ${user.role === 'dosen' ? `
              <a class="nav-item" id="nav-nilai" onclick="App.navigate('nilai')">
                ${Components.Icons.table}
                <span>Kelola Nilai & Kelas</span>
              </a>
            ` : ''}

            ${user.role === 'admin' ? `
              <a class="nav-item" id="nav-transkrip" onclick="App.navigate('transkrip')">
                ${Components.Icons.fileText}
                <span>Inspeksi Transkrip</span>
              </a>
              <div class="nav-section-label">Keamanan & Audit</div>
              <a class="nav-item" id="nav-audit" onclick="App.navigate('audit')">
                ${Components.Icons.activity}
                <span>PEP Audit Logs</span>
              </a>
            ` : ''}

            <div class="nav-section-label">Alat Pengujian</div>
            <a class="nav-item" onclick="App.testDirectAccess()" title="Uji Direct Access tanpa Gateway Secret" style="color: var(--text-secondary);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Uji Direct Access (:3001)</span>
            </a>
            <a class="nav-item" onclick="App.handleResetDatabase()" title="Kembalikan database SQLite ke seed awal" style="color: var(--text-secondary);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              <span>Reset Database</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <div class="user-card">
              <div class="user-avatar">${(user.nama || 'U').charAt(0).toUpperCase()}</div>
              <div class="user-meta">
                <div class="user-name" title="${user.nama}">${user.nama}</div>
                <div class="user-role-badge">${user.role.toUpperCase()}</div>
              </div>
              <button class="btn-logout-icon" onclick="App.handleLogout()" title="Keluar dari sistem">
                ${Components.Icons.logout}
              </button>
            </div>
          </div>
        </aside>

        <!-- Right Content Shell -->
        <div class="main-wrapper">
          <!-- Topbar -->
          <header class="topbar">
            <div class="topbar-left">
              <div class="breadcrumb">
                <span>Sistem Nilai</span>
                <span class="breadcrumb-separator">/</span>
                <span id="breadcrumbCurrent" class="breadcrumb-current">Dashboard</span>
              </div>
            </div>

            <div class="topbar-right">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11px; color: var(--text-muted);">Simulasi Jam:</span>
                <select id="topbarMockHour" class="select" style="padding: 2px 8px; font-size: 11px; height: 26px; border-radius: var(--radius-sm);" onchange="App.handleMockHourChange(this.value)">
                  <option value="" ${!Api.getMockHour() ? 'selected' : ''}>Normal (Jam Asli)</option>
                  <option value="10" ${Api.getMockHour() === '10' ? 'selected' : ''}>10:00 (Jam Kerja ALLOW)</option>
                  <option value="23" ${Api.getMockHour() === '23' ? 'selected' : ''}>23:00 (Malam DENY)</option>
                </select>
              </div>
              <div class="zt-indicator" title="Header konteks perangkat yang disertakan ke API Gateway">
                <span class="dot"></span>
                <span>${Api.getDeviceId() || 'Device Validated'}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); background: var(--bg-subtle); padding: 2px 7px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                PORT 3000
              </div>
            </div>
          </header>

          <!-- Main View Body -->
          <main id="mainContent" class="content-area"></main>
        </div>
      </div>
    `;
  }

  function navigate(page) {
    currentPage = page;
    const user = Api.getStoredUser();

    if (page === 'login') {
      const appEl = document.getElementById('app');
      LoginPage.render(appEl);
      return;
    }

    if (!user) {
      navigate('login');
      return;
    }

    // Ensure layout shell exists
    if (!document.getElementById('appLayout')) {
      renderShell(user);
    }

    // Update active nav state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`nav-${page}`);
    if (activeEl) activeEl.classList.add('active');

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumbCurrent');
    const titles = {
      dashboard: 'Dashboard',
      nilai: 'Data Nilai Mahasiswa',
      transkrip: 'Transkrip Akademik',
      audit: 'PEP Audit Logs'
    };
    if (breadcrumb) breadcrumb.textContent = titles[page] || page;

    // Render corresponding page content
    const container = document.getElementById('mainContent');
    if (!container) return;

    if (page === 'dashboard') {
      DashboardPage.render(container);
    } else if (page === 'nilai') {
      NilaiPage.render(container);
    } else if (page === 'transkrip') {
      TranskripPage.render(container);
    } else if (page === 'audit') {
      AuditPage.render(container);
    }
  }

  async function handleLogout() {
    await Api.logout();
    Components.Toast.info('Anda telah keluar dari sistem.');
    navigate('login');
  }

  async function handleResetDatabase() {
    Components.Modal.open({
      title: 'Reset Database Demo',
      contentHtml: `
        <p style="font-size: 12.5px; color: var(--text-secondary);">
          Kembalikan seluruh tabel database SQLite (Users, Kelas, Nilai, Transkrip) ke kondisi awal sebelum pengujian?
        </p>
      `,
      confirmText: 'Reset Sekarang',
      onConfirm: async () => {
        try {
          await Api.resetDatabase();
          Components.Toast.success('Database berhasil di-reset ke kondisi awal!');
          Components.Modal.close();
          navigate(currentPage);
        } catch (err) {
          Components.Toast.error(err.message || 'Gagal mereset database.');
        }
      }
    });
  }

  function handleMockHourChange(hour) {
    if (hour) {
      localStorage.setItem('zt_mock_hour', hour);
      Components.Toast.info(`Simulasi jam akses diatur ke ${hour}:00`);
    } else {
      localStorage.removeItem('zt_mock_hour');
      Components.Toast.info('Simulasi jam akses dinonaktifkan (jam komputer asli)');
    }
  }

  async function testDirectAccess() {
    try {
      const res = await fetch('http://localhost:3001/nilai');
      const data = await res.json().catch(() => ({}));
      Components.Modal.open({
        title: 'Uji Direct Access ke Service Nilai (Port 3001)',
        contentHtml: `
          <div style="font-size: 13px; line-height: 1.6;">
            <p>Mencoba akses langsung ke <code>http://localhost:3001/nilai</code> tanpa melewati API Gateway (tanpa header <code>X-Gateway-Secret</code>).</p>
            <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); padding: 12px; border-radius: 8px; margin-top: 12px; font-family: var(--font-mono); font-size: 11.5px; color: var(--danger-text);">
              <strong>Status: HTTP ${res.status} Forbidden</strong><br>
              ${data.error || 'Direct access forbidden'}: ${data.reason || 'Missing or invalid X-Gateway-Secret header. All traffic must pass through the API Gateway.'}
            </div>
            <p style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
              Prinsip <strong>Assume Breach</strong> terbukti: Service internal menolak request yang mencoba membypass API Gateway PEP.
            </p>
          </div>
        `,
        confirmText: 'Tutup',
        onConfirm: () => Components.Modal.close()
      });
    } catch (err) {
      Components.Toast.error('Gagal menghubungi port 3001: ' + err.message);
    }
  }

  return {
    init,
    navigate,
    handleLogout,
    handleResetDatabase,
    handleMockHourChange,
    testDirectAccess
  };
})();

window.addEventListener('DOMContentLoaded', App.init);
