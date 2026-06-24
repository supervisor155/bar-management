// Database Schema for Bar Management System

export const createTables = (db) => {
  // Users table - for authentication and role management
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'manager', 'waiter', 'bartender')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Categories table - for organizing products (Drinks, Food, etc.)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('beverage', 'food')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Products table - inventory items (Primus, Fish, etc.)
  db.execSync(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      current_stock INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 10,
      unit TEXT NOT NULL,
      barcode TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  // Stock movements table - track all inventory changes
  db.execSync(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('purchase', 'sale', 'waste', 'adjustment')),
      quantity INTEGER NOT NULL,
      cost_price REAL,
      reference_id INTEGER,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Orders table - customer orders
  db.execSync(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      table_number TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid', 'partial')),
      payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'mobile', NULL)),
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Order items table - individual items in an order
  db.execSync(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'ready', 'served')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Daily summaries table - for quick analytics
  db.execSync(`
    CREATE TABLE IF NOT EXISTS daily_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE UNIQUE NOT NULL,
      total_orders INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      total_profit REAL DEFAULT 0,
      top_selling_product_id INTEGER,
      busiest_hour INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (top_selling_product_id) REFERENCES products(id)
    );
  `);

  // Suppliers table - track suppliers for reordering
  db.execSync(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for better performance
  db.execSync('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);');
  db.execSync('CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);');
};

// Seed data - initial setup
export const seedData = (db) => {
  // Create default admin user (owner)
  db.execSync(`
    INSERT OR IGNORE INTO users (username, password, full_name, role)
    VALUES ('admin', 'admin123', 'Owner', 'owner');
  `);

  // Create default categories
  db.execSync(`
    INSERT OR IGNORE INTO categories (name, type) VALUES
    ('Beer', 'beverage'),
    ('Soft Drinks', 'beverage'),
    ('Wine & Spirits', 'beverage'),
    ('Juices', 'beverage'),
    ('Grilled', 'food'),
    ('Fried', 'food'),
    ('Appetizers', 'food'),
    ('Main Course', 'food');
  `);

  // Create sample products
  db.execSync(`
    INSERT OR IGNORE INTO products (name, category_id, cost_price, selling_price, current_stock, unit) VALUES
    ('Primus', 1, 800, 1500, 100, 'bottle'),
    ('Mutzig', 1, 850, 1500, 80, 'bottle'),
    ('Coca-Cola', 2, 400, 800, 150, 'bottle'),
    ('Fanta', 2, 400, 800, 120, 'bottle'),
    ('Sprite', 2, 400, 800, 100, 'bottle'),
    ('Orange Juice', 4, 600, 1200, 50, 'glass'),
    ('Grilled Fish', 5, 3000, 6000, 0, 'plate'),
    ('Grilled Chicken', 5, 2500, 5000, 0, 'plate'),
    ('Fried Potatoes', 6, 500, 1500, 0, 'plate'),
    ('Beef Brochette', 5, 2000, 4500, 0, 'stick');
  `);
};
