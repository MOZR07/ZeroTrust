/**
 * Transkrip Akademik Page Module
 * Displays verified cumulative transcript with IPK and SKS calculations.
 * Mahasiswa views self only; Admin can inspect any NIM.
 */

const TranskripPage = (() => {
  let targetNim = '';

  async function render(container) {
    const user = Api.getStoredUser();
    if (!user) {
      App.navigate('login');
      return;
    }

    const isAdmin = user.role === 'admin';
    const isMahasiswa = user.role === 'mahasiswa';
    targetNim = isMahasiswa ? user.identifier : (targetNim || '227006001');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Transkrip Akademik Kumulatif</h2>
          <p class="page-description">
            ${isMahasiswa ? 'Arsip transkrip resmi hasil sinkronisasi Service Nilai ke Service Transkrip.' : 'Inspeksi transkrip akademik mahasiswa berbasis evaluasi kebijakan PEP.'}
          </p>
        </div>

        ${isAdmin ? `
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="inpAdminTargetNim" class="input" style="width: 160px; font-family: var(--font-mono);" value="${targetNim}" placeholder="Ketik NIM Mahasiswa">
            <button class="btn btn-primary btn-sm" onclick="TranskripPage.loadByNim(document.getElementById('inpAdminTargetNim').value)">Cari Transkrip</button>
          </div>
        ` : `
          <button class="btn btn-secondary btn-sm" onclick="TranskripPage.loadByNim('${targetNim}')">Muat Ulang</button>
        `}
      </div>

      <!-- Student Summary Card -->
      <div id="transkripSummaryCard" class="card" style="margin-bottom: 20px; padding: 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">NIM MAHASISWA</div>
            <div id="tsFieldNim" style="font-size: 15px; font-weight: 600; font-family: var(--font-mono); margin-top: 4px;">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">NAMA LENGKAP</div>
            <div id="tsFieldNama" style="font-size: 15px; font-weight: 600; margin-top: 4px;">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">TOTAL SKS TEMPUH</div>
            <div id="tsFieldSks" style="font-size: 18px; font-weight: 600; margin-top: 4px;">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">INDEKS PRESTASI (IPK)</div>
            <div id="tsFieldIpk" style="font-size: 20px; font-weight: 700; color: var(--accent); margin-top: 4px;">-</div>
          </div>
        </div>
      </div>

      <!-- Transcript Table -->
      <div class="table-container">
        <div class="table-toolbar">
          <span style="font-weight: 600; font-size: 13px;">Daftar Mata Kuliah Tersinkronisasi</span>
          <span id="tsItemCount" class="badge badge-neutral">Memuat data...</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 100px;">Kode MK</th>
              <th>Nama Mata Kuliah</th>
              <th class="text-center" style="width: 80px;">SKS</th>
              <th class="text-center" style="width: 110px;">Nilai Angka</th>
              <th class="text-center" style="width: 80px;">Nilai Huruf</th>
              <th style="width: 180px;">Waktu Sinkronisasi (Audit)</th>
            </tr>
          </thead>
          <tbody id="transkripTableBody">
            ${Components.Skeleton.tableRows(6, 3)}
          </tbody>
        </table>
      </div>
    `;

    await loadByNim(targetNim);
  }

  async function loadByNim(nim) {
    if (!nim) return;
    targetNim = nim.trim();

    const tbody = document.getElementById('transkripTableBody');
    const badge = document.getElementById('tsItemCount');
    tbody.innerHTML = Components.Skeleton.tableRows(6, 3);

    try {
      const data = await Api.getTranskrip(targetNim);

      document.getElementById('tsFieldNim').textContent = data.nim;
      document.getElementById('tsFieldNama').textContent = data.nama;
      document.getElementById('tsFieldSks').textContent = `${data.total_sks} SKS`;
      document.getElementById('tsFieldIpk').textContent = data.ipk.toFixed(2);

      const items = data.transkrip || [];
      badge.textContent = `${items.length} Mata Kuliah Tersinkron`;

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 36px; color: var(--text-muted);">
              Belum ada nilai yang difinalisasi untuk mahasiswa ini. Nilai baru akan masuk ke transkrip setelah dosen melakukan <strong>Finalisasi Kelas</strong>.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = items.map(item => `
        <tr>
          <td><code style="font-family: var(--font-mono); font-weight: 600;">${item.kode_mk}</code></td>
          <td><strong>${item.nama_mk}</strong></td>
          <td class="text-center">${item.sks} SKS</td>
          <td class="text-center"><strong style="color: var(--text-primary);">${item.nilai_angka}</strong></td>
          <td class="text-center"><span class="badge-grade">${item.nilai_huruf}</span></td>
          <td style="font-size: 11.5px; font-family: var(--font-mono); color: var(--text-muted);">${item.synced_at}</td>
        </tr>
      `).join('');
    } catch (err) {
      document.getElementById('tsFieldNim').textContent = targetNim;
      document.getElementById('tsFieldNama').textContent = 'Akses Ditolak';
      document.getElementById('tsFieldSks').textContent = '-';
      document.getElementById('tsFieldIpk').textContent = '-';
      badge.textContent = 'Gagal Akses';

      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 36px; color: var(--danger-text);">
            <div style="font-weight: 600;">Akses Transkrip Ditolak (HTTP ${err.status || 403})</div>
            <div style="font-size: 11.5px; margin-top: 4px;">${err.message}</div>
          </td>
        </tr>
      `;
      Components.Toast.error(`[DENY ${err.status || 403}] ${err.message}`);
    }
  }

  return {
    render,
    loadByNim
  };
})();
