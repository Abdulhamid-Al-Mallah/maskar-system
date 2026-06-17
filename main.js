const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ---------------------------------------------------------------------------
// Database directory — portable mode: next to .exe, dev mode: next to project
// ---------------------------------------------------------------------------
function getDbDir() {
  if (!app.isPackaged) {
    return path.join(__dirname, 'database');
  }
  const baseDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
  const dbPath = path.join(baseDir, 'database');
  try {
    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
    const testFile = path.join(dbPath, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return dbPath;
  } catch (e) {
    console.error('Portable dir not writable, falling back to userData:', e);
    const fallback = path.join(app.getPath('userData'), 'database');
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// JSON helpers
// ---------------------------------------------------------------------------
const DB_FILES = ['products', 'orders', 'customers', 'expenses', 'materials', 'formulas', 'settings'];

function ensureDbFiles() {
  const dir = getDbDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  DB_FILES.forEach(name => {
    const fp = path.join(dir, `${name}.json`);
    if (!fs.existsSync(fp)) {
      const defaultData = name === 'settings' ? { defaultCurrency: 'TRY', shippingFee: 0, shopName: 'MASKAR Perfume', shopPhone: '', shopAddress: '', language: 'en', lowStockThreshold: 5 } : [];
      fs.writeFileSync(fp, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  });
}

function readJson(name) {
  try {
    const fp = path.join(getDbDir(), `${name}.json`);
    if (!fs.existsSync(fp)) return name === 'settings' ? {} : [];
    const raw = fs.readFileSync(fp, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${name}.json:`, e);
    return name === 'settings' ? {} : [];
  }
}

function writeJson(name, data) {
  try {
    const dir = getDbDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    console.error(`Error writing ${name}.json:`, e);
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Unique ID generator
// ---------------------------------------------------------------------------
function generateUniqueId() {
  return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'MASKAR Perfumes Manager',
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(() => {
  ensureDbFiles();

  const template = [
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { label: 'Dev Tools', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { label: 'Reset Zoom', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Fullscreen', role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createMainWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---------------------------------------------------------------------------
// IPC: Window controls
// ---------------------------------------------------------------------------
ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow && mainWindow.close());

// ---------------------------------------------------------------------------
// IPC: Products CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:products:getAll', () => readJson('products'));

ipcMain.handle('db:products:create', (_, product) => {
  const products = readJson('products');
  product.id = product.id || generateUniqueId();
  products.push(product);
  return writeJson('products', products);
});

ipcMain.handle('db:products:update', (_, updated) => {
  const products = readJson('products');
  const idx = products.findIndex(p => p.id === updated.id);
  if (idx === -1) return { success: false, error: 'Product not found' };
  products[idx] = { ...products[idx], ...updated };
  return writeJson('products', products);
});

ipcMain.handle('db:products:delete', (_, id) => {
  let products = readJson('products');
  products = products.filter(p => p.id !== id);
  return writeJson('products', products);
});

ipcMain.handle('db:products:updateStock', (_, id, stockDelta) => {
  const products = readJson('products');
  const p = products.find(x => x.id === id);
  if (!p) return { success: false, error: 'Product not found' };
  p.stock = (p.stock || 0) + stockDelta;
  if (p.stock < 0) p.stock = 0;
  return writeJson('products', products);
});

// ---------------------------------------------------------------------------
// IPC: Orders CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:orders:getAll', () => readJson('orders'));

ipcMain.handle('db:orders:create', (_, order) => {
  const orders = readJson('orders');
  const products = readJson('products');
  order.id = order.id || generateUniqueId();
  if (!order.orderNumber) {
    order.orderNumber = 'MSK-' + Date.now().toString().slice(-6);
  }
  
  // Validate stock
  if (order.items && Array.isArray(order.items)) {
    for (const item of order.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const available = prod.stock || 0;
        const requested = item.quantity || 0;
        if (requested > available) {
          return { success: false, error: `Insufficient stock for product "${prod.nameEn || prod.nameAr || 'Product'}". Available: ${available}, Requested: ${requested}.` };
        }
      }
    }

    // Decrement stock
    order.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) - (item.quantity || 0);
      }
    });
    writeJson('products', products);
  }
  orders.push(order);
  return writeJson('orders', orders);
});

ipcMain.handle('db:orders:update', (_, updated) => {
  const orders = readJson('orders');
  const products = readJson('products');
  const idx = orders.findIndex(o => o.id === updated.id);
  if (idx === -1) return { success: false, error: 'Order not found' };

  const oldOrder = orders[idx];

  // Validate stock by simulating the change
  const simulatedProducts = JSON.parse(JSON.stringify(products));
  
  // 1. Rollback old items in simulation
  if (oldOrder.items && Array.isArray(oldOrder.items)) {
    oldOrder.items.forEach(item => {
      const prod = simulatedProducts.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) + (item.quantity || 0);
      }
    });
  }

  // 2. Validate requested qty in simulation
  if (updated.items && Array.isArray(updated.items)) {
    for (const item of updated.items) {
      const prod = simulatedProducts.find(p => p.id === item.productId);
      if (prod) {
        const available = prod.stock || 0;
        const requested = item.quantity || 0;
        if (requested > available) {
          return { success: false, error: `Insufficient stock for product "${prod.nameEn || prod.nameAr || 'Product'}". Available: ${available}, Requested: ${requested}.` };
        }
        prod.stock = (prod.stock || 0) - requested;
      }
    }
  }

  // Simulation passed, modify actual products stock
  if (oldOrder.items && Array.isArray(oldOrder.items)) {
    oldOrder.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) + (item.quantity || 0);
      }
    });
  }
  if (updated.items && Array.isArray(updated.items)) {
    updated.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) - (item.quantity || 0);
      }
    });
  }

  writeJson('products', products);

  orders[idx] = { ...oldOrder, ...updated };
  return writeJson('orders', orders);
});

ipcMain.handle('db:orders:delete', (_, id) => {
  const orders = readJson('orders');
  const order = orders.find(o => o.id === id);
  if (!order) return { success: false, error: 'Order not found' };
  // Restore stock
  if (order.items && Array.isArray(order.items)) {
    const products = readJson('products');
    order.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) + (item.quantity || 0);
      }
    });
    writeJson('products', products);
  }
  const filtered = orders.filter(o => o.id !== id);
  return writeJson('orders', filtered);
});

// ---------------------------------------------------------------------------
// IPC: Customers CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:customers:getAll', () => readJson('customers'));

ipcMain.handle('db:customers:create', (_, customer) => {
  const customers = readJson('customers');
  customer.id = customer.id || generateUniqueId();
  customer.createdAt = customer.createdAt || new Date().toISOString();
  customers.push(customer);
  return writeJson('customers', customers);
});

ipcMain.handle('db:customers:update', (_, updated) => {
  const customers = readJson('customers');
  const idx = customers.findIndex(c => c.id === updated.id);
  if (idx === -1) return { success: false, error: 'Customer not found' };
  customers[idx] = { ...customers[idx], ...updated };
  return writeJson('customers', customers);
});

ipcMain.handle('db:customers:delete', (_, id) => {
  let customers = readJson('customers');
  customers = customers.filter(c => c.id !== id);
  return writeJson('customers', customers);
});

// ---------------------------------------------------------------------------
// IPC: Expenses CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:expenses:getAll', () => readJson('expenses'));

ipcMain.handle('db:expenses:create', (_, expense) => {
  const expenses = readJson('expenses');
  expense.id = expense.id || generateUniqueId();
  expense.createdAt = expense.createdAt || new Date().toISOString();
  expenses.push(expense);
  return writeJson('expenses', expenses);
});

ipcMain.handle('db:expenses:update', (_, updated) => {
  const expenses = readJson('expenses');
  const idx = expenses.findIndex(e => e.id === updated.id);
  if (idx === -1) return { success: false, error: 'Expense not found' };
  expenses[idx] = { ...expenses[idx], ...updated };
  return writeJson('expenses', expenses);
});

ipcMain.handle('db:expenses:delete', (_, id) => {
  let expenses = readJson('expenses');
  expenses = expenses.filter(e => e.id !== id);
  return writeJson('expenses', expenses);
});

// ---------------------------------------------------------------------------
// IPC: Materials CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:materials:getAll', () => readJson('materials'));

ipcMain.handle('db:materials:save', (_, material) => {
  const materials = readJson('materials');
  if (material.id) {
    const idx = materials.findIndex(m => m.id === material.id);
    if (idx !== -1) { materials[idx] = { ...materials[idx], ...material }; }
    else { materials.push(material); }
  } else {
    material.id = generateUniqueId();
    materials.push(material);
  }
  return writeJson('materials', materials);
});

ipcMain.handle('db:materials:delete', (_, id) => {
  let materials = readJson('materials');
  materials = materials.filter(m => m.id !== id);
  return writeJson('materials', materials);
});

// ---------------------------------------------------------------------------
// IPC: Formulas
// ---------------------------------------------------------------------------
ipcMain.handle('db:formulas:get', (_, productId) => {
  const formulas = readJson('formulas');
  return formulas.filter(f => f.productId === productId);
});

ipcMain.handle('db:formulas:save', (_, productId, formulaRows) => {
  let formulas = readJson('formulas');
  formulas = formulas.filter(f => f.productId !== productId);
  formulaRows.forEach(row => {
    row.id = row.id || generateUniqueId();
    row.productId = productId;
    formulas.push(row);
  });
  return writeJson('formulas', formulas);
});

// ---------------------------------------------------------------------------
// IPC: Settings
// ---------------------------------------------------------------------------
ipcMain.handle('db:settings:get', () => readJson('settings'));

ipcMain.handle('db:settings:save', (_, settings) => writeJson('settings', settings));

// ---------------------------------------------------------------------------
// IPC: Backup Export / Import
// ---------------------------------------------------------------------------
ipcMain.handle('export:data', async () => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Database Backup',
      defaultPath: `maskar_backup_${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
    });
    if (canceled || !filePath) return { success: false, reason: 'canceled' };

    const archiver = require('archiver');
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve) => {
      output.on('close', () => resolve({ success: true, path: filePath }));
      archive.on('error', (err) => resolve({ success: false, error: err.message }));
      archive.pipe(output);

      const dbDir = getDbDir();
      DB_FILES.forEach(name => {
        const fp = path.join(dbDir, `${name}.json`);
        if (fs.existsSync(fp)) archive.file(fp, { name: `${name}.json` });
      });
      archive.finalize();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import:data', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Database Backup',
      filters: [{ name: 'ZIP Files', extensions: ['zip'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, reason: 'canceled' };

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePaths[0]);
    const dbDir = getDbDir();
    zip.extractAllTo(dbDir, true);
    mainWindow.reload();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: PDF Invoice Printing (cloned from bill-generator)
// ---------------------------------------------------------------------------
ipcMain.handle('print:invoice', async (_, { bodyHtml, defaultName }) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Invoice PDF',
      defaultPath: defaultName || 'invoice.pdf',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, reason: 'canceled' };

    const cssPath = path.join(__dirname, 'src', 'print.css');
    const cssContent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${cssContent}</style></head><body>${bodyHtml}</body></html>`;

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

    const pdfBuffer = await printWindow.webContents.printToPDF({
      margins: { marginType: 'none' },
      pageSize: 'A4',
      printBackground: true,
      landscape: false
    });

    fs.writeFileSync(filePath, pdfBuffer);
    printWindow.close();
    return { success: true, path: filePath };
  } catch (e) {
    console.error('PDF generation failed:', e);
    return { success: false, error: e.message };
  }
});
