# Quick Start Guide - Bar Management System

## 🚀 Running the App (2 Minutes)

### Step 1: Start the Server
```bash
cd bar-management
npx expo start
```

### Step 2: Open on Your Phone
1. Install **Expo Go** app from:
   - Android: Play Store
   - iOS: App Store

2. Scan the QR code shown in terminal with:
   - Android: Expo Go app
   - iOS: Camera app

### Step 3: Login
- Username: `admin`
- Password: `admin123`

## 📱 Testing the Full Workflow

### Scenario: Weekend Rush - Taking Orders

#### 1. Login as Waiter
- Use default login (admin/admin123)

#### 2. Take an Order
- Tap **POS** tab
- Add items:
  - 3x Primus (beer)
  - 2x Coca-Cola
  - 1x Grilled Fish
- Tap cart button (bottom right)
- Enter table number: `5`
- Tap **Place Order**

#### 3. Check Orders (as Bartender/Kitchen)
- Go to **Orders** tab
- See new order pending
- Tap **Mark as preparing**
- When ready: Tap **Mark as ready**
- When delivered: Tap **Mark as served**

#### 4. View Dashboard
- Go to **Dashboard** tab
- See today's revenue updated
- See active orders count
- Check low stock alerts

#### 5. Check Inventory
- Go to **Inventory** tab (Owner/Manager only)
- Notice Primus stock decreased by 3
- If low stock, tap **Add Stock**
- Add 24 bottles (1 crate)

#### 6. View Reports
- Go to **Reports** tab (Owner/Manager only)
- Select **Today**
- See revenue: 13,500 RWF
- Top product: Primus (3 sold)
- Hourly breakdown shows current hour

## 🎯 Key Features to Demo

### For Owners/Managers
1. **Dashboard** - Real-time business overview
2. **Inventory** - Track stock, low alerts, add stock
3. **Reports** - Sales analytics, top products, hourly trends
4. **Orders** - Full order history and status

### For Waiters/Bartenders
1. **POS** - Quick order entry, search products
2. **Orders** - See active orders, update status
3. **Dashboard** - View today's activity

## 📊 Understanding the Data Flow

```
Waiter → POS → Places Order
                    ↓
                Orders Table
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
    Stock Updates          Order Items
        ↓                       ↓
   Inventory               Kitchen/Bar
        ↓                       ↓
   Low Alerts            Status Updates
                              ↓
                          Completed
                              ↓
                          Revenue
                              ↓
                        Dashboard/Reports
```

## 🧪 Testing Checklist

- [ ] Login works
- [ ] Can place an order
- [ ] Stock decreases after order
- [ ] Low stock alert shows when threshold reached
- [ ] Dashboard shows updated stats
- [ ] Order status can be changed
- [ ] Reports show correct data
- [ ] Can add stock to inventory
- [ ] Logout works

## 📱 Running on Different Devices

### Android Emulator
```bash
npx expo start --android
```

### iOS Simulator (Mac only)
```bash
npx expo start --ios
```

### Web Browser
```bash
npx expo start --web
```

## 🔧 Common Issues & Fixes

### Issue: QR code not showing
**Fix**: Press `r` in terminal to reload

### Issue: Metro bundler error
**Fix**: Clear cache and restart
```bash
npx expo start -c
```

### Issue: Database not initializing
**Fix**: Uninstall app from phone and reinstall

### Issue: Products not showing
**Fix**: Check console logs, database should auto-seed on first run

## 💡 Tips for Demo Day

1. **Pre-load some test data** before demo
2. **Take 2-3 orders** to show activity
3. **Demonstrate role switching** (explain you'd login as different users)
4. **Show the analytics** - most impressive part
5. **Highlight offline capability** - works without internet
6. **Show low stock alerts** - practical feature

## 🎬 Demo Script (5 minutes)

### Minute 1: Introduction
"This is a complete bar management system for monitoring sales, inventory, and operations."

### Minute 2: POS Demo
"Waiters can quickly take orders - let me add Primus, Fish, and Coke to table 5."

### Minute 3: Order Management
"Kitchen staff see orders in real-time and update status as they prepare."

### Minute 4: Dashboard & Inventory
"Owners see live revenue, low stock alerts - notice Primus is running low."

### Minute 5: Reports
"Full analytics - today's sales, top products, busiest hours. Perfect for weekend monitoring."

## 📈 What Makes This Special

✅ **Offline-first** - Works without internet
✅ **Role-based access** - Different views for staff
✅ **Real-time updates** - Instant stock changes
✅ **Business insights** - Analytics for decision making
✅ **Mobile-first** - Built for tablets and phones
✅ **Cross-platform** - Android, iOS, Web

## 🔐 Additional Test Users (Optional)

You can add more users by logging in as admin and using the Settings (in future version), or directly via database:

```sql
INSERT INTO users (username, password, full_name, role) VALUES
('manager1', 'manager123', 'John Manager', 'manager'),
('waiter1', 'waiter123', 'Jane Waiter', 'waiter'),
('bartender1', 'bar123', 'Mike Bartender', 'bartender');
```

## 🚀 Next Steps

- [ ] Test on real device
- [ ] Add more products
- [ ] Test during actual service
- [ ] Train staff on the app
- [ ] Set up cloud backup (Day 2)
- [ ] Configure WhatsApp alerts (Day 2)

---

**Need help?** Check [README.md](README.md) for full documentation
