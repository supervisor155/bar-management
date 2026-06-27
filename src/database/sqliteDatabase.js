import * as SQLite from 'expo-sqlite';

let db = null;

// Initialize SQLite database
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('bar_management.db');

    console.log('📦 Initializing local SQLite database...');

    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create all tables
    await createTables();

    console.log('✅ Local database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Create all tables
const createTables = async () => {
  const tables = `
    -- Sync queue table (critical for offline resilience)
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT NOT NULL,
      local_timestamp INTEGER NOT NULL,
      synced INTEGER DEFAULT 0,
      retry_count INTEGER DEFAULT 0,
      error TEXT
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      push_token TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category_id INTEGER,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      description TEXT,
      image_url TEXT,
      current_stock REAL DEFAULT 0,
      min_stock_level REAL DEFAULT 0,
      max_stock_level REAL DEFAULT 100,
      unit TEXT DEFAULT 'piece',
      is_active INTEGER DEFAULT 1,
      barcode TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      table_number TEXT,
      customer_name TEXT,
      customer_id INTEGER,
      waiter_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      served_at TEXT,
      is_credit INTEGER DEFAULT 0,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (waiter_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES credit_customers(id)
    );

    -- Order items table
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Inventory transactions table
    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY,
      product_id INTEGER,
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL,
      total_amount REAL,
      reference_number TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Suppliers table
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0
    );

    -- Purchase orders table
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Purchase order items table
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY,
      po_id INTEGER NOT NULL,
      product_id INTEGER,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      received_quantity REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Credit customers table
    CREATE TABLE IF NOT EXISTS credit_customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      credit_limit REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0
    );

    -- Credit payments table
    CREATE TABLE IF NOT EXISTS credit_payments (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      order_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES credit_customers(id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Loyalty customers table
    CREATE TABLE IF NOT EXISTS loyalty_customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'bronze',
      total_spent REAL DEFAULT 0,
      visit_count INTEGER DEFAULT 0,
      last_visit TEXT,
      birthday TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0
    );

    -- Loyalty transactions table
    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      order_id INTEGER,
      transaction_type TEXT NOT NULL,
      points INTEGER NOT NULL,
      description TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES loyalty_customers(id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Tables table
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY,
      table_number TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT DEFAULT 'available',
      current_order_id INTEGER,
      section TEXT,
      qr_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (current_order_id) REFERENCES orders(id)
    );

    -- Cash drawer shifts table
    CREATE TABLE IF NOT EXISTS cash_drawer_shifts (
      id INTEGER PRIMARY KEY,
      opened_by INTEGER,
      opening_balance REAL NOT NULL DEFAULT 0,
      cash_in REAL DEFAULT 0,
      cash_out REAL DEFAULT 0,
      expected_balance REAL NOT NULL DEFAULT 0,
      actual_balance REAL DEFAULT 0,
      variance REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      closed_at TEXT,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (opened_by) REFERENCES users(id)
    );

    -- Cash drawer transactions table
    CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
      id INTEGER PRIMARY KEY,
      shift_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _local_only INTEGER DEFAULT 0,
      _synced INTEGER DEFAULT 0,
      FOREIGN KEY (shift_id) REFERENCES cash_drawer_shifts(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  `;

  await db.execAsync(tables);
};

// Generic query function
export const query = async (sql, params = []) => {
  try {
    const result = await db.getAllAsync(sql, params);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Generic execute function
export const execute = async (sql, params = []) => {
  try {
    const result = await db.runAsync(sql, params);
    return result;
  } catch (error) {
    console.error('Execute error:', error);
    throw error;
  }
};

// Get first result
export const getOne = async (sql, params = []) => {
  try {
    const result = await db.getFirstAsync(sql, params);
    return result;
  } catch (error) {
    console.error('GetOne error:', error);
    throw error;
  }
};

// Transaction helper
export const transaction = async (callback) => {
  try {
    await db.execAsync('BEGIN TRANSACTION;');
    await callback(db);
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};

export default db;
