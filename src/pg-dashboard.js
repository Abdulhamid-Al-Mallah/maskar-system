/* pg-dashboard.js */
window.render_dashboard = async function() {
  await loadAllData();
  const pg = document.getElementById('page-dashboard');
  const orders = APP.orders;
  const products = APP.products;
  const customers = APP.customers;
  const expenses = APP.expenses;
  const thresh = parseInt(APP.settings.lowStockThreshold) || 5;

  const delivered = orders.filter(o => o.status === 'delivered');
  const revenue = delivered.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const pending = orders.filter(o => o.status === 'pending').length;
  const lowStock = products.filter(p => (p.stock || 0) <= thresh).length;

  // Top sellers
  const salesMap = {};
  orders.forEach(o => {
    if (o.items) o.items.forEach(it => {
      if (!salesMap[it.productId]) salesMap[it.productId] = { qty: 0, rev: 0 };
      salesMap[it.productId].qty += it.quantity || 0;
      salesMap[it.productId].rev += (it.quantity || 0) * (it.price || 0);
    });
  });
  const topSellers = Object.entries(salesMap)
    .map(([pid, d]) => ({ product: products.find(p => p.id === pid), ...d }))
    .filter(x => x.product)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Recent orders
  const recent = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

  // P&L
  const totalCogs = delivered.reduce((s, o) => {
    if (!o.items) return s;
    return s + o.items.reduce((ss, it) => {
      const prod = products.find(p => p.id === it.productId);
      return ss + ((prod?.costOfGoodsSold || 0) * (it.quantity || 0));
    }, 0);
  }, 0);
  const totalExpenses = expenses.reduce((s, e) => {
    const amt = parseFloat(e.amount) || 0;
    const eCur = e.currency || 'USD';
    if (eCur === 'USD') return s + amt;
    const currObj = (APP.settings.currencies || []).find(c => c.code === eCur);
    const rate = currObj ? currObj.rate : 1;
    return s + (amt / rate);
  }, 0);
  const grossProfit = revenue - totalCogs;
  const netProfit = grossProfit - totalExpenses;
  const cur = APP.settings.defaultCurrency || 'USD';

  pg.innerHTML = `
    <div class="page-header"><h1>${t('dashboard','nav')}</h1></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">${t('Revenue','dashboard')}</div><div class="stat-value">${fmt(revenue, 'USD')}</div></div>
      <div class="stat-card"><div class="stat-label">${t('Pending','dashboard')}</div><div class="stat-value">${pending}</div></div>
      <div class="stat-card"><div class="stat-label">${t('Low Stock','dashboard')}</div><div class="stat-value">${lowStock}</div></div>
      <div class="stat-card"><div class="stat-label">${t('Customers','dashboard')}</div><div class="stat-value">${customers.length}</div></div>
    </div>
    <div class="dash-grid">
      <div class="card">
        <div class="card-title">${t('Top Sellers','dashboard')}</div>
        <table class="data-table"><thead><tr><th>${t('name')}</th><th>${t('qty')}</th><th>${t('total')}</th></tr></thead>
        <tbody>${topSellers.length ? topSellers.map(s => `<tr><td class="fw-700">${getProductName(s.product)}</td><td>${s.qty}</td><td class="text-gold">${fmt(s.rev, 'USD')}</td></tr>`).join('') : `<tr><td colspan="3" class="empty-state">${t('noData')}</td></tr>`}</tbody></table>
      </div>
      <div class="card">    
        <div class="card-title">${t('Recent Orders','dashboard')}</div>
        <table class="data-table"><thead><tr><th>${t('orderNo','order')}</th><th>${t('customer')}</th><th>${t('total')}</th><th>${t('status')}</th></tr></thead>
        <tbody>${recent.length ? recent.map(o => {
          const cust = APP.customers.find(c => c.id === o.customerId);
          return `<tr><td class="fw-700">${o.orderNumber||'-'}</td><td>${cust?.name||'-'}</td><td class="text-gold">${fmt(o.total, 'USD')}</td><td><span class="badge badge-${o.status}">${t(o.status,'order')}</span></td></tr>`;
        }).join('') : `<tr><td colspan="4" class="empty-state">${t('noData')}</td></tr>`}</tbody></table>
      </div>
      <div class="card dash-grid-full">
        <div class="card-title">${t('pnl','dashboard')}</div>
        <div class="totals-block">
          <div class="total-row"><span>${t('revenue','dashboard')}</span><span class="text-gold fw-700">${fmt(revenue, 'USD')}</span></div>
          <div class="total-row"><span>COGS</span><span class="text-error">${fmt(totalCogs, 'USD')}</span></div>
          <div class="total-row"><span>Gross Profit</span><span>${fmt(grossProfit, 'USD')}</span></div>
          <div class="total-row"><span>Expenses</span><span class="text-error">${fmt(totalExpenses, 'USD')}</span></div>
          <div class="total-row grand"><span>Net Profit</span><span>${fmt(netProfit, 'USD')}</span></div>
        </div>
      </div>
    </div>`;
};
