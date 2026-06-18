/* pg-accounting.js */
let _expPage = 1;
let _accountingMonth = '';
let _expSortBy = 'date_desc';

window.toggleExpSort = function(col) {
  if (col === 'date') {
    _expSortBy = (_expSortBy === 'date_asc') ? 'date_desc' : 'date_asc';
  } else if (col === 'cat') {
    _expSortBy = (_expSortBy === 'cat_asc') ? 'cat_desc' : 'cat_asc';
  } else if (col === 'amount') {
    _expSortBy = (_expSortBy === 'amount_asc') ? 'amount_desc' : 'amount_asc';
  }
  _expPage = 1;
  render_accounting();
};

window.render_accounting = async function() {
  await loadAllData();
  const pg = document.getElementById('page-accounting');
  const modals = document.getElementById('modalContainer');
  const cur = APP.settings.defaultCurrency || 'USD';

  // Calculate recurring monthly expenses in USD
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
  const monthlyFeePerProduct = totalRecurringUSD / (estSales || 1);

  // Filter orders and expenses by selected month
  let filteredExpenses = [...APP.expenses];
  let filteredOrders = APP.orders;

  if (_accountingMonth) {
    filteredExpenses = filteredExpenses.filter(e => {
      const d = e.date || e.createdAt;
      return d && d.startsWith(_accountingMonth);
    });
    filteredOrders = APP.orders.filter(o => {
      const d = o.createdAt || o.date;
      return d && d.startsWith(_accountingMonth);
    });
  }

  // Sorting
  if (_expSortBy === 'date_desc') {
    filteredExpenses.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  } else if (_expSortBy === 'date_asc') {
    filteredExpenses.sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));
  } else if (_expSortBy === 'amount_desc') {
    filteredExpenses.sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
  } else if (_expSortBy === 'amount_asc') {
    filteredExpenses.sort((a, b) => (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0));
  } else if (_expSortBy === 'cat_asc') {
    filteredExpenses.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  } else if (_expSortBy === 'cat_desc') {
    filteredExpenses.sort((a, b) => (b.category || '').localeCompare(a.category || ''));
  }

  const pgData = paginate(filteredExpenses, _expPage);
  _expPage = pgData.page;

  // P&L Calculation
  const delivered = filteredOrders.filter(o => o.status === 'delivered');
  const revenue = delivered.reduce((s,o) => s + (parseFloat(o.total)||0), 0);
  const cogs = delivered.reduce((s,o) => s + (o.items||[]).reduce((ss,it) => {
    const p = APP.products.find(x => x.id === it.productId);
    return ss + ((p?.costOfGoodsSold||0) * (it.quantity||0));
  }, 0), 0);

  const totalExp = filteredExpenses.reduce((s,e) => {
    const amt = parseFloat(e.amount) || 0;
    const eCur = e.currency || 'USD';
    if (eCur === 'USD') return s + amt;
    const currObj = (APP.settings.currencies || []).find(c => c.code === eCur);
    const rate = currObj ? currObj.rate : 1;
    return s + (amt / rate);
  }, 0);

  pg.innerHTML = `
    <div class="page-header">
      <h1>${t('accounting','nav')}</h1>
      <button class="btn btn-gold" onclick="openExpModal()">${ICONS.plus} ${t('add')} Expense</button>
    </div>

    <!-- Month Filter Card -->
    <div class="card mb-16">
      <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="form-group">
          <label>Filter P&L by Month</label>
          <div class="flex gap-10">
            <input type="month" id="accountingMonthFilter" value="${_accountingMonth || ''}">
            ${_accountingMonth ? `<button class="btn btn-outline btn-sm" onclick="window.clearAccountingMonthFilter()">Clear</button>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Monthly Fees Share Card -->
    <div class="card mb-16">
      <div class="card-title">Recurring Monthly Fees Share</div>
      <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="form-group">
          <label>Estimated Monthly Sales (Units)</label>
          <input type="number" id="accEstSales" min="1" value="${estSales}">
        </div>
        <div class="form-group">
          <label>Total Recurring Monthly Fees (USD)</label>
          <div class="text-gold fw-700" style="font-size: 1.25rem; margin-top: 8px;">${fmt(totalRecurringUSD, 'USD')}</div>
        </div>
        <div class="form-group">
          <label>Monthly Fee Share per Product (USD)</label>
          <div class="text-gold fw-700" style="font-size: 1.25rem; margin-top: 8px;">${fmt(monthlyFeePerProduct, 'USD')}</div>
        </div>
      </div>
      <button class="btn btn-gold btn-sm mt-16" onclick="window.saveEstSales()">Save & Recalculate Prices</button>
    </div>

    <div class="card mb-16">
      <div class="card-title">${t('pnl','dashboard')} ${_accountingMonth ? `(${_accountingMonth})` : '(All Time)'}</div>
      <div class="totals-block">
        <div class="total-row"><span>Revenue</span><span class="text-gold fw-700">${fmt(revenue,'USD')}</span></div>
        <div class="total-row"><span>COGS</span><span class="text-error">${fmt(cogs,'USD')}</span></div>
        <div class="total-row"><span>Gross Profit</span><span>${fmt(revenue-cogs,'USD')}</span></div>
        <div class="total-row"><span>Total Expenses</span><span class="text-error">${fmt(totalExp,'USD')}</span></div>
        <div class="total-row grand"><span>Net Profit</span><span>${fmt(revenue-cogs-totalExp,'USD')}</span></div>
      </div>
    </div>
    <div class="card">
      <div class="flex-between mb-16" style="flex-wrap: wrap; gap: 12px;">
        <div class="card-title" style="margin:0">Expenses ${_accountingMonth ? `(${_accountingMonth})` : ''}</div>
      </div>
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleExpSort('date')">${t('date')}${getHeaderArrow(_expSortBy, 'date_asc', 'date_desc')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleExpSort('cat')">${t('category')}${getHeaderArrow(_expSortBy, 'cat_asc', 'cat_desc')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleExpSort('amount')">${t('amount')}${getHeaderArrow(_expSortBy, 'amount_asc', 'amount_desc')}</th>
          <th>${t('notes')}</th>
          <th>Recurring</th>
          <th class="text-right">${t('actions')}</th>
        </tr></thead><tbody>
        ${pgData.items.length ? pgData.items.map(e => `<tr>
          <td class="text-muted">${fmtDate(e.date||e.createdAt)}</td>
          <td class="fw-700">${e.category||'-'}</td>
          <td class="text-gold">${fmt(e.amount,e.currency||cur)}</td>
          <td>${e.notes||'-'}</td>
          <td>${(e.recurring === true || e.recurring === 'true') ? '<span class="badge badge-processing">Monthly</span>' : '-'}</td>
          <td><div class="table-actions">
            <button class="btn-icon-only edit" onclick="openExpModal('${e.id}')">${ICONS.edit}</button>
            <button class="btn-icon-only delete" onclick="deleteExp('${e.id}')">${ICONS.trash}</button>
          </div></td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty-state">${t('noData')}</td></tr>`}
        </tbody></table>
      </div>
      ${renderPagination(pgData)}
    </div>`;

  pg.querySelectorAll('.page-btn[data-p]').forEach(b => b.addEventListener('click', () => { _expPage = parseInt(b.dataset.p); render_accounting(); }));

  // Month filter listener
  const monthFilter = document.getElementById('accountingMonthFilter');
  if (monthFilter) {
    monthFilter.addEventListener('change', e => {
      _accountingMonth = e.target.value;
      _expPage = 1;
      render_accounting();
    });
  }



  if (!document.getElementById('expModal')) {
    const currencies = APP.settings.currencies || [
      { code: 'USD', rate: 1 },
      { code: 'TRY', rate: 34 },
      { code: 'EUR', rate: 0.92 },
      { code: 'SAR', rate: 3.75 },
      { code: 'AED', rate: 3.67 }
    ];
    modals.insertAdjacentHTML('beforeend', renderModal('expModal', 'Expense', `
      <div class="form-grid">
        <div class="form-group"><label>${t('category')}</label><input id="emCat"></div>
        <div class="form-group"><label>${t('amount')}</label><input id="emAmt" type="number" step="0.01"></div>
        <div class="form-group"><label>${t('date')}</label><input id="emDate" type="datetime-local"></div>
        <div class="form-group full-width"><label>${t('notes')}</label><textarea id="emNotes" rows="2"></textarea></div>
        <div class="form-group"><label><input type="checkbox" id="emRecur"> Monthly Recurring</label></div>
      </div><input type="hidden" id="emId">`,
      `<button class="btn btn-outline" onclick="closeModal('expModal')">${t('cancel')}</button>
       <button class="btn btn-gold" onclick="saveExp()">${t('save')}</button>`, 'sm'));
  }
};

window.openExpModal = function(id) {
  const e = id ? APP.expenses.find(x => x.id === id) : null;
  
  document.getElementById('emId').value = e?.id || '';
  document.getElementById('emCat').value = e?.category || '';
  document.getElementById('emAmt').value = e?.amount || '';
  
  // Format local datetime (YYYY-MM-DDTHH:mm)
  const d = e?.date ? new Date(e.date) : new Date();
  const tzoffset = d.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(d - tzoffset)).toISOString().slice(0, 16);
  document.getElementById('emDate').value = localISOTime;

  document.getElementById('emNotes').value = e?.notes || '';
  document.getElementById('emRecur').checked = (e?.recurring === true || e?.recurring === 'true');
  openModal('expModal');
};

window.saveExp = async function() {
  const id = document.getElementById('emId').value;
  const dateVal = document.getElementById('emDate').value;
  const data = {
    category: document.getElementById('emCat').value.trim(),
    amount: parseFloat(document.getElementById('emAmt').value) || 0,
    currency: 'USD',
    date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    notes: document.getElementById('emNotes').value.trim(),
    recurring: document.getElementById('emRecur').checked
  };
  if (!data.category) return showToast('Category required', 'error');
  if (data.amount < 0) return showToast('Expense amount cannot be negative', 'error');
  let res;
  if (id) { data.id = id; res = await window.api.updateExpense(data); }
  else { res = await window.api.createExpense(data); }
  if (res.success) {
    closeModal('expModal');
    showToast('Expense saved');
    await window.recalculateAllProductPrices();
    await render_accounting();
  }
  else showToast(res.error, 'error');
};

window.deleteExp = function(id) {
  confirmAction(t('confirm'), async () => {
    const res = await window.api.deleteExpense(id);
    if (res.success) {
      showToast('Expense deleted');
      await window.recalculateAllProductPrices();
      await render_accounting();
    } else {
      showToast(res.error || 'Failed to delete expense', 'error');
    }
  });
};

window.clearAccountingMonthFilter = function() {
  _accountingMonth = '';
  _expPage = 1;
  render_accounting();
};

window.saveEstSales = async function() {
  const val = parseInt(document.getElementById('accEstSales').value) || 1000;
  APP.settings.estimatedMonthlySales = val;
  const res = await window.api.saveSettings(APP.settings);
  if (res.success) {
    showToast('Estimated sales saved. Recalculating product prices...');
    await window.recalculateAllProductPrices();
    showToast('Prices updated.');
    await render_accounting();
  } else {
    showToast(res.error, 'error');
  }
};
