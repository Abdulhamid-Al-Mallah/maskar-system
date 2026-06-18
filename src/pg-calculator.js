/* pg-calculator.js */
const DRAG_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>';
let _calcTab = 'materials';
let _matPage = 1;
let _matSearch = '';
let _matCategory = '';
let _matSortBy = 'name_asc';
let _draggedIndex = null;

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
    const cats = ['perfume_oil','alcohol','bottle','label','packaging','additive','other'];
    modals.insertAdjacentHTML('beforeend', renderModal('matModal', 'Material', `
      <div class="form-grid">
        <div class="form-group"><label>${t('name')}</label><input id="mmName"></div>
        <div class="form-group"><label>${t('category')}</label><select id="mmCat">${cats.map(c=>`<option value="${c}">${formatCategory(c)}</option>`).join('')}</select></div>
        <div class="form-group"><label>${t('unitType','calc')}</label><select id="mmUnit"><option value="g">g</option><option value="ml">ml</option><option value="pcs">pcs</option></select></div>
        <div class="form-group"><label>${t('unitCost','calc')}</label><input id="mmCost" type="number" step="0.001"></div>
        <div class="form-group"><label>${t('supplier','calc')}</label><input id="mmSupplier"></div>
        <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 1.8rem;">
          <label class="switch-container">
            <div class="switch-wrapper">
              <input type="checkbox" id="mmTrackStock" onchange="toggleMatStockInput()">
              <span class="switch-slider"></span>
            </div>
            <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-color);">Track Stock</span>
          </label>
        </div>
        <div class="form-group" id="mmStockGroup"><label>Stock</label><input id="mmStock" type="number" step="0.01" min="0"></div>
        <div class="form-group full-width"><label>${t('notes')}</label><textarea id="mmNotes" rows="2"></textarea></div>
      </div><input type="hidden" id="mmId">`,
      `<button class="btn btn-outline" onclick="closeModal('matModal')">${t('cancel')}</button>
       <button class="btn btn-gold" onclick="saveMat()">${t('save')}</button>`));
  }
};

window.toggleMatSort = function(col) {
  if (col === 'name') {
    _matSortBy = (_matSortBy === 'name_asc') ? 'name_desc' : 'name_asc';
  } else if (col === 'stock') {
    _matSortBy = (_matSortBy === 'stock_asc') ? 'stock_desc' : 'stock_asc';
  } else if (col === 'cost') {
    _matSortBy = (_matSortBy === 'cost_asc') ? 'cost_desc' : 'cost_asc';
  }
  _matPage = 1;
  renderMaterialsTab();
};

function renderMaterialsTab() {
  const el = document.getElementById('calcContent');
  const cats = ['perfume_oil','alcohol','bottle','label','packaging','additive','other'];

  let filtered = APP.materials;
  if (_matSearch) {
    const q = _matSearch.toLowerCase();
    filtered = filtered.filter(m => 
      (m.name||'').toLowerCase().includes(q) || 
      (m.supplier||'').toLowerCase().includes(q)
    );
  }
  if (_matCategory) {
    filtered = filtered.filter(m => m.category === _matCategory);
  }

  // Sorting
  if (_matSortBy === 'name_asc') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (_matSortBy === 'name_desc') {
    filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
  } else if (_matSortBy === 'stock_asc') {
    filtered.sort((a, b) => (a.stock || 0) - (b.stock || 0));
  } else if (_matSortBy === 'stock_desc') {
    filtered.sort((a, b) => (b.stock || 0) - (a.stock || 0));
  } else if (_matSortBy === 'cost_asc') {
    filtered.sort((a, b) => (a.unitCost || 0) - (b.unitCost || 0));
  } else if (_matSortBy === 'cost_desc') {
    filtered.sort((a, b) => (b.unitCost || 0) - (a.unitCost || 0));
  }

  const pgData = paginate(filtered, _matPage);
  _matPage = pgData.page;

  el.innerHTML = `
    <div class="card">
      <div class="flex-between mb-16">
        <div class="card-title" style="margin:0">${t('materials','calc')}</div>
        <button class="btn btn-gold btn-sm" onclick="openMatModal()">${ICONS.plus} ${t('add')}</button>
      </div>
      <div class="filter-bar mb-16">
        <div class="form-group search-wrap" style="flex:2">
          ${ICONS.search}
          <input type="text" id="matSearch" placeholder="${t('search')}" value="${_matSearch}">
        </div>
        <div class="form-group" style="min-width: 180px;">
          <select id="matCategoryFilter">
            <option value="">All Categories</option>
            ${cats.map(c => `<option value="${c}" ${_matCategory===c?'selected':''}>${formatCategory(c)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table"><thead><tr>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleMatSort('name')">${t('name')}${getHeaderArrow(_matSortBy, 'name_asc', 'name_desc')}</th>
          <th>${t('category')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleMatSort('stock')">Stock${getHeaderArrow(_matSortBy, 'stock_asc', 'stock_desc')}</th>
          <th>${t('unitType','calc')}</th>
          <th style="cursor:pointer; user-select:none;" onclick="window.toggleMatSort('cost')">${t('unitCost','calc')}${getHeaderArrow(_matSortBy, 'cost_asc', 'cost_desc')}</th>
          <th>${t('supplier','calc')}</th>
          <th class="text-right">${t('actions')}</th>
        </tr></thead><tbody>
        ${pgData.items.length ? pgData.items.map(m => `<tr>
          <td class="fw-700">${m.name}</td><td>${formatCategory(m.category)}</td>
          <td class="text-gold">${m.trackStock !== false ? (m.stock !== undefined ? m.stock : 0) : '∞'}</td>
          <td>${m.unitType||'-'}</td>
          <td class="text-gold">$${(m.unitCost||0).toFixed(3)}</td><td class="text-muted">${m.supplier||'-'}</td>
          <td><div class="table-actions">
            <button class="btn-icon-only edit" onclick="openMatModal('${m.id}')">${ICONS.edit}</button>
            <button class="btn-icon-only delete" onclick="deleteMat('${m.id}')">${ICONS.trash}</button>
          </div></td>
        </tr>`).join('') : `<tr><td colspan="7" class="empty-state">${t('noData')}</td></tr>`}
        </tbody></table>
      </div>
      ${renderPagination(pgData)}
    </div>`;

  // Search listener
  const searchInput = el.querySelector('#matSearch');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      _matSearch = e.target.value;
      _matPage = 1;
      renderMaterialsTab();
      const input = document.getElementById('matSearch');
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    });
  }

  // Category filter listener
  const catFilter = el.querySelector('#matCategoryFilter');
  if (catFilter) {
    catFilter.addEventListener('change', e => {
      _matCategory = e.target.value;
      _matPage = 1;
      renderMaterialsTab();
    });
  }
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
        return `<div class="cart-item formula-row" id="fr-row-${i}" 
             ondragstart="window.onFormulaDragStart(event, ${i})" 
             ondragover="window.onFormulaDragOver(event, ${i})" 
             ondragenter="window.onFormulaDragEnter(event, ${i})" 
             ondragleave="window.onFormulaDragLeave(event, ${i})" 
             ondragend="window.onFormulaDragEnd(event, ${i})" 
             ondrop="window.onFormulaDrop(event, ${i})">
          <div class="drag-handle" 
               onmousedown="document.getElementById('fr-row-${i}').setAttribute('draggable', 'true')" 
               onmouseup="document.getElementById('fr-row-${i}').setAttribute('draggable', 'false')">
            ${DRAG_ICON}
          </div>
          <div class="search-select-container" style="position: relative; flex: 2; min-width: 150px;">
            <input type="text" class="fr-mat-search" data-i="${i}" placeholder="Search material..." value="${mat ? `${mat.name} (${mat.unitType})` : ''}" autocomplete="off" style="width: 100%;">
            <div class="search-select-dropdown fr-mat-dropdown" id="fr-mat-drop-${i}" style="display: none;"></div>
          </div>
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

  // Helper to render dropdown list items
  const renderMatDropdownItems = (inputEl, dropdownEl, filterText = '') => {
    const i = parseInt(inputEl.dataset.i);
    const query = filterText.toLowerCase().trim();
    const filtered = APP.materials.filter(m => 
      m.name.toLowerCase().includes(query) || 
      (m.category && m.category.toLowerCase().includes(query)) ||
      (m.supplier && m.supplier.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
      dropdownEl.innerHTML = `<div class="search-select-item" style="cursor: default; color: var(--text-muted); justify-content: center; font-size: 0.85rem; padding: 10px;">No materials found</div>`;
      return;
    }

    dropdownEl.innerHTML = filtered.map(m => `
      <div class="search-select-item" data-id="${m.id}" style="padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px solid var(--border);">
        <span class="name" style="font-weight: 600; color: var(--text-primary);">${m.name}</span>
        <span class="text-muted" style="font-size: 0.8rem;">${formatCategory(m.category)} (${m.unitType})</span>
      </div>
    `).join('');

    dropdownEl.querySelectorAll('.search-select-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const matId = item.dataset.id;
        const mat = APP.materials.find(x => x.id === matId);
        _formulaRows[i].materialId = matId;
        _formulaRows[i].unitCostSnapshot = mat?.unitCost || 0;
        
        inputEl.value = mat ? `${mat.name} (${mat.unitType})` : '';
        dropdownEl.style.display = 'none';
        
        renderFormulaEditor();
      });
    });
  };

  el.querySelectorAll('.fr-mat-search').forEach(inputEl => {
    const i = parseInt(inputEl.dataset.i);
    const dropdownEl = document.getElementById(`fr-mat-drop-${i}`);

    inputEl.addEventListener('focus', () => {
      document.querySelectorAll('.fr-mat-dropdown').forEach(d => d.style.display = 'none');
      dropdownEl.style.display = 'block';
      renderMatDropdownItems(inputEl, dropdownEl, inputEl.value);
    });

    inputEl.addEventListener('input', (e) => {
      dropdownEl.style.display = 'block';
      renderMatDropdownItems(inputEl, dropdownEl, e.target.value);
    });
  });

  const outsideClickListener = (e) => {
    if (!e.target.closest('.search-select-container')) {
      document.querySelectorAll('.fr-mat-dropdown').forEach(d => d.style.display = 'none');
      document.removeEventListener('click', outsideClickListener);
    }
  };
  
  el.querySelectorAll('.fr-mat-search').forEach(inputEl => {
    inputEl.addEventListener('click', (e) => {
      e.stopPropagation();
      document.addEventListener('click', outsideClickListener);
    });
  });
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
      showToast('New product and formula saved. Recalculating prices...');
      await window.recalculateAllProductPrices();
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
      showToast('Formula saved & COGS updated. Recalculating prices...');
      await window.recalculateAllProductPrices();
      render_calculator();
    } else {
      showToast(res.error, 'error');
    }
  }
};

window.toggleMatStockInput = function() {
  const track = document.getElementById('mmTrackStock').checked;
  document.getElementById('mmStockGroup').style.display = track ? 'block' : 'none';
};

window.openMatModal = function(id) {
  const m = id ? APP.materials.find(x => x.id === id) : null;
  document.getElementById('mmId').value = m?.id || '';
  document.getElementById('mmName').value = m?.name || '';
  document.getElementById('mmCat').value = m?.category || 'perfume_oil';
  document.getElementById('mmUnit').value = m?.unitType || 'ml';
  document.getElementById('mmCost').value = m?.unitCost || '';
  
  const track = m ? (m.trackStock !== false) : true;
  document.getElementById('mmTrackStock').checked = track;
  document.getElementById('mmStock').value = m?.stock !== undefined ? m?.stock : '0';
  document.getElementById('mmStockGroup').style.display = track ? 'block' : 'none';
  
  document.getElementById('mmSupplier').value = m?.supplier || '';
  document.getElementById('mmNotes').value = m?.notes || '';
  openModal('matModal');
};

window.saveMat = async function() {
  const track = document.getElementById('mmTrackStock').checked;
  const data = {
    id: document.getElementById('mmId').value || undefined,
    name: document.getElementById('mmName').value.trim(),
    category: document.getElementById('mmCat').value,
    unitType: document.getElementById('mmUnit').value,
    unitCost: parseFloat(document.getElementById('mmCost').value) || 0,
    trackStock: track,
    stock: track ? (parseFloat(document.getElementById('mmStock').value) || 0) : 0,
    supplier: document.getElementById('mmSupplier').value.trim(),
    notes: document.getElementById('mmNotes').value.trim(),
    isActive: true
  };
  if (!data.name) return showToast('Name required', 'error');
  if (data.unitCost < 0) return showToast('Unit cost cannot be negative', 'error');
  if (track && data.stock < 0) return showToast('Stock cannot be negative', 'error');
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

/* Formula Drag and Drop Handlers */
window.onFormulaDragStart = function(e, index) {
  _draggedIndex = index;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', index);
  const rowEl = document.getElementById(`fr-row-${index}`);
  if (rowEl) rowEl.classList.add('dragging');
};

window.onFormulaDragOver = function(e, index) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

window.onFormulaDragEnter = function(e, index) {
  if (_draggedIndex === null || _draggedIndex === index) return;
  const rowEl = document.getElementById(`fr-row-${index}`);
  if (rowEl) rowEl.classList.add('drag-over');
};

window.onFormulaDragLeave = function(e, index) {
  const rowEl = document.getElementById(`fr-row-${index}`);
  if (rowEl) rowEl.classList.remove('drag-over');
};

window.onFormulaDragEnd = function(e, index) {
  const rowEl = document.getElementById(`fr-row-${index}`);
  if (rowEl) {
    rowEl.setAttribute('draggable', 'false');
    rowEl.classList.remove('dragging');
  }
  _draggedIndex = null;
};

window.onFormulaDrop = function(e, index) {
  e.preventDefault();
  const rowEl = document.getElementById(`fr-row-${index}`);
  if (rowEl) rowEl.classList.remove('drag-over');

  if (_draggedIndex === null || _draggedIndex === index) return;

  const draggedRow = _formulaRows[_draggedIndex];
  _formulaRows.splice(_draggedIndex, 1);
  _formulaRows.splice(index, 0, draggedRow);

  _draggedIndex = null;
  renderFormulaEditor();
};
