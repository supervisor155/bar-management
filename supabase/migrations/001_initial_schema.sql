-- Bar Management System - Complete Database Schema
-- Run this in Supabase SQL Editor after creating project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'waiter', 'bartender', 'cook')),
  is_active BOOLEAN DEFAULT true,
  push_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  price REAL NOT NULL,
  cost_price REAL DEFAULT 0,
  description TEXT,
  image_url TEXT,
  current_stock REAL DEFAULT 0,
  min_stock_level REAL DEFAULT 0,
  max_stock_level REAL DEFAULT 100,
  unit TEXT DEFAULT 'piece',
  is_active BOOLEAN DEFAULT true,
  barcode TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  table_number TEXT,
  customer_name TEXT,
  customer_id INTEGER,
  waiter_id INTEGER REFERENCES users(id),
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'mobile', 'credit')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  served_at TIMESTAMP,
  is_credit BOOLEAN DEFAULT false
);

-- 5. Order items table
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Payments table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Inventory transactions table
CREATE TABLE inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'waste', 'return')),
  quantity REAL NOT NULL,
  unit_price REAL,
  total_amount REAL,
  reference_number TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Suppliers table
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Purchase orders table
CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Purchase order items table
CREATE TABLE purchase_order_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  received_quantity REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Credit customers table
CREATE TABLE credit_customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  credit_limit REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 12. Credit payments table
CREATE TABLE credit_payments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES credit_customers(id),
  order_id INTEGER REFERENCES orders(id),
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 13. Loyalty customers table
CREATE TABLE loyalty_customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  total_spent REAL DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visit TIMESTAMP,
  birthday DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. Loyalty transactions table
CREATE TABLE loyalty_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES loyalty_customers(id),
  order_id INTEGER REFERENCES orders(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjust')),
  points INTEGER NOT NULL,
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 15. Tables table
CREATE TABLE tables (
  id SERIAL PRIMARY KEY,
  table_number TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  current_order_id INTEGER REFERENCES orders(id),
  section TEXT,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 16. Cash drawer shifts table
CREATE TABLE cash_drawer_shifts (
  id SERIAL PRIMARY KEY,
  opened_by INTEGER REFERENCES users(id),
  opening_balance REAL NOT NULL DEFAULT 0,
  cash_in REAL DEFAULT 0,
  cash_out REAL DEFAULT 0,
  expected_balance REAL NOT NULL DEFAULT 0,
  actual_balance REAL DEFAULT 0,
  variance REAL DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- 17. Cash drawer transactions table
CREATE TABLE cash_drawer_transactions (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER REFERENCES cash_drawer_shifts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('cash_in', 'cash_out')),
  amount REAL NOT NULL,
  notes TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_loyalty_customers_phone ON loyalty_customers(phone);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_customers_updated_at BEFORE UPDATE ON credit_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loyalty_customers_updated_at BEFORE UPDATE ON loyalty_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default owner user (password: admin123)
INSERT INTO users (username, password, full_name, role)
VALUES ('admin', 'admin123', 'System Administrator', 'owner');

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
('Beverages', 'Alcoholic and non-alcoholic drinks', 'glass-cocktail'),
('Food', 'Snacks and meals', 'food'),
('Spirits', 'Hard liquor and spirits', 'bottle-wine'),
('Beer', 'Local and imported beers', 'beer');

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users for now)
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON inventory_transactions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON suppliers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON purchase_orders FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON purchase_order_items FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON credit_customers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON credit_payments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON loyalty_customers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON loyalty_transactions FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON tables FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON cash_drawer_shifts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON cash_drawer_transactions FOR ALL USING (true);
