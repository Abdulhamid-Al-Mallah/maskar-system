/* pg-settings.js */
window.render_settings = async function() {
  APP.settings = await window.api.getSettings() || {};
  const pg = document.getElementById('page-settings');
  const s = APP.settings;

  // Make sure currencies exists
  if (!s.currencies || s.currencies.length === 0) {
    s.currencies = [
      { code: 'USD', rate: 1 },
      { code: 'TRY', rate: 34 }
    ];
  } else {
    // Keep only USD and TRY
    const usd = s.currencies.find(c => c.code === 'USD') || { code: 'USD', rate: 1 };
    const tryCurr = s.currencies.find(c => c.code === 'TRY') || { code: 'TRY', rate: 34 };
    s.currencies = [usd, tryCurr];
  }

  const tryRate = s.currencies.find(c => c.code === 'TRY')?.rate || 34;

  pg.innerHTML = `
    <div class="page-header"><h1>${t('settings','nav')}</h1></div>
    <div class="card">
      <div class="settings-section">
        <h3>💱 ${t('currency')}</h3>
        <div class="form-grid mb-16" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
          <div class="form-group">
            <label>Turkish Lira Exchange Rate (1 USD = ? TRY)</label>
            <input type="number" id="stTryRate" step="0.0001" min="0" value="${tryRate}">
          </div>
          <div class="form-group">
            <label>${t('defCurr','settings')}</label>
            <select id="stCurrency">
              <option value="USD" ${(s.defaultCurrency||'USD')==='USD'?'selected':''}>USD ($)</option>
              <option value="TRY" ${(s.defaultCurrency||'USD')==='TRY'?'selected':''}>TRY (TL)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>🏪 Shop Info</h3>
        <div class="form-grid">
          <div class="form-group"><label>${t('shopName','settings')}</label><input id="stShopName" value="${s.shopName||'MASKAR Perfumes'}"></div>
          <div class="form-group"><label>${t('shopPhone','settings')}</label><input id="stShopPhone" value="${s.shopPhone||''}"></div>
          <div class="form-group full-width"><label>${t('shopAddr','settings')}</label><textarea id="stShopAddr" rows="2">${s.shopAddress||''}</textarea></div>
        </div>
      </div>

      <div class="settings-section">
        <h3>📦 ${t('shipping','order')}</h3>
        <div class="form-grid">
          <div class="form-group"><label>${t('shipFee','settings')}</label><input id="stShipFee" type="number" step="0.01" value="${s.shippingFee||0}"></div>
          <div class="form-group"><label>${t('lowThresh','settings')}</label><input id="stLowThresh" type="number" min="0" value="${s.lowStockThreshold||5}"></div>
        </div>
      </div>

      <div class="settings-section">
        <h3>📈 Profit Percentage</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Default Profit Percentage (%)</label>
            <input type="number" id="stProfitPct" min="0" step="0.1" value="${s.profitPercentage||0}">
          </div>
        </div>
      </div>

      <button class="btn btn-gold" onclick="saveAllSettings()" style="margin-top:12px">${t('save')} ${t('settings','nav')}</button>

      <div class="settings-section" style="margin-top:32px">
        <h3>💾 ${t('backup','settings')}</h3>
        <div class="flex gap-10">
          <button class="btn btn-outline" onclick="exportBackup()">${ICONS.download} ${t('export','settings')}</button>
          <button class="btn btn-outline" onclick="importBackup()">📂 ${t('import','settings')}</button>
        </div>
      </div>
    </div>`;
};

window.saveAllSettings = async function() {
  const tryRateInput = document.getElementById('stTryRate');
  const tryRateVal = parseFloat(tryRateInput.value);
  if (isNaN(tryRateVal) || tryRateVal <= 0) {
    return showToast('Exchange rate must be a valid number greater than 0', 'error');
  }

  APP.settings.currencies = [
    { code: 'USD', rate: 1 },
    { code: 'TRY', rate: tryRateVal }
  ];

  APP.settings.defaultCurrency = document.getElementById('stCurrency').value;
  APP.settings.shopName = document.getElementById('stShopName').value.trim();
  APP.settings.shopPhone = document.getElementById('stShopPhone').value.trim();
  APP.settings.shopAddress = document.getElementById('stShopAddr').value.trim();
  APP.settings.shippingFee = parseFloat(document.getElementById('stShipFee').value) || 0;
  APP.settings.lowStockThreshold = parseInt(document.getElementById('stLowThresh').value) || 5;
  APP.settings.profitPercentage = parseFloat(document.getElementById('stProfitPct').value) || 0;

  // Cleanup old settings if any
  delete APP.settings.billLanguage;
  delete APP.billLang;

  const res = await window.api.saveSettings(APP.settings);
  if (res.success) {
    showToast('Settings saved. Recalculating product prices...');
    await window.recalculateAllProductPrices();
    showToast('Settings and prices updated.');
  } else showToast(res.error, 'error');
};

window.exportBackup = async function() {
  const res = await window.api.exportData();
  if (res.success) showToast('Backup exported to: ' + res.path);
  else if (res.reason !== 'canceled') showToast(res.error || 'Failed', 'error');
};

window.importBackup = async function() {
  confirmAction('This will overwrite all current data. Continue?', async () => {
    const res = await window.api.importData();
    if (res.success) showToast('Backup restored! Reloading...');
    else if (res.reason !== 'canceled') showToast(res.error || 'Failed', 'error');
  });
};
