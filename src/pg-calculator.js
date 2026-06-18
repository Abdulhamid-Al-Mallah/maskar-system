/* pg-calculator.js */
let _calcTab = 'materials';
let _matPage = 1;

window.render_calculator = async function() {
  APP.materials = await window.api.getMaterials() || [];
  APP.products = await window.api.getProducts() || [];
  const pg = document.getElementById('page-calculator');
  const modals = document.getElementById('modalContainer');

  pg.innerHTML = `
    <div class="page-header"><h1>${t('calculator','nav')}</h1></div>
    <div class="filter-bar mb-16">
      <button class="btn ${_calcTab==='materials'?'btn-gold':'btn-outline'}" onclick="_calcTab='materials';render_calculator()">📦 ${t('materials','calc')}</button>
      <button class="btn ${_calcTab==='formula'?'btn-gold':'btn-outline'}" onclick="_calcTab='formula';render_calculator()">🧪 ${t('formula','calc')}</button>
    </div>
    <div id="calcContent"></div>`;

  if (_calcTab === 'materials') renderMaterialsTab();
  else renderFormulaTab();

  if (!document.getElementById('matModal')) {
    const cats = ['perfume_oil','alcohol','bottle','cap','box','label','packaging','additive','other'];
    modals.insertAdjacentHTML('beforeend', renderModal('matModal', 'Material', `
      <div class="form-grid">
        <div class="form-group"><label>${t('name')}</label><input id="mmName"></div>
        <div class="form-group"><label>${t('category')}</label><select id="mmCat">${cats.map(c=>`<option value="${c}">${formatCategory(c)}</option>`).join('')}</select></div>
        <div class="form-group"><label>${t('unitType','calc')}</label><select id="mmUnit"><option value="g">g</option><option value="ml">ml</option><option value="pcs">pcs</option></select></div>
        <div class="form-group"><label>${t('unitCost','calc')}</label><input id="mmCost" type="number" step="0.001"></div>
        <div class="form-group"><label>${t('supplier','calc')}</label><input id="mmSupplier"></div>
        <div class="form-group full-width"><label>${t('notes')}</label><textarea id="mmNotes" rows="2"></textarea></div>
      </div><input type="hidden" id="mmId">`,
      `<button class="btn btn-outline" onclick="closeModal('matModal')">${t('cancel')}</button>
       <button class="btn btn-gold" onclick="saveMat()">${t('save')}</button>`));
  }
};

function renderMaterialsTab() {
  const el = document.getElementById('calcContent');
  const pgData = paginate(APP.materials, _matPage);
  _matPage = pgData.page;

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0">${t('materials','calc')}</div>
        <button class="btn btn-gold btn-sm" onclick="openMatModal()">${ICONS.plus} ${t('add')}</button>
      </div>
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th>${t('name')}</th><th>${t('category')}</th><th>${t('unitType','calc')}</th><th>${t('unitCost','calc')}</th><th>${t('supplier','calc')}</th><th class="text-right">${t('actions')}</th>
        </tr></thead><tbody>
        ${pgData.items.length ? pgData.items.map(m => `<tr>
          <td class="fw-700">${m.name}</td><td>${formatCategory(m.category)}</td><td>${m.unitType||'-'}</td>
          <td class="text-gold">$${(m.unitCost||0).toFixed(3)}</td><td class="text-muted">${m.supplier||'-'}</td>
          <td><div class="table-actions">
            <button class="btn-icon-only edit" onclick="openMatModal('${m.id}')">${ICONS.edit}</button>
            <button class="btn-icon-only delete" onclick="deleteMat('${m.id}')">${ICONS.trash}</button>
          </div></td>
        </tr>`).join('') : `<tr><td colspan="6" class="empty-state">${t('noData')}</td></tr>`}
        </tbody></table>
      </div>
      ${renderPagination(pgData)}
    </div>`;

  // Pagination
  el.querySelectorAll('.page-btn[data-p]').forEach(b => b.addEventListener('click', () => { _matPage = parseInt(b.dataset.p); renderMaterialsTab(); }));
}

let _formulaProductId = '';
let _newFormulaProductName = '';
let _isNewFormulaMode = false;
let _formulaRows = [];

window.toggleNewFormulaMode = function(isNew) {
  _isNewFormulaMode = isNew;
  if (isNew) {
    _formulaProductId = '';
    _formulaRows = [{ id: uid(), materialId: '', quantity: 0, unitCostSnapshot: 0 }];
  } else {
    _newFormulaProductName = '';
    _formulaRows = [];
  }
  renderFormulaTab();
};

function renderFormulaTab() {
  const el = document.getElementById('calcContent');

  const productSelectHtml = `
    <div class="form-group mb-16" id="formulaProductSelectGroup" style="${_isNewFormulaMode ? 'display:none' : ''}">
      <label>Select Existing Product</label>
      <div class="flex gap-10">
        <select id="formulaProduct" style="max-width:400px">
          <option value="">-- Choose --</option>
          ${APP.products.map(p => `<option value="${p.id}" ${p.id===_formulaProductId?'selected':''}>${getProductName(p)}</option>`).join('')}
        </select>
        <button class="btn btn-outline btn-sm" onclick="toggleNewFormulaMode(true)">+ Create New Product</button>
      </div>
    </div>
  `;

  const newProductInputHtml = `
    <div class="form-group mb-16" id="formulaNewProductGroup" style="${_isNewFormulaMode ? '' : 'display:none'}">
      <label>New Formula / Product Name</label>
      <div class="flex gap-10">
        <input type="text" id="formulaNewProductName" placeholder="Enter Product Name..." value="${_newFormulaProductName || ''}" style="max-width:400px">
        <button class="btn btn-outline btn-sm" onclick="toggleNewFormulaMode(false)">Choose Existing</button>
      </div>
    </div>
  `;

  el.innerHTML = `
    <div class="card">
      ${productSelectHtml}
      ${newProductInputHtml}
      <div id="formulaEditor"></div>
    </div>`;

  if (_isNewFormulaMode) {
    renderFormulaEditor();
  } else {
    const sel = document.getElementById('formulaProduct');
    if (sel && sel.value) {
      renderFormulaEditor();
    }
  }

  const selectEl = document.getElementById('formulaProduct');
  if (selectEl) {
    selectEl.addEventListener('change', async e => {
      _formulaProductId = e.target.value;
      if (_formulaProductId) {
        _formulaRows = await window.api.getFormulas(_formulaProductId) || [];
        renderFormulaEditor();
      } else {
        document.getElementById('formulaEditor').innerHTML = '';
      }
    });
  }

  const nameInput = document.getElementById('formulaNewProductName');
  if (nameInput) {
    nameInput.addEventListener('input', e => {
      _newFormulaProductName = e.target.value;
    });
  }
}

function renderFormulaEditor() {
  const el = document.getElementById('formulaEditor');
  if (!el) return;
  const totalCost = _formulaRows.reduce((s,r) => s + (r.quantity||0) * (r.unitCostSnapshot||0), 0);

  el.innerHTML = `
    <h3 style="font-size:0.9rem;color:var(--gold);margin-bottom:12px">${t('formula','calc')}</h3>
    <div id="formulaRowsContainer">
      ${_formulaRows.map((r, i) => {
        const mat = APP.materials.find(m => m.id === r.materialId);
        return `<div class="cart-item">
          <select class="fr-mat" data-i="${i}">
            <option value="">-- Material --</option>
            ${APP.materials.map(m => `<option value="${m.id}" ${m.id===r.materialId?'selected':''}>${m.name} (${m.unitType})</option>`).join('')}
          </select>
          <input type="number" class="fr-qty" data-i="${i}" value="${r.quantity||0}" step="0.01" placeholder="Qty">
          <span class="text-muted" id="fr-row-cost-${i}" style="font-size:0.8rem">$${((r.quantity||0)*(r.unitCostSnapshot||0)).toFixed(3)}</span>
          <button class="btn-icon-only delete" onclick="_formulaRows.splice(${i},1);renderFormulaEditor()">${ICONS.trash}</button>
        </div>`;
      }).join('')}
    </div>
    <button class="btn btn-outline btn-sm mt-16" onclick="_formulaRows.push({id:uid(),materialId:'',quantity:0,unitCostSnapshot:0});renderFormulaEditor()">${ICONS.plus} Add Row</button>
    <div class="totals-block">
      <div class="total-row grand"><span>Total Formula Cost</span><span id="fr-grand-total">$${totalCost.toFixed(3)}</span></div>
    </div>
    <button class="btn btn-gold mt-16" onclick="saveFormulaClicked()">${t('save')} Formula</button>`;

  el.querySelectorAll('.fr-mat').forEach(s => s.addEventListener('change', e => {
    const i = parseInt(e.target.dataset.i);
    const mat = APP.materials.find(m => m.id === e.target.value);
    _formulaRows[i].materialId = e.target.value;
    _formulaRows[i].unitCostSnapshot = mat?.unitCost || 0;
    renderFormulaEditor();
  }));
  el.querySelectorAll('.fr-qty').forEach(inp => inp.addEventListener('input', e => {
    const i = parseInt(inp.dataset.i);
    _formulaRows[i].quantity = parseFloat(e.target.value) || 0;
    updateFormulaTotals();
  }));
}

function updateFormulaTotals() {
  let totalCost = 0;
  _formulaRows.forEach((r, i) => {
    const rowCost = (r.quantity || 0) * (r.unitCostSnapshot || 0);
    totalCost += rowCost;
    const rowCostSpan = document.getElementById(`fr-row-cost-${i}`);
    if (rowCostSpan) {
      rowCostSpan.textContent = `$${rowCost.toFixed(3)}`;
    }
  });
  const grandTotalSpan = document.getElementById('fr-grand-total');
  if (grandTotalSpan) {
    grandTotalSpan.textContent = `$${totalCost.toFixed(3)}`;
  }
}

window.saveFormulaClicked = async function() {
  for (const r of _formulaRows) {
    if (!r.materialId) return showToast('Please select a material for all rows', 'error');
    if (r.quantity <= 0) return showToast('Quantity must be greater than 0 for all materials', 'error');
  }

  const totalCost = _formulaRows.reduce((s,r) => s + (r.quantity||0)*(r.unitCostSnapshot||0), 0);

  if (_isNewFormulaMode) {
    const nameVal = (_newFormulaProductName || '').trim();
    if (!nameVal) return showToast('Formula / Product Name is required', 'error');

    const sku = 'MSK-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const productData = {
      sku: sku,
      nameEn: nameVal,
      nameAr: nameVal,
      nameTr: nameVal,
      slug: slugify(nameVal),
      price: totalCost,
      costOfGoodsSold: totalCost,
      stock: 0,
      descriptionEn: '',
      descriptionAr: '',
      published: true,
      notes: [], attributes: []
    };

    const prodRes = await window.api.createProduct(productData);
    if (!prodRes.success) {
      return showToast(prodRes.error || 'Failed to create product for formula', 'error');
    }

    APP.products = await window.api.getProducts() || [];
    const createdProd = APP.products.find(p => p.sku === sku);
    if (!createdProd) return showToast('Failed to find created product', 'error');

    const formRes = await window.api.saveFormulas(createdProd.id, _formulaRows);
    if (formRes.success) {
      showToast('New product and formula saved!');
      _isNewFormulaMode = false;
      _formulaProductId = createdProd.id;
      _newFormulaProductName = '';
      render_calculator();
    } else {
      showToast(formRes.error || 'Failed to save formula', 'error');
    }
  } else {
    if (!_formulaProductId) return showToast('Choose a product', 'error');
    const res = await window.api.saveFormulas(_formulaProductId, _formulaRows);
    if (res.success) {
      const prod = APP.products.find(p => p.id === _formulaProductId);
      if (prod) {
        prod.costOfGoodsSold = totalCost;
        await window.api.updateProduct(prod);
      }
      showToast('Formula saved & COGS updated');
      render_calculator();
    } else {
      showToast(res.error, 'error');
    }
  }
};

window.openMatModal = function(id) {
  const m = id ? APP.materials.find(x => x.id === id) : null;
  document.getElementById('mmId').value = m?.id || '';
  document.getElementById('mmName').value = m?.name || '';
  document.getElementById('mmCat').value = m?.category || 'perfume_oil';
  document.getElementById('mmUnit').value = m?.unitType || 'ml';
  document.getElementById('mmCost').value = m?.unitCost || '';
  document.getElementById('mmSupplier').value = m?.supplier || '';
  document.getElementById('mmNotes').value = m?.notes || '';
  openModal('matModal');
};

window.saveMat = async function() {
  const data = {
    id: document.getElementById('mmId').value || undefined,
    name: document.getElementById('mmName').value.trim(),
    category: document.getElementById('mmCat').value,
    unitType: document.getElementById('mmUnit').value,
    unitCost: parseFloat(document.getElementById('mmCost').value) || 0,
    supplier: document.getElementById('mmSupplier').value.trim(),
    notes: document.getElementById('mmNotes').value.trim(),
    isActive: true
  };
  if (!data.name) return showToast('Name required', 'error');
  if (data.unitCost < 0) return showToast('Unit cost cannot be negative', 'error');
  const res = await window.api.saveMaterial(data);
  if (res.success) { closeModal('matModal'); showToast('Material saved'); render_calculator(); }
  else showToast(res.error, 'error');
};

window.deleteMat = function(id) {
  confirmAction(t('confirm'), async () => {
    const res = await window.api.deleteMaterial(id);
    if (res.success) { showToast('Material deleted'); render_calculator(); }
  });
};
