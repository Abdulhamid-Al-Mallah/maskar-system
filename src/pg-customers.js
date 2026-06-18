/* pg-customers.js */
let _custPage = 1, _custSearch = '';
let _custOrdersPage = 1, _custOrdersCustId = '';

window.render_customers = async function() {
  APP.customers = await window.api.getCustomers() || [];
  APP.orders = await window.api.getOrders() || [];
  const pg = document.getElementById('page-customers');
  const modals = document.getElementById('modalContainer');
  const cur = APP.settings.defaultCurrency || 'USD';

  let filtered = APP.customers.filter(c => {
    if (!_custSearch) return true;
    const q = _custSearch.toLowerCase();
    return (c.name||'').toLowerCase().includes(q) || (c.phone||'').includes(q) || (c.email||'').toLowerCase().includes(q);
  });
  const pgData = paginate(filtered, _custPage);
  _custPage = pgData.page;

  pg.innerHTML = `
    <div class="page-header">
      <h1>${t('customers','nav')}</h1>
      <button class="btn btn-gold" onclick="openCustModal()">${ICONS.plus} ${t('add')} ${t('customer')}</button>
    </div>
    <div class="card">
      <div class="filter-bar">
        <div class="form-group search-wrap" style="flex:2">${ICONS.search}
          <input type="text" id="custSearch" placeholder="${t('search')}" value="${_custSearch}">
        </div>
      </div>
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th>${t('name')}</th><th>${t('phone')}</th><th>${t('city')}</th><th>Orders</th><th>Spent</th><th class="text-right">${t('actions')}</th>
        </tr></thead><tbody>
        ${pgData.items.length ? pgData.items.map(c => {
          const custOrders = APP.orders.filter(o => o.customerId === c.id);
          const spent = custOrders.reduce((s,o) => s + (parseFloat(o.total)||0), 0);
          return `<tr>
            <td class="fw-700">${c.name}</td>
            <td>${c.phone||'-'}</td>
            <td class="text-muted">${c.city||'-'}</td>
            <td>${custOrders.length}</td>
            <td class="text-gold">${fmt(spent, 'USD')}</td>
            <td><div class="table-actions">
              <button class="btn-icon-only" onclick="showCustOrders('${c.id}')" title="Orders">${ICONS.orders}</button>
              <button class="btn-icon-only edit" onclick="openCustModal('${c.id}')">${ICONS.edit}</button>
              <button class="btn-icon-only delete" onclick="deleteCust('${c.id}')">${ICONS.trash}</button>
            </div></td>
          </tr>`;
        }).join('') : `<tr><td colspan="6" class="empty-state">${t('noData')}</td></tr>`}
        </tbody></table>
      </div>
      ${renderPagination(pgData)}
    </div>`;

  const searchInput = document.getElementById('custSearch');
  if (searchInput) {
    searchInput.addEventListener('input', async e => {
      _custSearch = e.target.value;
      _custPage = 1;
      await render_customers();
      const input = document.getElementById('custSearch');
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    });
  }
  pg.querySelectorAll('.page-btn[data-p]').forEach(b => b.addEventListener('click', () => { _custPage = parseInt(b.dataset.p); render_customers(); }));

  if (!document.getElementById('custModal')) {
    modals.insertAdjacentHTML('beforeend', renderModal('custModal', t('customer'), `
      <div class="form-grid">
        <div class="form-group full-width"><label>${t('name')}</label><input id="cmName"></div>
        <div class="form-group"><label>${t('phone')}</label><input id="cmPhone"></div>
        <div class="form-group"><label>${t('email')}</label><input id="cmEmail" type="email"></div>
        <div class="form-group full-width"><label>${t('address')}</label><textarea id="cmAddr" rows="2"></textarea></div>
        <div class="form-group"><label>${t('city')}</label><input id="cmCity"></div>
        <div class="form-group"><label>${t('country')}</label><input id="cmCountry"></div>
      </div><input type="hidden" id="cmId">`,
      `<button class="btn btn-outline" onclick="closeModal('custModal')">${t('cancel')}</button>
       <button class="btn btn-gold" onclick="saveCust()">${t('save')}</button>`));
  }

  if (!document.getElementById('custOrdersModal')) {
    modals.insertAdjacentHTML('beforeend', renderModal('custOrdersModal', 'Customer Orders', `<div id="custOrdersList"></div>`, '', 'lg'));
  }
};

window.openCustModal = function(id) {
  const c = id ? APP.customers.find(x => x.id === id) : null;
  document.getElementById('cmId').value = c?.id || '';
  document.getElementById('cmName').value = c?.name || '';
  document.getElementById('cmPhone').value = c?.phone || '';
  document.getElementById('cmEmail').value = c?.email || '';
  document.getElementById('cmAddr').value = c?.address || '';
  document.getElementById('cmCity').value = c?.city || '';
  document.getElementById('cmCountry').value = c?.country || '';
  openModal('custModal');
};

window.saveCust = async function() {
  const id = document.getElementById('cmId').value;
  const data = {
    name: document.getElementById('cmName').value.trim(),
    phone: document.getElementById('cmPhone').value.trim(),
    email: document.getElementById('cmEmail').value.trim(),
    address: document.getElementById('cmAddr').value.trim(),
    city: document.getElementById('cmCity').value.trim(),
    country: document.getElementById('cmCountry').value.trim()
  };
  if (!data.name) return showToast('Name required', 'error');
  let res;
  if (id) { data.id = id; res = await window.api.updateCustomer(data); }
  else { res = await window.api.createCustomer(data); }
  if (res.success) { closeModal('custModal'); showToast('Customer saved'); render_customers(); }
  else showToast(res.error, 'error');
};

window.deleteCust = function(id) {
  confirmAction(t('confirm'), async () => {
    const res = await window.api.deleteCustomer(id);
    if (res.success) { showToast('Customer deleted'); render_customers(); }
    else showToast(res.error, 'error');
  });
};

window.showCustOrders = function(custId) {
  if (_custOrdersCustId !== custId) {
    _custOrdersCustId = custId;
    _custOrdersPage = 1;
  }
  const cur = APP.settings.defaultCurrency || 'USD';
  const orders = APP.orders.filter(o => o.customerId === custId);
  const el = document.getElementById('custOrdersList');
  if (!orders.length) { el.innerHTML = `<p class="empty-state">${t('noData')}</p>`; }
  else {
    const pgData = paginate(orders, _custOrdersPage);
    _custOrdersPage = pgData.page;

    el.innerHTML = `<table class="data-table"><thead><tr><th>#</th><th>${t('date')}</th><th>${t('total')}</th><th>${t('status')}</th></tr></thead><tbody>
      ${pgData.items.map(o => `<tr><td class="fw-700">${o.orderNumber||'-'}</td><td class="text-muted">${fmtDate(o.createdAt)}</td><td class="text-gold">${fmt(o.total, 'USD')}</td><td><span class="badge badge-${o.status}">${o.status}</span></td></tr>`).join('')}
    </tbody></table>
    ${renderPagination(pgData)}`;

    el.querySelectorAll('.page-btn[data-p]').forEach(b => b.addEventListener('click', () => { 
      _custOrdersPage = parseInt(b.dataset.p); 
      showCustOrders(custId); 
    }));
  }
  openModal('custOrdersModal');
};
