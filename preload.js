const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Products
  getProducts: () => ipcRenderer.invoke('db:products:getAll'),
  createProduct: (p) => ipcRenderer.invoke('db:products:create', p),
  updateProduct: (p) => ipcRenderer.invoke('db:products:update', p),
  deleteProduct: (id) => ipcRenderer.invoke('db:products:delete', id),
  updateStock: (id, delta) => ipcRenderer.invoke('db:products:updateStock', id, delta),

  // Orders
  getOrders: () => ipcRenderer.invoke('db:orders:getAll'),
  createOrder: (o) => ipcRenderer.invoke('db:orders:create', o),
  updateOrder: (o) => ipcRenderer.invoke('db:orders:update', o),
  deleteOrder: (id) => ipcRenderer.invoke('db:orders:delete', id),

  // Customers
  getCustomers: () => ipcRenderer.invoke('db:customers:getAll'),
  createCustomer: (c) => ipcRenderer.invoke('db:customers:create', c),
  updateCustomer: (c) => ipcRenderer.invoke('db:customers:update', c),
  deleteCustomer: (id) => ipcRenderer.invoke('db:customers:delete', id),

  // Expenses
  getExpenses: () => ipcRenderer.invoke('db:expenses:getAll'),
  createExpense: (e) => ipcRenderer.invoke('db:expenses:create', e),
  updateExpense: (e) => ipcRenderer.invoke('db:expenses:update', e),
  deleteExpense: (id) => ipcRenderer.invoke('db:expenses:delete', id),

  // Materials
  getMaterials: () => ipcRenderer.invoke('db:materials:getAll'),
  saveMaterial: (m) => ipcRenderer.invoke('db:materials:save', m),
  deleteMaterial: (id) => ipcRenderer.invoke('db:materials:delete', id),

  // Formulas
  getFormulas: (productId) => ipcRenderer.invoke('db:formulas:get', productId),
  saveFormulas: (productId, rows) => ipcRenderer.invoke('db:formulas:save', productId, rows),

  // Settings
  getSettings: () => ipcRenderer.invoke('db:settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('db:settings:save', s),

  // Backup
  exportData: () => ipcRenderer.invoke('export:data'),
  importData: () => ipcRenderer.invoke('import:data'),

  // Printing
  printInvoice: (data) => ipcRenderer.invoke('print:invoice', data)
});
