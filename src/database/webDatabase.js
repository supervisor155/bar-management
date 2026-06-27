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
  credit_customers: [],
  credit_transactions: [],
  tables: [],
  suppliers: [],
  purchase_orders: [],
  purchase_order_items: [],
  loyalty_tiers: [],
  loyalty_rewards: [],
  loyalty_transactions: [],
  cash_drawer_shifts: [],
  cash_drawer_transactions: [],
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

  // Tables
  storage.tables = [
    { id: 1, table_number: 'T1', capacity: 2, status: 'available', location: 'Main Floor', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 2, table_number: 'T2', capacity: 4, status: 'available', location: 'Main Floor', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 3, table_number: 'T3', capacity: 4, status: 'available', location: 'Main Floor', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 4, table_number: 'T4', capacity: 6, status: 'available', location: 'Main Floor', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 5, table_number: 'T5', capacity: 2, status: 'available', location: 'Terrace', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 6, table_number: 'T6', capacity: 4, status: 'available', location: 'Terrace', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 7, table_number: 'T7', capacity: 8, status: 'available', location: 'VIP', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 8, table_number: 'T8', capacity: 10, status: 'available', location: 'VIP', current_order_id: null, is_active: 1, created_at: new Date().toISOString() },
  ];

  // Loyalty tiers
  storage.loyalty_tiers = [
    { id: 1, tier_name: 'Bronze', min_points: 0, discount_percentage: 0, color: '#cd7f32', benefits: 'Earn 1 point per 1000 RWF', created_at: new Date().toISOString() },
    { id: 2, tier_name: 'Silver', min_points: 100, discount_percentage: 5, color: '#c0c0c0', benefits: 'Earn 1 point per 1000 RWF + 5% discount', created_at: new Date().toISOString() },
    { id: 3, tier_name: 'Gold', min_points: 500, discount_percentage: 10, color: '#ffd700', benefits: 'Earn 1 point per 1000 RWF + 10% discount + Birthday gift', created_at: new Date().toISOString() },
    { id: 4, tier_name: 'Platinum', min_points: 1000, discount_percentage: 15, color: '#e5e4e2', benefits: 'Earn 1 point per 1000 RWF + 15% discount + Priority service', created_at: new Date().toISOString() },
  ];

  // Loyalty rewards
  storage.loyalty_rewards = [
    { id: 1, reward_name: 'Free Beer', points_required: 50, reward_type: 'free_item', reward_value: 0, product_id: 1, is_active: 1, created_at: new Date().toISOString() },
    { id: 2, reward_name: '10% Discount Voucher', points_required: 100, reward_type: 'discount', reward_value: 10, product_id: null, is_active: 1, created_at: new Date().toISOString() },
    { id: 3, reward_name: 'Free Grilled Chicken', points_required: 200, reward_type: 'free_item', reward_value: 0, product_id: 8, is_active: 1, created_at: new Date().toISOString() },
    { id: 4, reward_name: '20% Discount Voucher', points_required: 300, reward_type: 'discount', reward_value: 20, product_id: null, is_active: 1, created_at: new Date().toISOString() },
  ];
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
  } else if (query.includes('FROM credit_customers')) {
    // Credit customers query
    return storage.credit_customers.filter(c => c.is_active === 1);
  } else if (query.includes('FROM credit_transactions')) {
    // Credit transactions query
    const [customerId] = params;
    return storage.credit_transactions
      .filter(t => t.customer_id === customerId)
      .map(t => {
        const user = storage.users.find(u => u.id === t.created_by);
        const order = t.order_id ? storage.orders.find(o => o.id === t.order_id) : null;
        return {
          ...t,
          created_by_name: user?.full_name || 'Unknown',
          order_number: order?.order_number || null,
        };
      });
  } else if (query.includes('FROM orders') && query.includes('JOIN credit_customers')) {
    // Credit orders query
    return storage.orders
      .filter(o => o.payment_method === 'credit')
      .map(o => {
        const customer = storage.credit_customers.find(c => c.id === o.customer_id);
        const itemCount = storage.order_items.filter(oi => oi.order_id === o.id).length;
        return {
          ...o,
          customer_name: customer?.customer_name || 'Unknown',
          phone: customer?.phone || '',
          item_count: itemCount,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (query.includes('FROM order_items') && query.includes('JOIN products')) {
    // Order items with product details
    const [orderId] = params;
    return storage.order_items
      .filter(oi => oi.order_id === orderId)
      .map(oi => {
        const product = storage.products.find(p => p.id === oi.product_id);
        return {
          ...oi,
          product_name: product?.name || 'Unknown',
          unit: product?.unit || '',
        };
      });
  } else if (query.includes('SUM(subtotal)') && query.includes('FROM order_items')) {
    // Sum of order items
    const [orderId] = params;
    const items = storage.order_items.filter(oi => oi.order_id === orderId);
    const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    return [{ total }];
  } else if (query.includes('FROM tables')) {
    // Tables query
    if (query.includes('WHERE is_active')) {
      return storage.tables.filter(t => t.is_active === 1);
    }
    return storage.tables;
  } else if (query.includes('FROM suppliers')) {
    return storage.suppliers.filter(s => s.is_active === 1);
  } else if (query.includes('FROM purchase_orders')) {
    return storage.purchase_orders.map(po => {
      const supplier = storage.suppliers.find(s => s.id === po.supplier_id);
      return { ...po, supplier_name: supplier?.supplier_name || 'Unknown' };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (query.includes('FROM loyalty_tiers')) {
    return storage.loyalty_tiers.sort((a, b) => a.min_points - b.min_points);
  } else if (query.includes('FROM loyalty_rewards')) {
    return storage.loyalty_rewards.filter(r => r.is_active === 1).map(r => {
      const product = r.product_id ? storage.products.find(p => p.id === r.product_id) : null;
      return { ...r, product_name: product?.name || null };
    });
  } else if (query.includes('FROM loyalty_transactions')) {
    const [customerId] = params;
    return storage.loyalty_transactions
      .filter(t => t.customer_id === customerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (query.includes('FROM cash_drawer_shifts')) {
    if (query.includes("status = 'open'")) {
      const [userId] = params;
      return storage.cash_drawer_shifts.find(s => s.status === 'open' && s.opened_by === userId) || null;
    }
    const [userId] = params;
    return storage.cash_drawer_shifts
      .filter(s => s.opened_by === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (query.includes('FROM cash_drawer_transactions')) {
    const [shiftId] = params;
    return storage.cash_drawer_transactions
      .filter(t => t.shift_id === shiftId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return [];
};

export const fetchOne = async (query, params = []) => {
  getDatabase();

  if (query.includes('FROM users WHERE username')) {
    const [username, password] = params;
    return storage.users.find(u => u.username === username && u.password === password);
  } else if (query.includes('COUNT(*) as count FROM orders WHERE status')) {
    const activeOrders = storage.orders.filter(o =>
      o.status === 'pending' || o.status === 'preparing'
    );
    return { count: activeOrders.length };
  } else if (query.includes('COUNT(*) as count FROM orders WHERE DATE(created_at)')) {
    // Paid/unpaid orders count for today
    const [dateParam] = params;
    const today = dateParam || new Date().toISOString().split('T')[0];

    if (query.includes("payment_status = 'paid'")) {
      const paidOrders = storage.orders.filter(o => {
        const orderDate = o.created_at.split('T')[0];
        return orderDate === today && o.payment_status === 'paid';
      });
      return { count: paidOrders.length };
    } else if (query.includes("payment_status IN ('pending', 'partial')")) {
      const unpaidOrders = storage.orders.filter(o => {
        const orderDate = o.created_at.split('T')[0];
        return orderDate === today && (o.payment_status === 'pending' || o.payment_status === 'partial');
      });
      return { count: unpaidOrders.length };
    }
    return { count: 0 };
  } else if (query.includes('SUM(total_amount)') || query.includes('COALESCE(SUM(total_amount)')) {
    // Sales summary - handle both dashboard and reports queries
    const [dateParam] = params;
    const today = dateParam || new Date().toISOString().split('T')[0];
    const todayOrders = storage.orders.filter(o => {
      const orderDate = o.created_at.split('T')[0];
      return orderDate === today && o.payment_status === 'paid';
    });

    const totalRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const avgOrderValue = todayOrders.length > 0 ? totalRevenue / todayOrders.length : 0;

    // Return format expected by dashboard
    if (query.includes('COALESCE(SUM(total_amount), 0) as revenue')) {
      return {
        revenue: totalRevenue,
        orders: todayOrders.length,
      };
    }

    // Return format expected by reports
    return {
      total_orders: todayOrders.length,
      total_revenue: totalRevenue,
      avg_order_value: avgOrderValue
    };
  } else if (query.includes('FROM orders WHERE id')) {
    // Get single order
    const [orderId] = params;
    const order = storage.orders.find(o => o.id === orderId);
    if (order && query.includes('JOIN credit_customers')) {
      const customer = storage.credit_customers.find(c => c.id === order.customer_id);
      return {
        ...order,
        customer_name: customer?.customer_name || 'Unknown',
        phone: customer?.phone || '',
      };
    }
    return order || null;
  } else if (query.includes('FROM credit_customers WHERE id')) {
    // Get single customer
    const [customerId] = params;
    return storage.credit_customers.find(c => c.id === customerId) || null;
  } else if (query.includes('FROM order_items WHERE order_id')) {
    // Check existing order item
    const [orderId, productId] = params;
    return storage.order_items.find(oi => oi.order_id === orderId && oi.product_id === productId) || null;
  } else if (query.includes('FROM tables WHERE id')) {
    const [tableId] = params;
    return storage.tables.find(t => t.id === tableId) || null;
  } else if (query.includes('FROM suppliers WHERE id')) {
    const [supplierId] = params;
    return storage.suppliers.find(s => s.id === supplierId) || null;
  } else if (query.includes('FROM purchase_orders WHERE id')) {
    const [poId] = params;
    return storage.purchase_orders.find(po => po.id === poId) || null;
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
      if (query.includes('current_stock - ')) {
        product.current_stock -= quantity;
      } else if (query.includes('current_stock + ')) {
        product.current_stock += quantity;
      }
      saveToStorage();
    }
  } else if (query.includes('DELETE FROM order_items')) {
    // Handle DELETE queries
    const [itemId] = params;
    const initialLength = storage.order_items.length;
    storage.order_items = storage.order_items.filter(oi => oi.id !== itemId);
    saveToStorage();
    return { changes: initialLength - storage.order_items.length };
  }

  return { changes: 1 };
};
