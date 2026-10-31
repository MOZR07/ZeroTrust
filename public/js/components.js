/**
 * Reusable UI Components
 * Lucide-style SVG icons, Toast notification system, Modal dialog, and Skeletons.
 */

const Components = (() => {
  const Icons = {
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    table: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
    fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };

  // Toast System
  const showToast = (message, type = 'info', duration = 3500) => {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="flex: 1; font-weight: 500;">${message}</div>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer;" onclick="this.parentElement.remove()">
        ${Icons.x}
      </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.15s ease';
      setTimeout(() => toast.remove(), 150);
    }, duration);
  };

  const Toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error', 4500),
    info: (msg) => showToast(msg, 'info')
  };

  // Modal Dialog System
  let activeConfirmCallback = null;

  const Modal = {
    open: ({ title, contentHtml, confirmText = 'Simpan', cancelText = 'Batal', onConfirm, isDanger = false }) => {
      let backdrop = document.getElementById('modalBackdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'modalBackdrop';
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
          <div class="modal-box">
            <div class="modal-header">
              <h4 id="modalTitle" class="modal-title"></h4>
              <button class="modal-close" onclick="Components.Modal.close()">${Icons.x}</button>
            </div>
            <div id="modalBody" class="modal-body"></div>
            <div class="modal-footer">
              <button class="btn btn-secondary" onclick="Components.Modal.close()">${cancelText}</button>
              <button id="modalConfirmBtn" class="btn btn-primary"></button>
            </div>
          </div>
        `;
        document.body.appendChild(backdrop);

        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) Modal.close();
        });
      }

      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = contentHtml;
      
      const confirmBtn = document.getElementById('modalConfirmBtn');
      confirmBtn.textContent = confirmText;
      confirmBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

      activeConfirmCallback = onConfirm;
      confirmBtn.onclick = () => {
        if (activeConfirmCallback) activeConfirmCallback();
      };

      requestAnimationFrame(() => backdrop.classList.add('open'));
    },
    close: () => {
      const backdrop = document.getElementById('modalBackdrop');
      if (backdrop) {
        backdrop.classList.remove('open');
        activeConfirmCallback = null;
      }
    }
  };

  // Status Badge Helpers
  const Badge = {
    finalStatus: (isFinal) => {
      return isFinal 
        ? `<span class="badge badge-success">${Icons.lock} Final</span>`
        : `<span class="badge badge-warning">Draft</span>`;
    },
    decision: (dec) => {
      return dec === 'ALLOW'
        ? `<span class="badge badge-success">ALLOW</span>`
        : `<span class="badge badge-danger">DENY</span>`;
    }
  };

  // Skeleton Loader for tables
  const Skeleton = {
    tableRows: (cols = 6, rows = 4) => {
      let html = '';
      for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
          html += `<td><div class="skeleton" style="height: 14px; width: ${60 + (c * 15) % 40}%;"></div></td>`;
        }
        html += '</tr>';
      }
      return html;
    }
  };

  return {
    Icons,
    Toast,
    Modal,
    Badge,
    Skeleton
  };
})();
