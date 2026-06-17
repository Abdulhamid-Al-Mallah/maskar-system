/* pg-inventory.js */
let _invPage = 1;

window.render_inventory = async function() {
  APP.products = await window.api.getProducts() || [];
  APP.settings = await window.api.getSettings() || {};
  const pg = document.getElementById('page-inventory');
  const thresh = parseInt(APP.settings.lowStockThreshold) || 5;
  const sorted = [...APP.products].sort((a,b) => (a.stock||0) - (b.stock||0));
  const pgData = paginate(sorted, _invPage);

  pg.innerHTML = `
    <div class="page-header">
      <h1>${t('inventory','nav')}</h1>
      <div class="flex gap-10">
        <label style="color:var(--text-muted);font-size:0.8rem;display:flex;align-items:center;gap:6px">
          ${t('lowThresh','settings')}:
          <input type="number" id="invThresh" value="${thresh}" min="0" style="width:70px;padding:6px 10px">
        </label>
      </div>
    </div>
    <div class="card">
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th>SKU</th><th>${t('name')}</th><th>${t('stock')}</th><th>${t('status')}</th><th class="text-right">${t('actions')}</th>
        </tr></thead><tbody>
        ${pgData.items.map(p => {
          const low = (p.stock||0) <= thresh;
          return `<tr>
            <td class="text-muted">${p.sku||'-'}</td>
            <td class="fw-700">${getProductName(p)}</td>
            <td><input type="number" class="inv-stock" data-id="${p.id}" value="${p.stock||0}" min="0" style="width:80px;padding:6px 10px"></td>
            <td><span class="badge ${low?'badge-low':'badge-ok'}">${low?'Low':'OK'}</span></td>
            <td><div class="table-actions">
              <button class="btn btn-sm btn-outline inv-save" data-id="${p.id}">${t('save')}</button>
            </div></td>
          </tr>`;
        }).join('') || `<tr><td colspan="5" class="empty-state">${t('noData')}</td></tr>`}
        </tbody></table>
      </div>
      ${renderPagination(pgData)}
    </div>`;

  // Threshold change
  document.getElementById('invThresh')?.addEventListener('change', async e => {
    APP.settings.lowStockThreshold = parseInt(e.target.value) || 5;
    await window.api.saveSettings(APP.settings);
    render_inventory();
  });

  // Save stock buttons
  pg.querySelectorAll('.inv-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const input = pg.querySelector(`.inv-stock[data-id="${id}"]`);
      const newStock = parseInt(input.value) || 0;
      const p = APP.products.find(x => x.id === id);
      if (p) {
        p.stock = newStock;
        const res = await window.api.updateProduct(p);
        if (res.success) {
          showToast('Stock updated');
          render_inventory();
        } else {
          showToast(res.error, 'error');
        }
      }
    });
  });

  // Pagination
  pg.querySelectorAll('.page-btn[data-p]').forEach(b => b.addEventListener('click', () => { _invPage = parseInt(b.dataset.p); render_inventory(); }));
};
