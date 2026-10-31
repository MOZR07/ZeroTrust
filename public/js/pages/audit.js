/**
 * Audit Log Page Module
 * Primary demonstration interface for NIST SP 800-207 Zero Trust evaluation.
 * Real-time inspection of ALLOW and DENY decisions with granular policy reasons.
 */

const AuditPage = (() => {
  let cachedLogs = [];
  let filterDecision = 'all';
  let searchQuery = '';

  async function render(container) {
    const user = Api.getStoredUser();
    if (!user) {
      App.navigate('login');
      return;
    }

    if (user.role !== 'admin') {
      container.innerHTML = `
        <div class="card" style="padding: 40px; text-align: center;">
          <div style="color: var(--danger-text); font-weight: 600; font-size: 15px;">Akses Dibatasi — Prinsip Least Privilege</div>
          <p style="color: var(--text-secondary); font-size: 12.5px; margin-top: 6px; max-width: 480px; margin-left: auto; margin-right: auto;">
            Halaman PEP Audit Logs hanya dapat diakses oleh peran <strong>admin</strong>. Peran Anda (${user.role}) tidak memiliki izin membaca catatan audit keamanan.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Policy Enforcement Point (PEP) Audit Logs</h2>
          <p class="page-description">Catatan keputusan evaluasi akses real-time dari Policy Engine (NIST SP 800-207).</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="AuditPage.loadLogs()">Muat Ulang Log</button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-filters">
            <div class="search-box" style="width: 280px;">
              <span class="search-icon">${Components.Icons.search}</span>
              <input type="text" class="input" placeholder="Cari subjek, endpoint, atau device..." oninput="AuditPage.handleSearch(this.value)">
            </div>
            <select class="select" onchange="AuditPage.handleFilter(this.value)">
              <option value="all">Semua Keputusan</option>
              <option value="ALLOW">Keputusan ALLOW (Diizinkan)</option>
              <option value="DENY">Keputusan DENY (Ditolak)</option>
            </select>
          </div>
          <span id="auditCountBadge" class="badge badge-neutral">Memuat catatan log...</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 140px;">Waktu</th>
              <th style="width: 90px;">Keputusan</th>
              <th>Subjek (Role)</th>
              <th>Device ID</th>
              <th>Method & Endpoint</th>
              <th>Alasan Kebijakan PEP</th>
            </tr>
          </thead>
          <tbody id="auditTableBody">
            ${Components.Skeleton.tableRows(6, 6)}
          </tbody>
        </table>
      </div>
    `;

    await loadLogs();
  }

  async function loadLogs() {
    const tbody = document.getElementById('auditTableBody');
    const badge = document.getElementById('auditCountBadge');

    try {
      const res = await Api.getAuditLogs();
      cachedLogs = res.logs || [];
      renderTable();
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 28px; color: var(--danger-text);">
            <div style="font-weight: 600;">Gagal memuat catatan audit</div>
            <div style="font-size: 11.5px; margin-top: 4px;">${err.message}</div>
          </td>
        </tr>
      `;
      if (badge) badge.textContent = '0 Log';
    }
  }

  function renderTable() {
    const tbody = document.getElementById('auditTableBody');
    const badge = document.getElementById('auditCountBadge');

    let filtered = cachedLogs.filter(item => {
      if (filterDecision !== 'all' && item.decision !== filterDecision) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const sub = (item.subject || '').toLowerCase();
        const ep = (item.endpoint || '').toLowerCase();
        const dev = (item.device_id || '').toLowerCase();
        const rsn = (item.reason || '').toLowerCase();
        return sub.includes(q) || ep.includes(q) || dev.includes(q) || rsn.includes(q);
      }
      return true;
    });

    if (badge) badge.textContent = `${filtered.length} Catatan Log`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
            Tidak ada catatan audit yang cocok dengan kriteria pencarian.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const isAllow = item.decision === 'ALLOW';
      return `
        <tr style="cursor: pointer;" onclick="AuditPage.showDetail(${item.id})" title="Klik untuk rincian konteks audit">
          <td style="font-size: 11.5px; font-family: var(--font-mono); color: var(--text-muted);">${item.timestamp}</td>
          <td>${Components.Badge.decision(item.decision)}</td>
          <td>
            <strong>${item.subject}</strong>
            <span style="font-size: 10.5px; color: var(--text-muted); margin-left: 2px;">(${item.role})</span>
          </td>
          <td><code style="font-family: var(--font-mono); font-size: 11.5px;">${item.device_id || '-'}</code></td>
          <td>
            <code style="font-family: var(--font-mono); font-size: 11.5px; font-weight: 600;">${item.method}</code>
            <span style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-secondary); margin-left: 4px;">${item.endpoint}</span>
          </td>
          <td style="font-size: 12px; color: ${isAllow ? 'var(--text-secondary)' : 'var(--danger-text)'};">
            ${item.reason}
          </td>
        </tr>
      `;
    }).join('');
  }

  function showDetail(logId) {
    const item = cachedLogs.find(l => l.id === logId);
    if (!item) return;

    Components.Modal.open({
      title: `Detail Audit Log #${item.id}`,
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12.5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
            <span style="color: var(--text-muted);">Keputusan Akses:</span>
            <span>${Components.Badge.decision(item.decision)}</span>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">WAKTU PERMINTAAN:</span>
            <div style="font-family: var(--font-mono); margin-top: 2px;">${item.timestamp}</div>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">SUBJEK & ROLE:</span>
            <div style="margin-top: 2px;"><strong>${item.subject}</strong> (${item.role})</div>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">PERANGKAT (DEVICE ID):</span>
            <div style="font-family: var(--font-mono); margin-top: 2px;">${item.device_id || 'Tidak menyertakan header X-Device-ID'}</div>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">RESOURCE ENDPOINT:</span>
            <div style="font-family: var(--font-mono); margin-top: 2px;"><strong>${item.method}</strong> ${item.endpoint}</div>
          </div>
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">EVALUASI KEBIJAKAN PEP:</span>
            <div style="margin-top: 4px; padding: 10px; background: var(--bg-subtle); border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 11.5px; color: ${item.decision === 'ALLOW' ? 'var(--text-primary)' : 'var(--danger-text)'};">
              ${item.reason}
            </div>
          </div>
        </div>
      `,
      confirmText: 'Tutup',
      onConfirm: () => Components.Modal.close()
    });
  }

  function handleSearch(val) {
    searchQuery = val.trim();
    renderTable();
  }

  function handleFilter(val) {
    filterDecision = val;
    renderTable();
  }

  return {
    render,
    loadLogs,
    showDetail,
    handleSearch,
    handleFilter
  };
})();
