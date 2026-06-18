const { app, BrowserWindow, ipcMain, dialog, Menu, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let mainWindow;
let mongoClient = null;
let db = null;
let isAuthenticated = false;

const DEFAULT_SETTINGS = {
  defaultCurrency: 'TRY',
  shippingFee: 0,
  shopName: 'MASKAR Perfume',
  shopPhone: '',
  shopAddress: '',
  language: 'en',
  lowStockThreshold: 5
};

// ---------------------------------------------------------------------------
// Encryption & Decryption of Connection String
// ---------------------------------------------------------------------------
function getConnFilePath() {
  return path.join(app.getPath('userData'), 'db_conn.enc');
}

function getSavedMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  const fp = getConnFilePath();
  if (!fs.existsSync(fp)) return null;
  try {
    const encryptedBuffer = fs.readFileSync(fp);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(encryptedBuffer);
    } else {
      return encryptedBuffer.toString('utf-8');
    }
  } catch (e) {
    console.error('Failed to decrypt saved connection string:', e);
    return null;
  }
}

function saveMongoUri(uri) {
  const fp = getConnFilePath();
  try {
    let dataToSave;
    if (safeStorage.isEncryptionAvailable()) {
      dataToSave = safeStorage.encryptString(uri);
    } else {
      dataToSave = Buffer.from(uri, 'utf-8');
    }
    fs.writeFileSync(fp, dataToSave);
    return true;
  } catch (e) {
    console.error('Failed to encrypt/save connection string:', e);
    return false;
  }
}

function deleteMongoUri() {
  const fp = getConnFilePath();
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
  }
}

// ---------------------------------------------------------------------------
// MongoDB Connection Management
// ---------------------------------------------------------------------------
async function connectToMongo(uri) {
  try {
    let dbName = 'maskar';
    try {
      const parsed = new URL(uri);
      const pathName = parsed.pathname;
      if (pathName && pathName !== '/') {
        dbName = pathName.replace(/^\//, '');
      }
    } catch (err) {
      const match = uri.match(/\/([^/?]+)(\?|$)/);
      if (match) dbName = match[1];
    }

    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch (e) {}
    }

    const client = new MongoClient(uri);
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
    
    mongoClient = client;
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);

    // Startup migration: convert non-USD expenses to USD and update their currency to 'USD'
    try {
      const expenses = await db.collection('expenses').find({}).toArray();
      const settings = await db.collection('settings').findOne({});
      const currencies = settings?.currencies || [];
      for (const e of expenses) {
        if (e.currency && e.currency !== 'USD') {
          const amt = parseFloat(e.amount) || 0;
          const currObj = currencies.find(c => c.code === e.currency);
          const rate = currObj ? currObj.rate : 1;
          const usdAmount = amt / (rate || 1);
          await db.collection('expenses').updateOne(
            { id: e.id },
            { $set: { amount: usdAmount, currency: 'USD' } }
          );
        }
      }
    } catch (migErr) {
      console.error('Failed to run expense currency migration:', migErr);
    }

    return { success: true };
  } catch (e) {
    console.error('MongoDB Connection Error:', e);
    return { success: false, error: e.message };
  }
}

async function getCollectionData(collectionName) {
  if (!db) return [];
  try {
    const list = await db.collection(collectionName).find({}).toArray();
    return list.map(item => {
      delete item._id;
      return item;
    });
  } catch (e) {
    console.error(`MongoDB read error on ${collectionName}:`, e);
    return [];
  }
}

function checkAuth() {
  if (!isAuthenticated) {
    throw new Error('Unauthorized');
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
// IPC: Authentication & Setup Handlers
// ---------------------------------------------------------------------------
ipcMain.handle('auth:checkSetup', async () => {
  const uri = getSavedMongoUri();
  if (!uri) {
    return { setupRequired: true };
  }
  
  const conn = await connectToMongo(uri);
  if (!conn.success) {
    return { setupRequired: true, error: `Could not connect to database: ${conn.error}` };
  }
  
  try {
    const userCount = await db.collection('users').countDocuments({});
    if (userCount === 0) {
      return { setupRequired: true, needsAdminCreation: true };
    }
    return { setupRequired: false };
  } catch (e) {
    return { setupRequired: true, error: `Database check failed: ${e.message}` };
  }
});

ipcMain.handle('auth:setup', async (_, { uri, adminUser, adminPass }) => {
  const conn = await connectToMongo(uri);
  if (!conn.success) {
    return { success: false, error: `Could not connect to database: ${conn.error}` };
  }
  
  saveMongoUri(uri);
  
  try {
    await db.collection('users').deleteMany({});
    
    const hashedPassword = await bcrypt.hash(adminPass, 10);
    await db.collection('users').insertOne({
      id: generateUniqueId(),
      username: adminUser.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });
    
    const settingsCount = await db.collection('settings').countDocuments({});
    if (settingsCount === 0) {
      await db.collection('settings').insertOne(DEFAULT_SETTINGS);
    }
    
    return { success: true };
  } catch (e) {
    return { success: false, error: `Failed to initialize system: ${e.message}` };
  }
});

ipcMain.handle('auth:login', async (_, { username, password }) => {
  if (!db) {
    return { success: false, error: 'Database not connected' };
  }
  try {
    const user = await db.collection('users').findOne({ username: username.trim().toLowerCase() });
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return { success: false, error: 'Invalid username or password' };
    }
    isAuthenticated = true;
    return { success: true };
  } catch (e) {
    return { success: false, error: `Authentication error: ${e.message}` };
  }
});

ipcMain.handle('auth:resetConnection', async () => {
  deleteMongoUri();
  isAuthenticated = false;
  if (mongoClient) {
    try {
      await mongoClient.close();
    } catch (e) {}
    mongoClient = null;
    db = null;
  }
  return { success: true };
});

// ---------------------------------------------------------------------------
// IPC: Products CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:products:getAll', async () => {
  checkAuth();
  return await getCollectionData('products');
});

ipcMain.handle('db:products:create', async (_, product) => {
  checkAuth();
  product.id = product.id || generateUniqueId();
  try {
    await db.collection('products').insertOne(product);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:products:update', async (_, updated) => {
  checkAuth();
  try {
    const res = await db.collection('products').updateOne({ id: updated.id }, { $set: updated });
    if (res.matchedCount === 0) return { success: false, error: 'Product not found' };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:products:delete', async (_, id) => {
  checkAuth();
  try {
    const orderCount = await db.collection('orders').countDocuments({ "items.productId": id });
    if (orderCount > 0) {
      const orders = await db.collection('orders').find({ "items.productId": id }).toArray();
      const orderNums = orders.map(o => o.orderNumber).join(', ');
      return { success: false, error: `Product linked to order(s): ${orderNums}` };
    }
    await db.collection('products').deleteOne({ id });
    await db.collection('formulas').deleteMany({ productId: id });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:products:updateStock', async (_, id, stockDelta) => {
  checkAuth();
  try {
    const product = await db.collection('products').findOne({ id });
    if (!product) return { success: false, error: 'Product not found' };
    let newStock = (product.stock || 0) + stockDelta;
    if (newStock < 0) newStock = 0;
    await db.collection('products').updateOne({ id }, { $set: { stock: newStock } });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: Orders CRUD
// ---------------------------------------------------------------------------
async function adjustMaterialStock(productId, productQuantity, multiplier) {
  try {
    const formulas = await db.collection('formulas').find({ productId }).toArray();
    for (const f of formulas) {
      const mat = await db.collection('materials').findOne({ id: f.materialId });
      if (mat && mat.trackStock === false) {
        continue;
      }
      const qtyToAdjust = (parseFloat(f.quantity) || 0) * productQuantity * multiplier;
      await db.collection('materials').updateOne(
        { id: f.materialId },
        { $inc: { stock: qtyToAdjust } }
      );
    }
  } catch (e) {
    console.error(`Failed to adjust material stock for product ${productId}:`, e);
  }
}

ipcMain.handle('db:orders:getAll', async () => {
  checkAuth();
  return await getCollectionData('orders');
});

ipcMain.handle('db:orders:create', async (_, order) => {
  checkAuth();
  order.id = order.id || generateUniqueId();
  if (!order.orderNumber) {
    order.orderNumber = 'MSK-' + Date.now().toString().slice(-6);
  }

  try {
    if (order.items && Array.isArray(order.items)) {
      const productIds = order.items.map(item => item.productId);
      const products = await db.collection('products').find({ id: { $in: productIds } }).toArray();

      for (const item of order.items) {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          const available = prod.stock || 0;
          const requested = item.quantity || 0;
          if (requested > available) {
            return { success: false, error: `Low stock: Only ${available} of "${prod.nameEn || prod.nameAr || 'Product'}" left (needed ${requested})` };
          }
        }
      }

      for (const item of order.items) {
        await db.collection('products').updateOne(
          { id: item.productId },
          { $inc: { stock: -(item.quantity || 0) } }
        );
        // Reduce material stock
        await adjustMaterialStock(item.productId, item.quantity || 0, -1);
      }
    }

    await db.collection('orders').insertOne(order);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:orders:update', async (_, updated) => {
  checkAuth();
  try {
    const oldOrder = await db.collection('orders').findOne({ id: updated.id });
    if (!oldOrder) return { success: false, error: 'Order not found' };

    const productIds = new Set();
    if (oldOrder.items && Array.isArray(oldOrder.items)) {
      oldOrder.items.forEach(item => productIds.add(item.productId));
    }
    if (updated.items && Array.isArray(updated.items)) {
      updated.items.forEach(item => productIds.add(item.productId));
    }

    const products = await db.collection('products').find({ id: { $in: Array.from(productIds) } }).toArray();

    const simulatedStock = {};
    products.forEach(p => {
      simulatedStock[p.id] = {
        name: p.nameEn || p.nameAr || 'Product',
        stock: p.stock || 0
      };
    });

    if (oldOrder.items && Array.isArray(oldOrder.items)) {
      oldOrder.items.forEach(item => {
        if (simulatedStock[item.productId]) {
          simulatedStock[item.productId].stock += (item.quantity || 0);
        }
      });
    }

    if (updated.items && Array.isArray(updated.items)) {
      for (const item of updated.items) {
        if (simulatedStock[item.productId]) {
          const available = simulatedStock[item.productId].stock;
          const requested = item.quantity || 0;
          if (requested > available) {
            return { success: false, error: `Low stock: Only ${available} of "${simulatedStock[item.productId].name}" left (needed ${requested})` };
          }
          simulatedStock[item.productId].stock -= requested;
        }
      }
    }

    if (oldOrder.items && Array.isArray(oldOrder.items)) {
      for (const item of oldOrder.items) {
        await db.collection('products').updateOne(
          { id: item.productId },
          { $inc: { stock: (item.quantity || 0) } }
        );
        // Restore material stock
        await adjustMaterialStock(item.productId, item.quantity || 0, 1);
      }
    }
    if (updated.items && Array.isArray(updated.items)) {
      for (const item of updated.items) {
        await db.collection('products').updateOne(
          { id: item.productId },
          { $inc: { stock: -(item.quantity || 0) } }
        );
        // Reduce material stock
        await adjustMaterialStock(item.productId, item.quantity || 0, -1);
      }
    }

    await db.collection('orders').replaceOne({ id: updated.id }, updated);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:orders:delete', async (_, id) => {
  checkAuth();
  try {
    const order = await db.collection('orders').findOne({ id });
    if (!order) return { success: false, error: 'Order not found' };

    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        await db.collection('products').updateOne(
          { id: item.productId },
          { $inc: { stock: (item.quantity || 0) } }
        );
        // Restore material stock
        await adjustMaterialStock(item.productId, item.quantity || 0, 1);
      }
    }

    await db.collection('orders').deleteOne({ id });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: Customers CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:customers:getAll', async () => {
  checkAuth();
  return await getCollectionData('customers');
});

ipcMain.handle('db:customers:create', async (_, customer) => {
  checkAuth();
  customer.id = customer.id || generateUniqueId();
  customer.createdAt = customer.createdAt || new Date().toISOString();
  try {
    await db.collection('customers').insertOne(customer);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:customers:update', async (_, updated) => {
  checkAuth();
  try {
    const res = await db.collection('customers').updateOne({ id: updated.id }, { $set: updated });
    if (res.matchedCount === 0) return { success: false, error: 'Customer not found' };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:customers:delete', async (_, id) => {
  checkAuth();
  try {
    const orderCount = await db.collection('orders').countDocuments({ customerId: id });
    if (orderCount > 0) {
      const orders = await db.collection('orders').find({ customerId: id }).toArray();
      const orderNums = orders.map(o => o.orderNumber).join(', ');
      return { success: false, error: `Customer linked to order(s): ${orderNums}` };
    }
    await db.collection('customers').deleteOne({ id });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: Expenses CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:expenses:getAll', async () => {
  checkAuth();
  return await getCollectionData('expenses');
});

ipcMain.handle('db:expenses:create', async (_, expense) => {
  checkAuth();
  expense.id = expense.id || generateUniqueId();
  expense.createdAt = expense.createdAt || new Date().toISOString();
  try {
    await db.collection('expenses').insertOne(expense);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:expenses:update', async (_, updated) => {
  checkAuth();
  try {
    const res = await db.collection('expenses').updateOne({ id: updated.id }, { $set: updated });
    if (res.matchedCount === 0) return { success: false, error: 'Expense not found' };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:expenses:delete', async (_, id) => {
  checkAuth();
  try {
    await db.collection('expenses').deleteOne({ id });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: Materials CRUD
// ---------------------------------------------------------------------------
ipcMain.handle('db:materials:getAll', async () => {
  checkAuth();
  return await getCollectionData('materials');
});

ipcMain.handle('db:materials:save', async (_, material) => {
  checkAuth();
  try {
    if (material.id) {
      const oldMat = await db.collection('materials').findOne({ id: material.id });
      await db.collection('materials').replaceOne({ id: material.id }, material, { upsert: true });
      if (oldMat && oldMat.unitCost !== material.unitCost) {
        // Update formulas snapshot
        await db.collection('formulas').updateMany(
          { materialId: material.id },
          { $set: { unitCostSnapshot: material.unitCost } }
        );
        // Recalculate and update COGS of affected products
        const formulas = await db.collection('formulas').find({ materialId: material.id }).toArray();
        const productIds = [...new Set(formulas.map(f => f.productId))];
        for (const pId of productIds) {
          const prodFormulas = await db.collection('formulas').find({ productId: pId }).toArray();
          const newCOGS = prodFormulas.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unitCostSnapshot) || 0), 0);
          await db.collection('products').updateOne(
            { id: pId },
            { $set: { costOfGoodsSold: newCOGS } }
          );
        }
      }
    } else {
      material.id = generateUniqueId();
      await db.collection('materials').insertOne(material);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('db:materials:delete', async (_, id) => {
  checkAuth();
  try {
    const formulaCount = await db.collection('formulas').countDocuments({ materialId: id });
    if (formulaCount > 0) {
      const formulas = await db.collection('formulas').find({ materialId: id }).toArray();
      const productIds = [...new Set(formulas.map(f => f.productId))];
      const products = await db.collection('products').find({ id: { $in: productIds } }).toArray();
      const productNames = products.map(p => p.nameEn || p.nameAr || p.nameTr || 'Unnamed Product').join(', ');
      return { success: false, error: `Material is used by product(s): ${productNames}` };
    }
    await db.collection('materials').deleteOne({ id });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: Formulas
// ---------------------------------------------------------------------------
ipcMain.handle('db:formulas:get', async (_, productId) => {
  checkAuth();
  if (!db) return [];
  try {
    const list = await db.collection('formulas').find({ productId }).toArray();
    return list.map(item => { delete item._id; return item; });
  } catch (e) {
    console.error(e);
    return [];
  }
});

ipcMain.handle('db:formulas:save', async (_, productId, formulaRows) => {
  checkAuth();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    await db.collection('formulas').deleteMany({ productId });
    if (formulaRows.length > 0) {
      formulaRows.forEach(row => {
        row.id = row.id || generateUniqueId();
        row.productId = productId;
      });
      await db.collection('formulas').insertMany(formulaRows);
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: Settings
// ---------------------------------------------------------------------------
ipcMain.handle('db:settings:get', async () => {
  checkAuth();
  if (!db) return DEFAULT_SETTINGS;
  try {
    const s = await db.collection('settings').findOne({});
    if (s) {
      delete s._id;
      return s;
    }
    return DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
});

ipcMain.handle('db:settings:save', async (_, settings) => {
  checkAuth();
  if (!db) return { success: false, error: 'Database not connected' };
  try {
    await db.collection('settings').replaceOne({}, settings, { upsert: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ---------------------------------------------------------------------------
// IPC: Backup Export / Import
// ---------------------------------------------------------------------------
ipcMain.handle('export:data', async () => {
  checkAuth();
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

    return new Promise(async (resolve) => {
      output.on('close', () => resolve({ success: true, path: filePath }));
      archive.on('error', (err) => resolve({ success: false, error: err.message }));
      archive.pipe(output);

      const collections = ['products', 'orders', 'customers', 'expenses', 'materials', 'formulas', 'settings'];
      for (const name of collections) {
        const data = await getCollectionData(name);
        archive.append(JSON.stringify(data, null, 2), { name: `${name}.json` });
      }
      archive.finalize();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('import:data', async () => {
  checkAuth();
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Database Backup',
      filters: [{ name: 'ZIP Files', extensions: ['zip'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, reason: 'canceled' };

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePaths[0]);
    const zipEntries = zip.getEntries();

    const collections = ['products', 'orders', 'customers', 'expenses', 'materials', 'formulas', 'settings'];

    for (const entry of zipEntries) {
      const name = entry.entryName.replace('.json', '');
      if (collections.includes(name)) {
        const jsonContent = entry.getData().toString('utf8');
        const data = JSON.parse(jsonContent);

        await db.collection(name).deleteMany({});

        if (Array.isArray(data)) {
          if (data.length > 0) {
            await db.collection(name).insertMany(data);
          }
        } else if (data && typeof data === 'object') {
          await db.collection(name).insertOne(data);
        }
      }
    }

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

    const tempPath = path.join(app.getPath('temp'), `print_invoice_${Date.now()}.html`);
    fs.writeFileSync(tempPath, fullHtml, 'utf-8');

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    await printWindow.loadFile(tempPath);

    const pdfBuffer = await printWindow.webContents.printToPDF({
      margins: { marginType: 'none' },
      pageSize: 'A4',
      printBackground: true,
      landscape: false
    });

    fs.writeFileSync(filePath, pdfBuffer);
    printWindow.close();

    try {
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error('Failed to delete temp print file:', err);
    }

    return { success: true, path: filePath };
  } catch (e) {
    console.error('PDF generation failed:', e);
    return { success: false, error: e.message };
  }
});
