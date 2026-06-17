/* ═══════════════════════════════════════════════════════════════
   MASKAR Core — State, Navigation, Utilities, Toast, Modals, i18n
   ═══════════════════════════════════════════════════════════════ */

// ── Global State ──
const APP = {
  products: [], orders: [], customers: [], expenses: [],
  materials: [], settings: {},
  currentPage: 'dashboard', lang: 'en',
  pageSize: 12, currentPages: {}
};

// ── i18n ──
const LABELS = {
  nav: {
    dashboard:  { en: 'Dashboard',   ar: 'لوحة التحكم', tr: 'Panel' },
    products:   { en: 'Products',    ar: 'المنتجات',    tr: 'Ürünler' },
    inventory:  { en: 'Inventory',   ar: 'المخزون',     tr: 'Envanter' },
    orders:     { en: 'Orders',      ar: 'الطلبات',     tr: 'Siparişler' },
    customers:  { en: 'Customers',   ar: 'العملاء',     tr: 'Müşteriler' },
    accounting: { en: 'Accounting',  ar: 'المحاسبة',    tr: 'Muhasebe' },
    calculator: { en: 'Calculator',  ar: 'الحاسبة',     tr: 'Hesap' },
    settings:   { en: 'Settings',    ar: 'الإعدادات',   tr: 'Ayarlar' },
  },
  common: {
    save:     { en: 'Save',    ar: 'حفظ',    tr: 'Kaydet' },
    cancel:   { en: 'Cancel',  ar: 'إلغاء',  tr: 'İptal' },
    delete:   { en: 'Delete',  ar: 'حذف',    tr: 'Sil' },
    edit:     { en: 'Edit',    ar: 'تعديل',  tr: 'Düzenle' },
    add:      { en: 'Add',     ar: 'إضافة',  tr: 'Ekle' },
    search:   { en: 'Search...', ar: 'بحث...', tr: 'Ara...' },
    noData:   { en: 'No data found', ar: 'لا توجد بيانات', tr: 'Veri bulunamadı' },
    confirm:  { en: 'Are you sure?', ar: 'هل أنت متأكد؟', tr: 'Emin misiniz?' },
    name:     { en: 'Name',    ar: 'الاسم',   tr: 'Ad' },
    price:    { en: 'Price',   ar: 'السعر',   tr: 'Fiyat' },
    stock:    { en: 'Stock',   ar: 'المخزون', tr: 'Stok' },
    status:   { en: 'Status',  ar: 'الحالة',  tr: 'Durum' },
    actions:  { en: 'Actions', ar: 'إجراءات', tr: 'İşlemler' },
    total:    { en: 'Total',   ar: 'المجموع', tr: 'Toplam' },
    date:     { en: 'Date',    ar: 'التاريخ', tr: 'Tarih' },
    qty:      { en: 'Qty',     ar: 'الكمية',  tr: 'Adet' },
    customer: { en: 'Customer', ar: 'العميل', tr: 'Müşteri' },
    phone:    { en: 'Phone',   ar: 'الهاتف',  tr: 'Telefon' },
    address:  { en: 'Address', ar: 'العنوان', tr: 'Adres' },
    city:     { en: 'City',    ar: 'المدينة', tr: 'Şehir' },
    country:  { en: 'Country', ar: 'البلد',   tr: 'Ülke' },
    email:    { en: 'Email',   ar: 'البريد',  tr: 'E-posta' },
    category: { en: 'Category', ar: 'الفئة', tr: 'Kategori' },
    amount:   { en: 'Amount',  ar: 'المبلغ',  tr: 'Tutar' },
    notes:    { en: 'Notes',   ar: 'ملاحظات', tr: 'Notlar' },
    currency: { en: 'Currency', ar: 'العملة', tr: 'Para Birimi' },
  },
  dashboard: {
    revenue:  { en: 'Net Revenue',     ar: 'صافي الإيرادات', tr: 'Net Gelir' },
    pending:  { en: 'Pending Orders',  ar: 'طلبات معلقة',   tr: 'Bekleyen Siparişler' },
    lowStock: { en: 'Low Stock',       ar: 'مخزون منخفض',   tr: 'Düşük Stok' },
    custCount:{ en: 'Customers',       ar: 'العملاء',       tr: 'Müşteriler' },
    topSellers:{ en:'Top Sellers',     ar: 'الأكثر مبيعاً', tr: 'En Çok Satanlar' },
    recentOrders:{en:'Recent Orders',  ar: 'أحدث الطلبات',  tr: 'Son Siparişler' },
    pnl:      { en: 'Profit & Loss',   ar: 'الأرباح والخسائر', tr: 'Kar & Zarar' },
  },
  order: {
    newOrder: { en: 'New Order', ar: 'طلب جديد', tr: 'Yeni Sipariş' },
    orderNo:  { en: 'Order #',  ar: 'رقم الطلب', tr: 'Sipariş No' },
    subtotal: { en: 'Subtotal', ar: 'المجموع الفرعي', tr: 'Ara Toplam' },
    shipping: { en: 'Shipping', ar: 'الشحن',     tr: 'Kargo' },
    discount: { en: 'Discount', ar: 'الخصم',     tr: 'İndirim' },
    grandTotal:{en: 'Grand Total',ar:'الإجمالي', tr: 'Genel Toplam' },
    payment:  { en: 'Payment',  ar: 'الدفع',     tr: 'Ödeme' },
    printInv: { en: 'Print Invoice', ar: 'طباعة الفاتورة', tr: 'Fatura Yazdır' },
    cash:     { en: 'Cash',     ar: 'نقدي',      tr: 'Nakit' },
    card:     { en: 'Credit Card', ar: 'بطاقة', tr: 'Kredi Kartı' },
    credit_card: { en: 'Credit Card', ar: 'بطاقة', tr: 'Kredi Kartı' },
    transfer: { en: 'Transfer', ar: 'تحويل',    tr: 'Havale' },
    pending:  { en: 'Pending',  ar: 'معلق',      tr: 'Beklemede' },
    processing:{en:'Processing',ar: 'قيد التنفيذ',tr:'Hazırlanıyor' },
    shipped:  { en: 'Shipped',  ar: 'تم الشحن', tr: 'Kargoda' },
    delivered:{ en: 'Delivered', ar: 'تم التسليم',tr:'Teslim Edildi' },
    cancelled:{ en: 'Cancelled', ar: 'ملغي',    tr: 'İptal' },
  },
  settings: {
    usdRate:  { en: 'USD Exchange Rate', ar: 'سعر صرف الدولار', tr: 'Dolar Kuru' },
    defCurr:  { en: 'Default Bill Currency', ar: 'عملة الفاتورة', tr: 'Fatura Para Birimi' },
    shipFee:  { en: 'Default Shipping Fee', ar: 'رسوم الشحن', tr: 'Kargo Ücreti' },
    shopName: { en: 'Shop Name',  ar: 'اسم المتجر', tr: 'Mağaza Adı' },
    shopPhone:{ en: 'Shop Phone', ar: 'هاتف المتجر', tr: 'Mağaza Telefon' },
    shopAddr: { en: 'Shop Address',ar:'عنوان المتجر',tr: 'Mağaza Adres' },
    backup:   { en: 'Backup & Restore', ar: 'النسخ الاحتياطي', tr: 'Yedekleme' },
    export:   { en: 'Export Backup', ar: 'تصدير النسخة', tr: 'Yedeği Dışa Aktar' },
    import:   { en: 'Import Backup', ar: 'استيراد النسخة', tr: 'Yedeği İçe Aktar' },
    language: { en: 'Language',  ar: 'اللغة',     tr: 'Dil' },
    lowThresh:{ en: 'Low Stock Threshold', ar: 'حد المخزون المنخفض', tr: 'Düşük Stok Eşiği' },
  },
  calc: {
    materials:{ en: 'Materials Library', ar: 'مكتبة المواد', tr: 'Malzeme Kütüphanesi' },
    formula:  { en: 'Formula Editor', ar: 'محرر التركيبة', tr: 'Formül Düzenleyici' },
    matrix:   { en: 'Cost Matrix',  ar: 'مصفوفة التكلفة', tr: 'Maliyet Matrisi' },
    unitCost: { en: 'Unit Cost ($)', ar: 'تكلفة الوحدة ($)', tr: 'Birim Maliyet ($)' },
    supplier: { en: 'Supplier',   ar: 'المورد',    tr: 'Tedarikçi' },
    unitType: { en: 'Unit',       ar: 'الوحدة',    tr: 'Birim' },
  }
};

function t(key, sub) {
  const parts = sub ? LABELS[key]?.[sub] : null;
  const obj = parts || LABELS.common?.[key] || LABELS.nav?.[key];
  if (!obj) return key;
  return obj['en'] || key;
}

// ── SVG Icons (compact) ──
const ICONS = {
  dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  products: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  inventory: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  orders: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
  customers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  accounting: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  calculator: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  printer: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
};

const NAV_ITEMS = ['dashboard','products','inventory','orders','customers','accounting','calculator','settings'];

// ── Utilities ──
function uid() { return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0'); }

function fmt(val, cur) {
  const n = parseFloat(val) || 0;
  const c = cur || 'USD';
  if (c === 'USD') return '$' + n.toFixed(2);
  return n.toFixed(2) + ' ' + c;
}



function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function slugify(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

function formatCategory(cat) {
  if (!cat) return '-';
  if (cat === 'perfume_oil') return 'Perfume Oil';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function formatPaymentMethod(pm) {
  if (!pm) return '-';
  if (pm === 'credit_card') return 'Credit Card';
  return pm.charAt(0).toUpperCase() + pm.slice(1);
}

function getProductName(p, overrideLang) {
  if (!p) return '';
  const l = overrideLang || APP.lang;
  if (l==='ar' && p.nameAr) return p.nameAr;
  if (l==='tr' && p.nameTr) return p.nameTr;
  return p.nameEn || p.nameAr || p.nameTr || '';
}

function convertToLocal(usd) {
  const cur = APP.settings.defaultCurrency || 'USD';
  const currObj = (APP.settings.currencies || []).find(c => c.code === cur);
  const rate = currObj ? currObj.rate : 1;
  return (parseFloat(usd) || 0) * rate;
}

// ── Toast ──
function showToast(msg, type='success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3000);
}

// ── Modal ──
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }

function renderModal(id, title, bodyHtml, footerHtml, cls='') {
  return `<div class="modal-overlay ${cls}" id="${id}">
    <div class="modal ${cls.includes('lg')?'modal-lg':cls.includes('sm')?'modal-sm':''}">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="btn-icon-only" onclick="closeModal('${id}')">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footerHtml?`<div class="modal-footer">${footerHtml}</div>`:''}
    </div>
  </div>`;
}

// ── Confirm ──
let _confirmCb = null;
function confirmAction(msg, cb) {
  _confirmCb = cb;
  document.getElementById('confirmMsg').textContent = msg;
  openModal('confirmModal');
}

// ── Pagination Helper ──
function paginate(arr, page, size) {
  size = size || APP.pageSize;
  const total = Math.ceil(arr.length / size);
  const p = Math.min(Math.max(1, page), total || 1);
  return { items: arr.slice((p-1)*size, p*size), page: p, total, count: arr.length };
}

function renderPagination(pgData, onPageChange) {
  if (pgData.total <= 1) return '';
  let btns = '';
  const s = Math.max(1, pgData.page - 2);
  const e = Math.min(pgData.total, s + 4);
  for (let i = s; i <= e; i++) {
    btns += `<button class="page-btn ${i===pgData.page?'active':''}" data-p="${i}">${i}</button>`;
  }
  return `<div class="pagination">
    <span class="pagination-info">${(pgData.page-1)*APP.pageSize+1}-${Math.min(pgData.page*APP.pageSize,pgData.count)} / ${pgData.count}</span>
    <div class="pagination-btns">
      <button class="page-btn" data-p="${pgData.page-1}" ${pgData.page<=1?'disabled':''}>‹</button>
      ${btns}
      <button class="page-btn" data-p="${pgData.page+1}" ${pgData.page>=pgData.total?'disabled':''}>›</button>
    </div>
  </div>`;
}

// ── Navigation ──
function initNavigation() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = NAV_ITEMS.map(id =>
    `<button class="nav-item ${id===APP.currentPage?'active':''}" data-page="${id}">
      ${ICONS[id]} <span>${t(id,'nav')}</span>
    </button>`
  ).join('');

  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
}

async function navigateTo(page) {
  APP.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page===page));
  document.querySelectorAll('.page-section').forEach(s => s.classList.toggle('active', s.id===`page-${page}`));
  // Refresh page data
  if (typeof window[`render_${page}`] === 'function') await window[`render_${page}`]();
}

// ── Data Loading ──
async function loadAllData() {
  APP.products = await window.api.getProducts() || [];
  APP.orders = await window.api.getOrders() || [];
  APP.customers = await window.api.getCustomers() || [];
  APP.expenses = await window.api.getExpenses() || [];
  APP.materials = await window.api.getMaterials() || [];
  APP.settings = await window.api.getSettings() || {};
  APP.lang = 'en';
}

// ── Init ──
async function initApp() {
  // Window controls
  document.getElementById('btnMin').addEventListener('click', () => window.api.minimize());
  document.getElementById('btnMax').addEventListener('click', () => window.api.maximize());
  document.getElementById('btnClose').addEventListener('click', () => window.api.close());



  await loadAllData();
  initNavigation();
  buildPages();
  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', initApp);
