/**
 * Data Nilai Page Module
 * Search, filter, edit modal, and class finalization actions.
 */

const NilaiPage = (() => {
  let cachedData = [];
  let currentFilter = 'all';
  let searchQuery = '';

  async function render(container) {
    const user = Api.getStoredUser();
    if (!user) {
      App.navigate('login');
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Data Nilai Mahasiswa</h2>
          <p class="page-description">
            ${user.role === 'dosen' ? 'Kelola penilaian mahasiswa untuk kelas yang Anda ampu.' : 'Daftar nilai akademik Anda semester berjalan.'}
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="NilaiPage.loadData()">Muat Ulang</button>
        </div>
      </div>

      ${user.role === 'dosen' ? `
        <div id="finalisasiPanel" class="card" style="margin-bottom: 16px; border-left: 4px solid var(--accent); padding: 14px 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h4 style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Aksi Dosen: Finalisasi & Kunci Kelas</h4>
              <p style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                Finalisasi akan mengunci nilai secara permanen dan otomatis menyinkronkan data ke Service Transkrip melalui Service Token.
              </p>
            </div>
            <div id="finalisasiButtons" style="display: flex; gap: 8px;"></div>
          </div>
        </div>
      ` : ''}

      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-filters">
            <div class="search-box">
              <span class="search-icon">${Components.Icons.search}</span>
              <input type="text" id="nilaiSearchInput" class="input" placeholder="Cari mahasiswa, NIM, atau MK..." oninput="NilaiPage.handleSearch(this.value)">
            </div>
            <select id="nilaiFilterStatus" class="select" onchange="NilaiPage.handleFilter(this.value)">
              <option value="all">Semua Status</option>
              <option value="draft">Status Draft</option>
              <option value="final">Status Final</option>
            </select>
          </div>
          <span id="nilaiCountBadge" class="badge badge-neutral">Memuat data...</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 60px;">ID</th>
              <th>Mata Kuliah</th>
              <th style="width: 110px;">NIM</th>
              <th>Nama Mahasiswa</th>
              <th class="text-center" style="width: 100px;">Nilai Angka</th>
              <th class="text-center" style="width: 70px;">Huruf</th>
              <th class="text-center" style="width: 100px;">Status</th>
              <th style="text-align: right; width: 130px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="nilaiTableBody">
            ${Components.Skeleton.tableRows(8, 4)}
          </tbody>
        </table>
      </div>
    `;

    await loadData();
  }

  async function loadData() {
    const tbody = document.getElementById('nilaiTableBody');
    const badge = document.getElementById('nilaiCountBadge');
    const user = Api.getStoredUser();

    try {
      const res = await Api.getNilai();
      cachedData = res.data || [];
      renderTable();

      // Render Finalization Buttons for Dosen
      if (user && user.role === 'dosen') {
        renderFinalizationButtons();
      }
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 28px; color: var(--danger-text);">
            <div style="font-weight: 600;">Akses Gagal / Dicegat Policy Engine</div>
            <div style="font-size: 11.5px; margin-top: 4px;">${err.message}</div>
          </td>
        </tr>
      `;
      if (badge) badge.textContent = '0 Data';
    }
  }

  function renderTable() {
    const tbody = document.getElementById('nilaiTableBody');
    const badge = document.getElementById('nilaiCountBadge');
    const user = Api.getStoredUser();
    const isDosen = user && user.role === 'dosen';

    let filtered = cachedData.filter(item => {
      // Status filter
      if (currentFilter === 'draft' && item.is_final !== 0) return false;
      if (currentFilter === 'final' && item.is_final !== 1) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nama = (item.nama_mahasiswa || user.nama || '').toLowerCase();
        const nim = (item.nim || '').toLowerCase();
        const mk = (item.nama_mk || '').toLowerCase();
        const kode = (item.kode_mk || '').toLowerCase();
        return nama.includes(q) || nim.includes(q) || mk.includes(q) || kode.includes(q);
      }
      return true;
    });

    if (badge) badge.textContent = `${filtered.length} Data Ditampilkan`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
            Tidak ada data nilai yang sesuai dengan filter pencarian.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(item => {
      const isFinal = item.is_final === 1;
      const namaMhs = item.nama_mahasiswa || user.nama;

      const actionBtn = isDosen
        ? (isFinal
            ? `<button class="btn btn-secondary btn-sm" disabled style="opacity: 0.45; cursor: not-allowed;" title="Nilai sudah berstatus FINAL">${Components.Icons.lock} Terkunci</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="NilaiPage.openEditModal(${item.id}, ${item.nilai_angka || 80}, '${namaMhs}', '${item.nama_mk}')">${Components.Icons.edit} Edit Nilai</button>`
          )
        : `<span style="font-size: 11px; color: var(--text-muted);">Hanya Baca</span>`;

      return `
        <tr>
          <td style="font-family: var(--font-mono); color: var(--text-muted);">#${item.id}</td>
          <td>
            <strong>${item.kode_mk}</strong>
            <span style="color: var(--text-secondary); margin-left: 4px;">${item.nama_mk}</span>
          </td>
          <td><code style="font-family: var(--font-mono);">${item.nim}</code></td>
          <td><strong>${namaMhs}</strong></td>
          <td class="text-center">
            <strong style="color: var(--text-primary); font-size: 13px;">
              ${item.nilai_angka !== null ? item.nilai_angka : '-'}
            </strong>
          </td>
          <td class="text-center">
            <span class="badge-grade">
              ${item.nilai_huruf || '-'}
            </span>
          </td>
          <td class="text-center">${Components.Badge.finalStatus(isFinal)}</td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');
  }

  function renderFinalizationButtons() {
    const container = document.getElementById('finalisasiButtons');
    if (!container) return;

    // Detect unique classes in cachedData
    const classesMap = {};
    cachedData.forEach(item => {
      if (!classesMap[item.kelas_id]) {
        classesMap[item.kelas_id] = {
          id: item.kelas_id,
          kode_mk: item.kode_mk,
          nama_mk: item.nama_mk,
          allFinal: true
        };
      }
      if (item.is_final === 0) {
        classesMap[item.kelas_id].allFinal = false;
      }
    });

    const list = Object.values(classesMap);
    if (list.length === 0) {
      container.innerHTML = '<span style="font-size: 11px; color: var(--text-muted);">Tidak ada kelas aktif.</span>';
      return;
    }

    container.innerHTML = list.map(c => `
      <button 
        class="btn btn-primary btn-sm" 
        ${c.allFinal ? 'disabled style="opacity: 0.5;"' : ''} 
        onclick="NilaiPage.confirmFinalize(${c.id}, '${c.kode_mk} - ${c.nama_mk}')"
      >
        ${c.allFinal ? `${Components.Icons.check} Selesai Difinalisasi` : `Finalisasi Kelas ${c.kode_mk}`}
      </button>
    `).join('');
  }

  function openEditModal(id, currentVal, namaMhs, namaMk) {
    Components.Modal.open({
      title: `Ubah Nilai — ${namaMhs}`,
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Mata Kuliah:</div>
            <div style="font-weight: 600; color: var(--text-primary);">${namaMk}</div>
          </div>
          <div class="field">
            <label for="inpModalNilai">Nilai Angka Baru (0 - 100)</label>
            <input type="number" id="inpModalNilai" class="input" min="0" max="100" step="0.5" value="${currentVal}" autofocus>
          </div>
          <div style="font-size: 11px; color: var(--text-muted);">
            Catatan: Operasi edit nilai tunduk pada evaluasi jam kerja (07:00–21:00) dan verifikasi kepemilikan kelas dosen (ABAC).
          </div>
        </div>
      `,
      confirmText: 'Simpan Perubahan',
      onConfirm: async () => {
        const input = document.getElementById('inpModalNilai');
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0 || val > 100) {
          Components.Toast.error('Nilai harus berupa angka valid antara 0 sampai 100.');
          return;
        }

        try {
          await Api.updateNilai(id, val);
          Components.Toast.success(`Nilai untuk ${namaMhs} berhasil diupdate menjadi ${val}.`);
          Components.Modal.close();
          await loadData();
        } catch (err) {
          Components.Toast.error(err.message || 'Gagal mengubah nilai.');
        }
      }
    });
  }

  function confirmFinalize(kelasId, className) {
    Components.Modal.open({
      title: `Konfirmasi Finalisasi Kelas #${kelasId}`,
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <p style="font-size: 13px; color: var(--text-primary);">
            Apakah Anda yakin ingin memfinalisasi kelas <strong>${className}</strong>?
          </p>
          <div style="background: var(--warning-bg); border: 1px solid var(--warning-border); padding: 10px; border-radius: var(--radius-md); font-size: 11.5px; color: var(--warning-text);">
            ⚠️ Nilai akan <strong>dikunci permanen</strong> dan otomatis disinkronkan ke Service Transkrip melalui komunikasi inter-service Zero Trust (Token Service).
          </div>
        </div>
      `,
      confirmText: 'Ya, Finalisasi & Kunci',
      isDanger: false,
      onConfirm: async () => {
        try {
          const res = await Api.finalizeKelas(kelasId);
          Components.Toast.success(`Kelas berhasil difinalisasi! ${res.items_synced || 0} nilai tersinkron.`);
          Components.Modal.close();
          await loadData();
        } catch (err) {
          Components.Toast.error(err.message || 'Gagal memfinalisasi kelas.');
        }
      }
    });
  }

  function handleSearch(val) {
    searchQuery = val.trim();
    renderTable();
  }

  function handleFilter(val) {
    currentFilter = val;
    renderTable();
  }

  return {
    render,
    loadData,
    openEditModal,
    confirmFinalize,
    handleSearch,
    handleFilter
  };
})();
