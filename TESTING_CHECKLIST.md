# Testing Checklist - Bar Management System

## 🚀 Before You Start

### Prerequisites
- [ ] Expo server is running (`npx expo start`)
- [ ] Expo Go app installed on phone
- [ ] QR code visible in terminal
- [ ] Phone and computer on same network

---

## 📱 Test 1: Login & Authentication

### Steps
1. [ ] Scan QR code with Expo Go
2. [ ] App loads and shows login screen
3. [ ] Enter username: `admin`
4. [ ] Enter password: `admin123`
5. [ ] Tap "Login" button

### Expected Results
- [ ] Login successful
- [ ] Redirected to Dashboard
- [ ] User name "Owner" shown in header
- [ ] Bottom navigation tabs visible

### ❌ If Failed
- Check database initialization logs
- Restart app
- Check console for errors

---

## 📊 Test 2: Dashboard

### Steps
1. [ ] View Dashboard screen
2. [ ] Pull down to refresh

### Expected Results
- [ ] Today's Revenue: 0 RWF (or previous data)
- [ ] Today's Orders: 0 (or previous count)
- [ ] Active Orders: 0
- [ ] Low Stock Alerts: shows count
- [ ] Sample products visible in low stock section
- [ ] All stats cards displayed with icons
- [ ] Recent orders section (empty or with data)

### ❌ If Failed
- Check if database seeded correctly
- View console logs
- Try restarting app

---

## 🛒 Test 3: POS - Place an Order

### Steps
1. [ ] Tap "POS" tab in bottom navigation
2. [ ] See product grid with 2 columns
3. [ ] See "All" categories chip selected
4. [ ] Tap "Beer" category chip
5. [ ] See only beer products (Primus, Mutzig)
6. [ ] Tap "Primus" product card (3 times to add 3)
7. [ ] Tap "Coca-Cola" product card (2 times)
8. [ ] Tap floating cart button (bottom right)
9. [ ] Cart modal opens
10. [ ] Enter table number: `5`
11. [ ] Review cart items
12. [ ] Tap "Place Order" button

### Expected Results
- [ ] Products visible with images/icons
- [ ] Category filtering works
- [ ] Items added to cart (count badge on FAB)
- [ ] Cart shows:
  - 3x Primus @ 1,500 = 4,500
  - 2x Coca-Cola @ 800 = 1,600
  - Total: 6,100 RWF
- [ ] Success message: "Order ORD... placed successfully"
- [ ] Cart cleared after order
- [ ] Modal closes

### ❌ If Failed
- Check product data loaded
- Console errors?
- Database write permissions?

---

## 📋 Test 4: Order Management

### Steps
1. [ ] Tap "Orders" tab
2. [ ] See the order just placed
3. [ ] Order shows as "Pending" (orange status)
4. [ ] Tap "Mark as preparing"
5. [ ] Status changes to "Preparing" (blue)
6. [ ] Tap "Mark as ready"
7. [ ] Status changes to "Ready" (green)
8. [ ] Tap "Mark as served"
9. [ ] Status changes to "Served" (gray)

### Expected Results
- [ ] Order visible in list
- [ ] Order number displayed
- [ ] Table number: 5
- [ ] Total: 6,100 RWF
- [ ] Status workflow works smoothly
- [ ] Colors change with status
- [ ] Action buttons disappear when served

### ❌ If Failed
- Check order insertion
- Verify status update queries
- Console errors?

---

## 📦 Test 5: Inventory Check

### Steps
1. [ ] Tap "Inventory" tab
2. [ ] View all products
3. [ ] Find "Primus" (should show stock decreased by 3)
4. [ ] Note: Original stock was 100
5. [ ] After order: Should be 97
6. [ ] Find "Coca-Cola" (decreased by 2)
7. [ ] Original: 150, After: 148

### Expected Results
- [ ] Inventory screen loads
- [ ] Products grouped by category
- [ ] Stock levels updated correctly
- [ ] Low stock alerts visible if any
- [ ] Status icons colored correctly:
  - Green: In Stock
  - Orange: Low Stock
  - Red: Out of Stock

### ❌ If Failed
- Check stock movement recording
- Verify product update query
- Console logs?

---

## 📦 Test 6: Add Stock

### Steps
1. [ ] In Inventory tab
2. [ ] Find "Primus" product
3. [ ] Tap "Add Stock" button
4. [ ] Modal opens
5. [ ] Current stock shown: 97
6. [ ] Enter quantity: `24`
7. [ ] Tap "Add Stock"

### Expected Results
- [ ] Success message shown
- [ ] Stock updated to 121 (97 + 24)
- [ ] Product card refreshes
- [ ] Low stock alert cleared (if was low)

### ❌ If Failed
- Check update query
- Verify stock movement insert
- Console errors?

---

## 📈 Test 7: Reports & Analytics

### Steps
1. [ ] Tap "Reports" tab
2. [ ] See "Today" selected by default
3. [ ] View summary cards:
   - Total Revenue
   - Total Orders
   - Avg Order Value
4. [ ] Check "Top Selling Products" table
5. [ ] Tap "This Week" button
6. [ ] Data updates

### Expected Results
- [ ] Today's stats shown:
  - Revenue: 6,100 RWF (from our test order)
  - Orders: 1
  - Avg: 6,100 RWF
- [ ] Top products table shows:
  - Primus: 3 sold, 4,500 RWF
  - Coca-Cola: 2 sold, 1,600 RWF
- [ ] Hourly sales shown (current hour)
- [ ] Period switching works

### ❌ If Failed
- Check date filtering
- Verify aggregation queries
- Console logs?

---

## 🎨 Test 8: Dashboard Update

### Steps
1. [ ] Return to Dashboard tab
2. [ ] Pull to refresh

### Expected Results
- [ ] Today's Revenue: 6,100 RWF ✅
- [ ] Today's Orders: 1 ✅
- [ ] Recent order visible in list
- [ ] All data refreshed

---

## 👤 Test 9: Settings & Logout

### Steps
1. [ ] Tap "Settings" tab
2. [ ] View profile card
3. [ ] See user info: Owner, @admin
4. [ ] Scroll down
5. [ ] Tap "Logout" button
6. [ ] Confirm action

### Expected Results
- [ ] Profile displayed correctly
- [ ] Settings options visible
- [ ] Logout successful
- [ ] Redirected to Login screen
- [ ] Can log back in

---

## 🔄 Test 10: Full Workflow

### Complete Business Day Simulation

#### Morning - Opening
1. [ ] Login as admin
2. [ ] Check Dashboard (0 revenue)
3. [ ] Check Inventory levels

#### Lunch - First Orders
1. [ ] Create Order 1:
   - Table 1: 2x Primus, 1x Fanta, 1x Fish
2. [ ] Create Order 2:
   - Table 3: 3x Mutzig, 2x Sprite
3. [ ] Create Order 3:
   - Table 5: 1x Chicken, 1x Coke, 1x Orange Juice

#### Afternoon - Order Processing
1. [ ] Go to Orders
2. [ ] Mark all as Preparing
3. [ ] Mark all as Ready
4. [ ] Mark all as Served

#### Evening - Stock Check
1. [ ] Go to Inventory
2. [ ] Check which items are low
3. [ ] Add stock to low items

#### Night - Reports
1. [ ] Go to Reports
2. [ ] View today's total
3. [ ] Check top products
4. [ ] Note busiest hour

### Expected Results
- [ ] All orders processed smoothly
- [ ] Stock levels accurate
- [ ] Reports show correct totals
- [ ] No crashes or errors
- [ ] Smooth performance

---

## 🧪 Edge Cases to Test

### Low Stock Alert
1. [ ] Reduce a product stock to min level
2. [ ] Dashboard shows alert
3. [ ] Inventory shows orange/red status

### Out of Stock
1. [ ] Try to order item with 0 stock
2. [ ] Should allow (food items) or show alert (beverages)

### Large Order
1. [ ] Add 20+ items to cart
2. [ ] Check performance
3. [ ] Verify total calculation

### Search Function
1. [ ] In POS, search "prim"
2. [ ] Should show Primus
3. [ ] Search "fish"
4. [ ] Should show Grilled Fish

### Filter by Status
1. [ ] In Orders, filter by "Pending"
2. [ ] Should show only pending orders
3. [ ] Filter by "Served"
4. [ ] Should show completed orders

---

## 📱 Device-Specific Tests

### On Phone
- [ ] Touch targets easy to tap
- [ ] Text readable
- [ ] Keyboard doesn't cover inputs
- [ ] Scrolling smooth
- [ ] Navigation responsive

### On Tablet
- [ ] Layout uses space well
- [ ] Cards not stretched
- [ ] Good use of columns
- [ ] Everything accessible

### On Web (Optional)
- [ ] Run: `npx expo start --web`
- [ ] All features work
- [ ] Mouse interactions OK
- [ ] Responsive design

---

## 🐛 Bug Report Template

If you find issues, note:

```
**Bug**: [Brief description]
**Screen**: [Which screen?]
**Steps**: 
1. [Step 1]
2. [Step 2]
**Expected**: [What should happen]
**Actual**: [What happened]
**Logs**: [Any console errors]
```

---

## ✅ Final Checklist

### Core Functionality
- [ ] Login works
- [ ] POS can take orders
- [ ] Orders tracked properly
- [ ] Inventory updates on sale
- [ ] Can add stock
- [ ] Dashboard shows real-time data
- [ ] Reports accurate
- [ ] Logout works

### Data Integrity
- [ ] Stock levels correct after orders
- [ ] Revenue calculations accurate
- [ ] Order totals correct
- [ ] Low stock alerts working
- [ ] All timestamps accurate

### User Experience
- [ ] App loads quickly
- [ ] No crashes
- [ ] Smooth navigation
- [ ] Clear feedback messages
- [ ] Intuitive interface
- [ ] Colors/icons clear

### Performance
- [ ] Fast order placement (<2 sec)
- [ ] Quick screen transitions
- [ ] Smooth scrolling
- [ ] Responsive buttons
- [ ] No lag or freezing

---

## 🎯 Success Criteria

### ✅ PASS if:
- All critical features work
- No data loss
- No crashes
- Acceptable performance
- Can complete full workflow

### ⚠️ MINOR ISSUES if:
- Small UI glitches
- Non-critical features missing
- Minor performance lag
- Can work around issues

### ❌ FAIL if:
- Cannot place orders
- Data corruption
- Frequent crashes
- Cannot complete basic workflow

---

## 📞 After Testing

### Report Back:
1. **What worked well?**
2. **What issues did you find?**
3. **What features do you want to improve?**
4. **Any additional requests?**

### Next Steps:
- Fix critical bugs
- Enhance based on feedback
- Add WhatsApp integration
- Set up cloud backup
- Deploy to production

---

**Start Testing!** 🚀

Use this checklist systematically and note any issues. The app should work smoothly for all core features. Report back and we'll fix any problems tomorrow!
