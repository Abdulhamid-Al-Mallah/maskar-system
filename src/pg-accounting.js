/* pg-accounting.js */
let _expPage = 1;

window.render_accounting = async function() {
  await loadAllData();
  const pg = document.getElementById('page-accounting');
  const modals = document.getElementById('modalContainer');
  const cur = APP.settings.defaultCurrency || 'USD';
  const pgData = paginate(APP.expenses.sort((a,b) => new Date(b.date||b.createdAt||0) - new Date(a.date||a.createdAt||0)), _expPage);
  _expPage = pgData.page;

  // P&L
  const delivered = APP.orders.filter(o => o.status === 'delivered');
  const revenue = delivered.reduce((s,o) => s + (parseFloat(o.total)||0), 0);
  const cogs = delivered.reduce((s,o) => s + (o.items||[]).reduce((ss,it) => {
    const p = APP.products.find(x => x.id === it.productId);
    return ss + ((p?.costOfGoodsSold||0) * (it.quantity||0));
  }, 0), 0);
  const totalExp = APP.expenses.reduce((s,e) => {
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
    <div class="card mb-16">
      <div class="card-title">${t('pnl','dashboard')}</div>
      <div class="totals-block">
        <div class="total-row"><span>Revenue</span><span class="text-gold fw-700">${fmt(revenue,'USD')}</span></div>
        <div class="total-row"><span>COGS</span><span class="text-error">${fmt(cogs,'USD')}</span></div>
        <div class="total-row"><span>Gross Profit</span><span>${fmt(revenue-cogs,'USD')}</span></div>
        <div class="total-row"><span>Total Expenses</span><span class="text-error">${fmt(totalExp,'USD')}</span></div>
        <div class="total-row grand"><span>Net Profit</span><span>${fmt(revenue-cogs-totalExp,'USD')}</span></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Expenses</div>
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th>${t('date')}</th><th>${t('category')}</th><th>${t('amount')}</th><th>${t('notes')}</th><th>Recurring</th><th class="text-right">${t('actions')}</th>
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
        <div class="form-group">
          <label>${t('currency')}</label>
          <select id="emCur">
            ${currencies.map(c => `<option value="${c.code}">${c.code}</option>`).join('')}
          </select>
        </div>
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
  
  const currencies = APP.settings.currencies || [
    { code: 'USD', rate: 1 },
    { code: 'TRY', rate: 34 },
    { code: 'EUR', rate: 0.92 },
    { code: 'SAR', rate: 3.75 },
    { code: 'AED', rate: 3.67 }
  ];
  const selectEl = document.getElementById('emCur');
  if (selectEl) {
    selectEl.innerHTML = currencies.map(c => `<option value="${c.code}">${c.code}</option>`).join('');
  }

  document.getElementById('emId').value = e?.id || '';
  document.getElementById('emCat').value = e?.category || '';
  document.getElementById('emAmt').value = e?.amount || '';
  document.getElementById('emCur').value = e?.currency || APP.settings.defaultCurrency || 'USD';
  
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
    currency: document.getElementById('emCur').value.trim(),
    date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    notes: document.getElementById('emNotes').value.trim(),
    recurring: document.getElementById('emRecur').checked
  };
  if (!data.category) return showToast('Category required', 'error');
  if (data.amount < 0) return showToast('Expense amount cannot be negative', 'error');
  let res;
  if (id) { data.id = id; res = await window.api.updateExpense(data); }
  else { res = await window.api.createExpense(data); }
  if (res.success) { closeModal('expModal'); showToast('Expense saved'); render_accounting(); }
  else showToast(res.error, 'error');
};

window.deleteExp = function(id) {
  confirmAction(t('confirm'), async () => {
    const res = await window.api.deleteExpense(id);
    if (res.success) { showToast('Expense deleted'); render_accounting(); }
  });
};
