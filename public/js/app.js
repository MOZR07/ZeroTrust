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
            <a class="nav-item" id="nav-nilai" onclick="App.navigate('nilai')">
              ${Components.Icons.table}
              <span>Data Nilai</span>
            </a>
            <a class="nav-item" id="nav-transkrip" onclick="App.navigate('transkrip')">
              ${Components.Icons.fileText}
              <span>Transkrip</span>
            </a>

            ${user.role === 'admin' ? `
              <div class="nav-section-label">Keamanan & Audit</div>
              <a class="nav-item" id="nav-audit" onclick="App.navigate('audit')">
                ${Components.Icons.activity}
                <span>PEP Audit Logs</span>
              </a>
            ` : ''}

            <div class="nav-section-label">Aksi Cepat Demo</div>
            <a class="nav-item" onclick="App.handleResetDatabase()" title="Kembalikan database SQLite ke seed awal">
              ${Components.Icons.lock}
              <span>Reset Database</span>
            </a>
          </nav>

          <div class="sidebar-footer">
            <div class="user-card">
              <div class="user-avatar">${(user.nama || 'U').charAt(0)}</div>
              <div class="user-meta">
                <div class="user-name" title="${user.nama}">${user.nama}</div>
                <div class="user-role-badge">${user.role.toUpperCase()}</div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="App.handleLogout()" style="width: 100%; justify-content: center;">
              ${Components.Icons.logout}
              <span>Keluar</span>
            </button>
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
              <div class="zt-indicator" title="Header konteks perangkat yang disertakan ke API Gateway">
                <span class="dot"></span>
                <span>${Api.getDeviceId() || 'Device Validated'}</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                PORT: 3000
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

  return {
    init,
    navigate,
    handleLogout,
    handleResetDatabase
  };
})();

window.addEventListener('DOMContentLoaded', App.init);
