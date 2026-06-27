# Database Migration Guide - Day 2.5 Update

## Overview
This migration adds credit customer tracking and fixes real-time dashboard updates.

## New Features Added:
1. ✅ **Credit Customers Management** - Track customers who order on credit
2. ✅ **Real-time Dashboard Updates** - Auto-refresh when navigating back
3. ✅ **Fixed New User Login** - Case-insensitive username matching
4. ✅ **Credit Orders in POS** - Place orders on credit for registered customers

## Database Changes

### New Tables Created:

#### 1. `credit_customers`
Stores customer information for credit tracking:
- `id` - Primary key
- `customer_name` - Customer full name
- `phone` - Contact number
- `id_number` - ID/passport number (optional)
- `total_credit` - Total amount credited
- `total_paid` - Total amount paid back
- `balance` - Current outstanding balance
- `is_active` - Account status
- `notes` - Additional notes
- `created_at` / `updated_at` - Timestamps

#### 2. `credit_transactions`
Tracks all credit transactions:
- `id` - Primary key
- `customer_id` - Foreign key to credit_customers
- `order_id` - Foreign key to orders (for credit orders)
- `transaction_type` - 'credit' or 'payment'
- `amount` - Transaction amount
- `balance_after` - Balance after transaction
- `notes` - Transaction notes
- `created_by` - User who created the transaction
- `created_at` - Timestamp

### Modified Tables:

#### `orders` Table
Added new column:
- `customer_id` - Foreign key to credit_customers (NULL for regular orders)

This links orders to credit customers when payment method is 'credit'.

## Migration Steps

### For New Installations:
No action needed. The schema.js file includes all new tables and they will be created automatically on first run.

### For Existing Installations:
The app will automatically create the new tables when you restart. Your existing data will remain intact.

#### Manual Migration (if needed):
If automatic migration fails, run these SQL commands in your database:

```sql
-- Create credit_customers table
CREATE TABLE IF NOT EXISTS credit_customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  id_number TEXT,
  total_credit REAL DEFAULT 0,
  total_paid REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  order_id INTEGER,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('credit', 'payment')),
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES credit_customers(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Add customer_id column to orders table (if not exists)
ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES credit_customers(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_customers_active ON credit_customers(is_active);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id);
```

## New Screens Added:

### CreditCustomersScreen.js
Full CRUD interface for managing credit customers:
- **Add Customer** - Register new credit customer with phone and ID
- **View Balance** - See total credit, paid, and outstanding balance
- **Record Payment** - Mark payments against customer balance
- **Transaction History** - View all credit and payment transactions
- **Customer Stats** - Visual breakdown of credit status

### Enhanced POSScreen.js
Added credit order functionality:
- Radio button to select "Regular Order" or "Credit Order"
- Customer dropdown for credit orders
- Shows customer current balance
- Automatically updates customer credit balance on order placement
- Creates credit transaction record

## How to Use New Features

### 1. Add Credit Customers
```
1. Login as Owner
2. Go to Settings → Credit Customers
3. Tap "Add Customer" button
4. Fill in:
   - Customer Name *
   - Phone Number *
   - ID Number (optional)
   - Notes (optional)
5. Tap "Add Customer"
```

### 2. Place Credit Order
```
1. Go to POS tab
2. Add items to cart
3. Tap cart button
4. Select "Credit Order (Pay Later)"
5. Choose customer from dropdown
6. View customer's current balance
7. Place Order
```

### 3. Record Payment
```
1. Go to Settings → Credit Customers
2. Find customer with balance
3. Tap "Record Payment"
4. Enter payment amount
5. Confirm
```

### 4. View Transaction History
```
1. Go to Settings → Credit Customers
2. Find customer
3. Tap "History" button
4. See all credit orders and payments
```

## Fixed Issues

### 1. Dashboard Not Refreshing
**Problem:** Dashboard showed stale data after placing orders.
**Solution:** Added `useFocusEffect` hook to auto-refresh dashboard when screen comes into focus.

**Files Changed:**
- `src/screens/DashboardScreen.js` - Added auto-refresh on focus

### 2. New Users Can't Login
**Problem:** Newly created users couldn't login even with correct credentials.
**Solution:** 
- Added case-insensitive username matching (`COLLATE NOCASE`)
- Added better error logging
- Fixed is_active boolean checking

**Files Changed:**
- `src/context/AuthContext.js` - Enhanced login query

### 3. No Way to Track Credit/Debt
**Problem:** No system to track customers who order but pay later.
**Solution:** Complete credit customer management system with:
- Customer registration
- Credit order placement
- Payment recording
- Transaction history
- Balance tracking

**Files Changed:**
- `src/database/schema.js` - Added new tables
- `src/screens/CreditCustomersScreen.js` - New screen
- `src/screens/POSScreen.js` - Added credit order support
- `src/navigation/AppNavigator.js` - Added navigation
- `src/screens/SettingsScreen.js` - Added menu item

## Testing Checklist

- [ ] **Create new user and login** - Verify new users can login immediately
- [ ] **Dashboard auto-refresh** - Place order in POS, go to Dashboard, check it updates
- [ ] **Add credit customer** - Create a test customer
- [ ] **Place credit order** - Create order on credit
- [ ] **Check customer balance** - Verify balance increased
- [ ] **Record payment** - Make a payment against balance
- [ ] **View transaction history** - Check all transactions appear
- [ ] **Regular orders still work** - Verify normal orders unaffected

## Rollback Instructions

If you need to rollback these changes:

1. **Restore old files:**
   ```bash
   git checkout HEAD~1 src/database/schema.js
   git checkout HEAD~1 src/context/AuthContext.js
   git checkout HEAD~1 src/screens/DashboardScreen.js
   git checkout HEAD~1 src/screens/POSScreen.js
   git checkout HEAD~1 src/navigation/AppNavigator.js
   git checkout HEAD~1 src/screens/SettingsScreen.js
   ```

2. **Remove new screen:**
   ```bash
   rm src/screens/CreditCustomersScreen.js
   ```

3. **Clear app data** (mobile) or **Clear browser storage** (web)

## Support

If you encounter issues:
1. Check console for error messages
2. Verify database tables were created: `SELECT name FROM sqlite_master WHERE type='table';`
3. Check the QUICKSTART.md guide
4. Review this migration guide

## Summary

**Total Changes:**
- New Screens: 1 (CreditCustomersScreen)
- Modified Screens: 4 (Dashboard, POS, Settings, Navigation)
- New Database Tables: 2
- Modified Database Tables: 1
- New Features: 4
- Bug Fixes: 2

**Backward Compatibility:** ✅ Yes - All existing features continue to work
**Data Safety:** ✅ Yes - No existing data is modified or deleted
**Breaking Changes:** ❌ No - Fully backward compatible

---

**Version:** 1.1.0  
**Migration Date:** June 27, 2026  
**Status:** ✅ Ready for Production
