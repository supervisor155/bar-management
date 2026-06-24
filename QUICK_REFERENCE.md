# Quick Reference Card

## 🚀 Running the App

### Web Browser (Currently Running!)
```bash
npx expo start --web --port 8082
```
**URL**: http://localhost:8082

### Android Emulator (If you have one)
```bash
npx expo start --android
```

### iOS Simulator (Mac only)
```bash
npx expo start --ios
```

### Phone (Expo Go)
```bash
npx expo start
# Scan QR code with Expo Go app
```

---

## 🔐 Login Credentials

**Default Account:**
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Owner (full access)

---

## 📱 Quick Test Workflow

### 1. Login
- Open app
- Enter: admin / admin123
- Tap Login

### 2. View Dashboard
- See today's stats (all zeros initially)
- Check pre-loaded products

### 3. Place an Order (POS Tab)
- Tap POS at bottom
- Tap "Primus" 3 times (adds 3 to cart)
- Tap "Coca-Cola" 2 times
- Tap cart button (floating bottom-right)
- Enter table: 5
- Tap "Place Order"

### 4. Check Order (Orders Tab)
- Tap Orders
- See new order
- Status: Pending (orange)
- Tap "Mark as preparing"
- Then "Mark as ready"
- Then "Mark as served"

### 5. Verify Inventory (Inventory Tab)
- Tap Inventory
- Find Primus: stock now 97 (was 100)
- Find Coca-Cola: stock now 148 (was 150)

### 6. View Dashboard Again
- Tap Dashboard
- Revenue: 6,100 RWF
- Orders: 1
- Recent order visible

### 7. Check Reports (Reports Tab)
- Tap Reports
- Today selected
- Revenue: 6,100 RWF
- Top product: Primus (3 sold)

---

## 🗄️ Pre-loaded Products

### Beverages
| Product | Price | Stock |
|---------|-------|-------|
| Primus | 1,500 RWF | 100 |
| Mutzig | 1,500 RWF | 80 |
| Coca-Cola | 800 RWF | 150 |
| Fanta | 800 RWF | 120 |
| Sprite | 800 RWF | 100 |
| Orange Juice | 1,200 RWF | 50 |

### Food
| Product | Price |
|---------|-------|
| Grilled Fish | 6,000 RWF |
| Grilled Chicken | 5,000 RWF |
| Fried Potatoes | 1,500 RWF |
| Beef Brochette | 4,500 RWF |

---

## 🎯 Key Features

### Dashboard
- Real-time revenue counter
- Today's order count
- Active orders
- Low stock alerts
- Recent orders list

### POS (Point of Sale)
- Browse products
- Search products
- Category filter
- Add to cart
- Table assignment
- Order placement

### Orders
- View all orders
- Filter by status
- Search orders
- Update status workflow
- Cancel orders

### Inventory
- View all products
- Stock levels
- Low stock alerts
- Add stock
- Grouped by category

### Reports
- Daily/Weekly/Monthly
- Revenue summary
- Top products
- Hourly breakdown
- Average order value

### Settings
- User profile
- App info
- Logout

---

## 🎨 Color Codes

### Order Status
- 🟠 **Orange** = Pending
- 🔵 **Blue** = Preparing
- 🟢 **Green** = Ready
- ⚫ **Gray** = Served
- 🔴 **Red** = Cancelled

### Stock Status
- 🟢 **Green** = In Stock
- 🟠 **Orange** = Low Stock
- 🔴 **Red** = Out of Stock

---

## ⌨️ Keyboard Shortcuts (Web)

- **F5** = Refresh page
- **Ctrl+Shift+R** = Hard refresh
- **F12** = Open DevTools (see errors)

---

## 🐛 Troubleshooting

### App not loading?
- Check console (F12) for errors
- Hard refresh (Ctrl+Shift+R)
- Restart Expo server

### Database errors?
- Clear browser storage
- Reload app

### Products not showing?
- Check console logs
- Database should auto-seed on first load

### Can't login?
- Check username/password: admin / admin123
- Check console for errors

---

## 📊 Sample Order for Testing

**Table 5 - Weekend Night Order:**
- 3x Primus = 4,500 RWF
- 2x Coca-Cola = 1,600 RWF
- 1x Grilled Fish = 6,000 RWF
- 1x Fried Potatoes = 1,500 RWF
**Total: 13,600 RWF**

---

## 🔗 Important URLs

- **Web App**: http://localhost:8082
- **Metro Bundler**: http://localhost:8082
- **DevTools**: Press F12 in browser

---

## 📞 Need Help?

1. Check [README.md](README.md) for full docs
2. Check [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for detailed testing
3. Check browser console (F12) for errors
4. Report any bugs you find

---

## ✨ Quick Tips

- **Pull down to refresh** most screens
- **Long press** for additional options (future)
- **Search** works everywhere
- **Categories** filter products
- **Cart** shows item count badge
- **Logout** from Settings tab

---

## 🎓 For Your Staff

### Waiter Quick Guide
1. Login
2. Go to POS
3. Tap products to add
4. Tap cart
5. Enter table number
6. Place order

### Kitchen Quick Guide
1. Login
2. Go to Orders
3. See pending orders
4. Mark as "Preparing"
5. Mark as "Ready" when done

### Manager Quick Guide
1. Check Dashboard hourly
2. Watch low stock alerts
3. Add stock when needed
4. Review reports daily

---

**You're all set!** 🚀

The app should be loading in your browser now. Login and start testing!
