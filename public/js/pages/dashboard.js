/**
 * Dashboard Page Module
 * Tailored views for Mahasiswa, Dosen, and Admin with live backend metrics.
 */

const DashboardPage = (() => {
  async function render(container) {
    const user = Api.getStoredUser();
    if (!user) {
      App.navigate('login');
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Ringkasan Aktivitas</h2>
          <p class="page-description">Selamat datang kembali, ${user.nama}. Anda terhubung dengan peran <strong>${user.role}</strong>.</p>
        </div>
      </div>
      <div id="dashboardContent">
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="skeleton" style="height: 100px; width: 100%;"></div>
          <div class="skeleton" style="height: 260px; width: 100%;"></div>
        </div>
      </div>
    `;

    try {
      if (user.role === 'mahasiswa') {
        await renderMahasiswa(document.getElementById('dashboardContent'), user);
      } else if (user.role === 'dosen') {
        await renderDosen(document.getElementById('dashboardContent'), user);
      } else if (user.role === 'admin') {
        await renderAdmin(document.getElementById('dashboardContent'), user);
      }
    } catch (err) {
      document.getElementById('dashboardContent').innerHTML = `
        <div class="card" style="padding: 24px; text-align: center; color: var(--danger-text);">
          <p style="font-weight: 600;">Gagal memuat metrik dashboard</p>
          <p style="font-size: 12px; margin-top: 4px;">${err.message}</p>
        </div>
      `;
    }
  }

  async function renderMahasiswa(target, user) {
    const res = await Api.getNilai();
    const items = res.data || [];
    const totalSks = items.reduce((acc, cur) => acc + (cur.sks || 0), 0);
    const finalCount = items.filter(i => i.is_final === 1).length;

    target.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">NIM Mahasiswa</div>
          <div class="stat-value" style="font-size: 18px; font-family: var(--font-mono);">${user.identifier}</div>
          <div class="stat-desc">Identitas terverifikasi Zero Trust</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Mata Kuliah Diambil</div>
          <div class="stat-value">${items.length}</div>
          <div class="stat-desc">Total ${totalSks} SKS semester berjalan</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Status Finalisasi Nilai</div>
          <div class="stat-value">${finalCount} / ${items.length}</div>
          <div class="stat-desc">${items.length - finalCount} mata kuliah masih berstatus DRAFT</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Daftar Nilai Semester Ini</h3>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('transkrip')">Buka Transkrip Resmi</button>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table>
            <thead>
              <tr>
                <th style="width: 100px;">Kode</th>
                <th>Mata Kuliah</th>
                <th class="text-center" style="width: 70px;">SKS</th>
                <th class="text-center" style="width: 110px;">Nilai Angka</th>
                <th class="text-center" style="width: 80px;">Huruf</th>
                <th class="text-center" style="width: 110px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${items.length === 0 ? `<tr><td colspan="6" style="text-align: center; padding: 24px;">Belum ada nilai terdaftar.</td></tr>` : 
                items.map(item => `
                  <tr>
                    <td><code style="font-family: var(--font-mono); font-weight: 600;">${item.kode_mk}</code></td>
                    <td><strong>${item.nama_mk}</strong></td>
                    <td class="text-center">${item.sks}</td>
                    <td class="text-center"><strong style="color: var(--text-primary);">${item.nilai_angka !== null ? item.nilai_angka : '-'}</strong></td>
                    <td class="text-center"><span class="badge-grade">${item.nilai_huruf || '-'}</span></td>
                    <td class="text-center">${Components.Badge.finalStatus(item.is_final === 1)}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderDosen(target, user) {
    const res = await Api.getNilai();
    const items = res.data || [];
    
    // Group by class
    const classesMap = {};
    items.forEach(i => {
      if (!classesMap[i.kelas_id]) {
        classesMap[i.kelas_id] = {
          id: i.kelas_id,
          kode_mk: i.kode_mk,
          nama_mk: i.nama_mk,
          sks: i.sks,
          students: [],
          draftCount: 0,
          finalCount: 0
        };
      }
      classesMap[i.kelas_id].students.push(i);
      if (i.is_final === 1) classesMap[i.kelas_id].finalCount++;
      else classesMap[i.kelas_id].draftCount++;
    });

    const classList = Object.values(classesMap);
    const totalStudents = items.length;
    const totalDraft = items.filter(i => i.is_final === 0).length;

    target.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">NIP Dosen Pengampu</div>
          <div class="stat-value" style="font-size: 18px; font-family: var(--font-mono);">${user.identifier}</div>
          <div class="stat-desc">Dosen Aktif Universitas Siliwangi</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Kelas yang Diampu</div>
          <div class="stat-value">${classList.length}</div>
          <div class="stat-desc">Mengampu total ${totalStudents} mahasiswa</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Nilai Belum Final (Draft)</div>
          <div class="stat-value" style="color: ${totalDraft > 0 ? 'var(--warning-text)' : 'var(--text-primary)'};">${totalDraft}</div>
          <div class="stat-desc">Memerlukan finalisasi sebelum sinkron</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Kelas Kuliah Diampu</h3>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('nilai')">Kelola Seluruh Nilai</button>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table>
            <thead>
              <tr>
                <th>Kelas ID</th>
                <th>Kode & Nama MK</th>
                <th>SKS</th>
                <th>Mahasiswa</th>
                <th>Progress Nilai</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${classList.length === 0 ? `<tr><td colspan="6" style="text-align: center; padding: 24px;">Tidak ada kelas yang diampu.</td></tr>` :
                classList.map(k => `
                  <tr>
                    <td>#${k.id}</td>
                    <td><strong>${k.kode_mk}</strong> — ${k.nama_mk}</td>
                    <td>${k.sks} SKS</td>
                    <td>${k.students.length} Mahasiswa</td>
                    <td>
                      <span class="badge ${k.draftCount === 0 ? 'badge-success' : 'badge-warning'}">
                        ${k.draftCount === 0 ? 'Semua Final' : `${k.draftCount} Draft`}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="App.navigate('nilai')">Buka Nilai</button>
                    </td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderAdmin(target, user) {
    const res = await Api.getAuditLogs();
    const logs = res.logs || [];
    const allowCount = logs.filter(l => l.decision === 'ALLOW').length;
    const denyCount = logs.filter(l => l.decision === 'DENY').length;

    target.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Permintaan Audit Terakhir</div>
          <div class="stat-value">${logs.length}</div>
          <div class="stat-desc">Dicatat Policy Enforcement Point</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Akses Diberikan (ALLOW)</div>
          <div class="stat-value" style="color: #065F46;">${allowCount}</div>
          <div class="stat-desc">Memenuhi semua parameter kebijakan</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Akses Ditolak (DENY)</div>
          <div class="stat-value" style="color: #991B1B;">${denyCount}</div>
          <div class="stat-desc">Dicegat oleh Policy Engine NIST SP 800-207</div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <h3 class="card-title">Status Arsitektur Microservices Zero Trust</h3>
        </div>
        <div class="card-body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">GATEWAY PEP :3000</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; font-weight: 600; font-size: 13px;">
              <span class="zt-indicator"><span class="dot"></span> Online</span>
              <span>Express Gateway</span>
            </div>
          </div>
          <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">SERVICE NILAI :3001</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; font-weight: 600; font-size: 13px;">
              <span class="zt-indicator"><span class="dot"></span> Online</span>
              <span>Resource Microservice</span>
            </div>
          </div>
          <div style="border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">SERVICE TRANSKRIP :3002</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; font-weight: 600; font-size: 13px;">
              <span class="zt-indicator"><span class="dot"></span> Online</span>
              <span>Cumulative Record</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Aktivitas Keamanan Terbaru</h3>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('audit')">Buka Seluruh Audit Trail</button>
        </div>
        <div class="table-container" style="border: none; border-radius: 0;">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Keputusan</th>
                <th>Subjek</th>
                <th>Device ID</th>
                <th>Endpoint</th>
                <th>Alasan Kebijakan PEP</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">Belum ada catatan aktivitas keamanan.</td></tr>
              ` : logs.slice(0, 5).map(l => `
                <tr>
                  <td style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">${l.timestamp}</td>
                  <td>${Components.Badge.decision(l.decision)}</td>
                  <td><strong>${l.subject}</strong> <span style="font-size: 10px; color: var(--text-muted);">(${l.role})</span></td>
                  <td><code>${l.device_id || '-'}</code></td>
                  <td><code>${l.method} ${l.endpoint}</code></td>
                  <td style="font-size: 11.5px; color: ${l.decision === 'ALLOW' ? 'var(--text-secondary)' : 'var(--danger-text)'};">${l.reason}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return {
    render
  };
})();
