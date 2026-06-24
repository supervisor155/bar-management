// Web-compatible mock database using localStorage
// For demonstration purposes on web browser

let db = null;

// Mock database storage
const storage = {
  users: [],
  categories: [],
  products: [],
  orders: [],
  order_items: [],
  stock_movements: [],
};

export const initDatabase = async () => {
  try {
    // Try to load from localStorage
    const saved = localStorage.getItem('bar_management_db');
    if (saved) {
      Object.assign(storage, JSON.parse(saved));
      console.log('Database loaded from localStorage');
    } else {
      // Seed initial data
      seedData();
      saveToStorage();
      console.log('Database initialized with seed data');
    }
    db = true;
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

const saveToStorage = () => {
  localStorage.setItem('bar_management_db', JSON.stringify(storage));
};

export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Seed data
const seedData = () => {
  // Users
  storage.users = [
    { id: 1, username: 'admin', password: 'admin123', full_name: 'Owner', role: 'owner', is_active: 1, created_at: new Date().toISOString() }
  ];

  // Categories
  storage.categories = [
    { id: 1, name: 'Beer', type: 'beverage', created_at: new Date().toISOString() },
    { id: 2, name: 'Soft Drinks', type: 'beverage', created_at: new Date().toISOString() },
    { id: 3, name: 'Wine & Spirits', type: 'beverage', created_at: new Date().toISOString() },
    { id: 4, name: 'Juices', type: 'beverage', created_at: new Date().toISOString() },
    { id: 5, name: 'Grilled', type: 'food', created_at: new Date().toISOString() },
    { id: 6, name: 'Fried', type: 'food', created_at: new Date().toISOString() },
  ];

  // Products
  storage.products = [
    { id: 1, name: 'Primus', category_id: 1, cost_price: 800, selling_price: 1500, current_stock: 100, min_stock_level: 10, unit: 'bottle', is_active: 1 },
    { id: 2, name: 'Mutzig', category_id: 1, cost_price: 850, selling_price: 1500, current_stock: 80, min_stock_level: 10, unit: 'bottle', is_active: 1 },
    { id: 3, name: 'Coca-Cola', category_id: 2, cost_price: 400, selling_price: 800, current_stock: 150, min_stock_level: 20, unit: 'bottle', is_active: 1 },
    { id: 4, name: 'Fanta', category_id: 2, cost_price: 400, selling_price: 800, current_stock: 120, min_stock_level: 20, unit: 'bottle', is_active: 1 },
    { id: 5, name: 'Sprite', category_id: 2, cost_price: 400, selling_price: 800, current_stock: 100, min_stock_level: 20, unit: 'bottle', is_active: 1 },
    { id: 6, name: 'Orange Juice', category_id: 4, cost_price: 600, selling_price: 1200, current_stock: 50, min_stock_level: 10, unit: 'glass', is_active: 1 },
    { id: 7, name: 'Grilled Fish', category_id: 5, cost_price: 3000, selling_price: 6000, current_stock: 0, min_stock_level: 0, unit: 'plate', is_active: 1 },
    { id: 8, name: 'Grilled Chicken', category_id: 5, cost_price: 2500, selling_price: 5000, current_stock: 0, min_stock_level: 0, unit: 'plate', is_active: 1 },
    { id: 9, name: 'Fried Potatoes', category_id: 6, cost_price: 500, selling_price: 1500, current_stock: 0, min_stock_level: 0, unit: 'plate', is_active: 1 },
    { id: 10, name: 'Beef Brochette', category_id: 5, cost_price: 2000, selling_price: 4500, current_stock: 0, min_stock_level: 0, unit: 'stick', is_active: 1 },
  ];

  storage.orders = [];
  storage.order_items = [];
  storage.stock_movements = [];
};

// Helper functions
export const fetchAll = async (query, params = []) => {
  getDatabase();

  // Simple query parsing for web mock
  if (query.includes('FROM users')) {
    return storage.users;
  } else if (query.includes('FROM categories')) {
    return storage.categories;
  } else if (query.includes('FROM products')) {
    const results = storage.products.map(p => {
      const category = storage.categories.find(c => c.id === p.category_id);
      return { ...p, category_name: category?.name || 'Unknown' };
    });
    return results.filter(p => p.is_active === 1);
  } else if (query.includes('FROM orders')) {
    const results = storage.orders.map(o => {
      const user = storage.users.find(u => u.id === o.created_by);
      const itemCount = storage.order_items.filter(oi => oi.order_id === o.id).length;
      return { ...o, waiter_name: user?.full_name || 'Unknown', item_count: itemCount };
    });
    return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (query.includes('FROM order_items') && query.includes('SUM')) {
    // Top products query
    const orderItems = storage.order_items.filter(oi => {
      const order = storage.orders.find(o => o.id === oi.order_id);
      return order && order.payment_status === 'paid';
    });

    const productSales = {};
    orderItems.forEach(oi => {
      if (!productSales[oi.product_id]) {
        productSales[oi.product_id] = { total_sold: 0, revenue: 0 };
      }
      productSales[oi.product_id].total_sold += oi.quantity;
      productSales[oi.product_id].revenue += oi.subtotal;
    });

    return Object.entries(productSales).map(([productId, data]) => {
      const product = storage.products.find(p => p.id === parseInt(productId));
      return { name: product?.name || 'Unknown', ...data };
    }).sort((a, b) => b.total_sold - a.total_sold).slice(0, 10);
  } else if (query.includes('strftime') && query.includes('hour')) {
    // Hourly sales
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = storage.orders.filter(o =>
      o.created_at.startsWith(today) && o.payment_status === 'paid'
    );

    const hourly = {};
    todayOrders.forEach(o => {
      const hour = new Date(o.created_at).getHours();
      if (!hourly[hour]) {
        hourly[hour] = { hour, orders: 0, revenue: 0 };
      }
      hourly[hour].orders++;
      hourly[hour].revenue += o.total_amount;
    });

    return Object.values(hourly).sort((a, b) => a.hour - b.hour);
  }

  return [];
};

export const fetchOne = async (query, params = []) => {
  getDatabase();

  if (query.includes('FROM users WHERE username')) {
    const [username, password] = params;
    return storage.users.find(u => u.username === username && u.password === password);
  } else if (query.includes('COUNT(*) as count FROM orders')) {
    const activeOrders = storage.orders.filter(o =>
      o.status === 'pending' || o.status === 'preparing'
    );
    return { count: activeOrders.length };
  } else if (query.includes('SUM(total_amount)')) {
    // Sales summary
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = storage.orders.filter(o =>
      o.created_at.startsWith(today) && o.payment_status === 'paid'
    );

    const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const avgOrderValue = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

    return {
      total_orders: todayOrders.length,
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue
    };
  }

  return null;
};

export const insertRecord = async (table, data) => {
  getDatabase();
  const newId = storage[table].length > 0 ? Math.max(...storage[table].map(r => r.id)) + 1 : 1;
  const record = { id: newId, ...data, created_at: new Date().toISOString() };
  storage[table].push(record);
  saveToStorage();
  return newId;
};

export const updateRecord = async (table, data, whereClause, whereParams = []) => {
  getDatabase();
  const id = whereParams[0];
  const recordIndex = storage[table].findIndex(r => r.id === id);

  if (recordIndex >= 0) {
    storage[table][recordIndex] = { ...storage[table][recordIndex], ...data, updated_at: new Date().toISOString() };
    saveToStorage();
    return 1;
  }
  return 0;
};

export const deleteRecord = async (table, whereClause, whereParams = []) => {
  getDatabase();
  const id = whereParams[0];
  const initialLength = storage[table].length;
  storage[table] = storage[table].filter(r => r.id !== id);
  saveToStorage();
  return initialLength - storage[table].length;
};

export const executeQuery = async (query, params = []) => {
  getDatabase();

  // Handle UPDATE queries
  if (query.includes('UPDATE products SET current_stock')) {
    const [quantity, productId] = params;
    const product = storage.products.find(p => p.id === productId);
    if (product) {
      product.current_stock -= quantity;
      saveToStorage();
    }
  }

  return { changes: 1 };
};
