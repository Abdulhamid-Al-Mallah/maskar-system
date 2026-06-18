/* pg-products.js */
let _prodPage = 1;
let _prodSearch = '';
let _prodSortBy = 'name_asc';

window.toggleProdSort = function(col) {
  if (col === 'sku') {
    _prodSortBy = (_prodSortBy === 'sku_asc') ? 'sku_desc' : 'sku_asc';
  } else if (col === 'name') {
    _prodSortBy = (_prodSortBy === 'name_asc') ? 'name_desc' : 'name_asc';
  } else if (col === 'price') {
    _prodSortBy = (_prodSortBy === 'price_asc') ? 'price_desc' : 'price_asc';
  } else if (col === 'stock') {
    _prodSortBy = (_prodSortBy === 'stock_asc') ? 'stock_desc' : 'stock_asc';
  }
  _prodPage = 1;
  render_products();
};

window.render_products = async function() {
  APP.products = await window.api.getProducts() || [];
  const pg = document.getElementById('page-products');
  const modals = document.getElementById('modalContainer');

  let filtered = APP.products.filter(p => {
    if (!_prodSearch) return true;
    const q = _prodSearch.toLowerCase();
    return (p.nameEn||'').toLowerCase().includes(q) || (p.nameAr||'').includes(q) || (p.nameTr||'').toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q);
  });

  // Sorting
  if (_prodSortBy === 'name_asc') {
    filtered.sort((a, b) => getProductName(a).localeCompare(getProductName(b)));
  } else if (_prodSortBy === 'name_desc') {
    filtered.sort((a, b) => getProductName(b).localeCompare(getProductName(a)));
  } else if (_prodSortBy === 'sku_asc') {
    filtered.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
  } else if (_prodSortBy === 'sku_desc') {
    filtered.sort((a, b) => (b.sku || '').localeCompare(a.sku || ''));
  } else if (_prodSortBy === 'price_asc') {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (_prodSortBy === 'price_desc') {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (_prodSortBy === 'stock_asc') {
    filtered.sort((a, b) => (a.stock || 0) - (b.stock || 0));
  } else if (_prodSortBy === 'stock_desc') {
    filtered.sort((a, b) => (b.stock || 0) - (a.stock || 0));
  }

  const pgData = paginate(filtered, _prodPage);
  _prodPage = pgData.page;
  const cur = APP.settings.defaultCurrency || 'USD';

  pg.innerHTML = `
    <div class="page-header">
      <h1>${t('products','nav')}</h1>
      <button class="btn btn-gold" onclick="openProductModal()">${ICONS.plus} ${t('add')} ${t('products','nav')}</button>
    </div>
    <div class="card">
      <div class="filter-bar">
        <div class="form-group search-wrap" style="flex:2">
          ${ICONS.search}
          <input type="text" id="prodSearch" placeholder="${t('search')}" value="${_prodSearch}">
        </div>
      </div>
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleProdSort('sku')">SKU${getHeaderArrow(_prodSortBy, 'sku_asc', 'sku_desc')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleProdSort('name')">${t('name')}${getHeaderArrow(_prodSortBy, 'name_asc', 'name_desc')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleProdSort('price')">${t('price')}${getHeaderArrow(_prodSortBy, 'price_asc', 'price_desc')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleProdSort('stock')">${t('stock')}${getHeaderArrow(_prodSortBy, 'stock_asc', 'stock_desc')}</th>
          <th>${t('status')}</th>
          <th class="text-right">${t('actions')}</th>
        </tr></thead><tbody>
        ${pgData.items.length ? pgData.items.map(p => `<tr>
          <td class="text-muted">${p.sku||'-'}</td>
          <td class="fw-700">${getProductName(p)}</td>
          <td class="text-gold">${fmt(p.price, 'USD')}</td>
          <td>${p.stock||0}</td>
          <td><span class="badge ${p.published?'badge-delivered':'badge-cancelled'}">${p.published?'Active':'Draft'}</span></td>
          <td><div class="table-actions">
            <button class="btn-icon-only edit" onclick="openProductModal('${p.id}')">${ICONS.edit}</button>
            <button class="btn-icon-only delete" onclick="deleteProduct('${p.id}')">${ICONS.trash}</button>
          </div></td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty-state">${t('noData')}</td></tr>`}
        </tbody></table>
      </div>
      ${renderPagination(pgData)}
    </div>`;

  // Search listener
  const searchInput = document.getElementById('prodSearch');
  if (searchInput) {
    searchInput.addEventListener('input', async e => {
      _prodSearch = e.target.value;
      _prodPage = 1;
      await render_products();
      const input = document.getElementById('prodSearch');
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    });
  }



  // Pagination
  pg.querySelectorAll('.page-btn[data-p]').forEach(b => b.addEventListener('click', () => { _prodPage = parseInt(b.dataset.p); render_products(); }));

  // Ensure modal exists
  if (!document.getElementById('productModal')) {
    modals.insertAdjacentHTML('beforeend', renderModal('productModal', t('products','nav'), `
      <div class="form-grid">
        <div class="form-group full-width"><label>${t('name')}</label><input id="pmName"></div>
        <div class="form-group"><label>${t('status')}</label><select id="pmPublished"><option value="true">Active</option><option value="false">Draft</option></select></div>
        <div class="form-group"><label>COGS ($)</label><input id="pmCogs" type="number" step="0.01"></div>
        <div class="form-group"><label>Additional ($)</label><input id="pmAdditional" type="number" step="0.01"></div>
        <div class="form-group"><label>Monthly Fee Share ($)</label><input id="pmMonthlyFee" type="number" step="0.01" readonly style="background: var(--bg-card); color: var(--text-muted);"></div>
        <div class="form-group"><label>${t('price')} ($) (Calculated)</label><input id="pmPrice" type="number" readonly style="font-weight: bold; color: var(--gold); background: var(--bg-card);"></div>
        <div class="form-group"><label>${t('stock')}</label><input id="pmStock" type="number" min="0"></div>
      </div>
      <input type="hidden" id="pmId">`,
      `<button class="btn btn-outline" onclick="closeModal('productModal')">${t('cancel')}</button>
       <button class="btn btn-gold" onclick="saveProduct()">${t('save')}</button>`, 'lg'));
  }
};

window.updateProductModalPrice = function() {
  const cogs = parseFloat(document.getElementById('pmCogs').value) || 0;
  const additional = parseFloat(document.getElementById('pmAdditional').value) || 0;
  const monthlyFee = parseFloat(document.getElementById('pmMonthlyFee').value) || 0;
  const profitPct = parseFloat(APP.settings.profitPercentage) || 0;
  const price = cogs * (1 + profitPct / 100) + additional + monthlyFee;
  document.getElementById('pmPrice').value = price.toFixed(2);
};

window.openProductModal = function(id) {
  const p = id ? APP.products.find(x => x.id === id) : null;
  document.getElementById('pmId').value = p?.id || '';
  document.getElementById('pmName').value = p?.nameEn || p?.nameAr || p?.nameTr || '';
  document.getElementById('pmCogs').value = p?.costOfGoodsSold || '';
  document.getElementById('pmAdditional').value = p?.additional || '0';
  
  // Calculate monthly fee share for this product
  const recurringExpenses = APP.expenses.filter(e => e.recurring === true || e.recurring === 'true');
  const totalRecurringUSD = recurringExpenses.reduce((s, e) => {
    const amt = parseFloat(e.amount) || 0;
    const eCur = e.currency || 'USD';
    if (eCur === 'USD') return s + amt;
    const currObj = (APP.settings.currencies || []).find(c => c.code === eCur);
    const rate = currObj ? currObj.rate : 1;
    return s + (amt / rate);
  }, 0);
  const estSales = parseInt(APP.settings.estimatedMonthlySales) || 1000;
  const monthlyFeeShare = totalRecurringUSD / (estSales || 1);
  
  document.getElementById('pmMonthlyFee').value = monthlyFeeShare.toFixed(3);
  document.getElementById('pmStock').value = p?.stock || 0;
  document.getElementById('pmPublished').value = p ? String(p.published) : 'true';
  
  // Attach keyup/input listeners
  const cogsInput = document.getElementById('pmCogs');
  const additionalInput = document.getElementById('pmAdditional');
  if (cogsInput && !cogsInput.dataset.listener) {
    cogsInput.addEventListener('input', window.updateProductModalPrice);
    cogsInput.dataset.listener = 'true';
  }
  if (additionalInput && !additionalInput.dataset.listener) {
    additionalInput.addEventListener('input', window.updateProductModalPrice);
    additionalInput.dataset.listener = 'true';
  }

  // Update calculated price
  window.updateProductModalPrice();
  
  openModal('productModal');
};

window.saveProduct = async function() {
  const id = document.getElementById('pmId').value;
  const nameVal = document.getElementById('pmName').value.trim();
  const existingProduct = id ? APP.products.find(p => p.id === id) : null;

  // Auto-generate SKU if new or missing
  const sku = existingProduct?.sku || ('MSK-' + Math.random().toString(36).substr(2, 6).toUpperCase());

  const data = {
    sku: sku,
    nameEn: nameVal,
    nameAr: nameVal,
    nameTr: nameVal,
    slug: slugify(nameVal),
    price: parseFloat(document.getElementById('pmPrice').value) || 0,
    costOfGoodsSold: parseFloat(document.getElementById('pmCogs').value) || 0,
    additional: parseFloat(document.getElementById('pmAdditional').value) || 0,
    monthlyFee: parseFloat(document.getElementById('pmMonthlyFee').value) || 0,
    stock: parseInt(document.getElementById('pmStock').value) || 0,
    descriptionEn: '',
    descriptionAr: '',
    published: document.getElementById('pmPublished').value === 'true',
    notes: [], attributes: []
  };
  if (!data.nameEn) return showToast('Name required', 'error');
  if (data.price < 0) return showToast('Price cannot be negative', 'error');
  if (data.costOfGoodsSold < 0) return showToast('COGS cannot be negative', 'error');
  if (data.stock < 0) return showToast('Stock cannot be negative', 'error');

  let res;
  if (id) { data.id = id; res = await window.api.updateProduct(data); }
  else { res = await window.api.createProduct(data); }

  if (res.success) { closeModal('productModal'); showToast(id ? 'Product updated' : 'Product created'); render_products(); }
  else showToast(res.error || 'Error', 'error');
};

window.deleteProduct = function(id) {
  const p = APP.products.find(x => x.id === id);
  confirmAction(`Delete "${getProductName(p)}"?`, async () => {
    const res = await window.api.deleteProduct(id);
    if (res.success) { showToast('Product deleted'); render_products(); }
    else showToast(res.error, 'error');
  });
};
