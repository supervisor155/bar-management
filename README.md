# Bar Management System

A comprehensive mobile POS and inventory management system for bars and restaurants, built with React Native and Expo.

## Features

### ✅ Completed (Day 1)

#### 1. **Authentication System**
- Login with username/password
- Role-based access control (Owner, Manager, Waiter, Bartender)
- Default credentials: `admin` / `admin123`

#### 2. **Point of Sale (POS)**
- Product catalog with categories
- Search and filter products
- Shopping cart functionality
- Table number assignment
- Order placement
- Real-time stock updates

#### 3. **Order Management**
- View all orders with status
- Filter by order status (Pending, Preparing, Ready, Served)
- Search orders by number or table
- Update order status workflow
- Cancel orders

#### 4. **Inventory Management**
- View all products by category
- Stock level tracking
- Low stock alerts
- Add stock functionality
- Stock movement history
- Product details (cost price, selling price, min stock level)

#### 5. **Dashboard**
- Real-time statistics
  - Today's revenue
  - Today's orders count
  - Active orders
  - Low stock alerts
- Recent orders list
- Low stock products alert

#### 6. **Reports & Analytics**
- Sales reports (Today, This Week, This Month)
- Revenue summary
- Top selling products
- Hourly sales breakdown
- Average order value

#### 7. **Settings**
- User profile
- App settings
- Logout functionality

### 🔮 Planned (Day 2 - To be added)
- WhatsApp integration for automated reports
- Cloud sync with Supabase
- Print receipts
- Customer management
- Staff management
- Supplier management
- Advanced analytics (seasonal trends, peak times)

## Tech Stack

- **Framework**: React Native with Expo
- **UI Library**: React Native Paper (Material Design)
- **Database**: SQLite (offline-first)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **Date Handling**: date-fns

## Database Schema

### Tables
1. **users** - User accounts with roles
2. **categories** - Product categories (Beverage, Food)
3. **products** - Inventory items
4. **orders** - Customer orders
5. **order_items** - Individual items in orders
6. **stock_movements** - Inventory movement history
7. **daily_summaries** - Aggregated daily data
8. **suppliers** - Supplier information

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo Go app (for mobile testing)

### Installation

1. Clone the repository
```bash
cd bar-management
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npx expo start
```

4. Scan the QR code with:
   - **Android**: Expo Go app
   - **iOS**: Camera app (opens in Expo Go)
   - **Web**: Press `w` in terminal

### Default Login
- **Username**: admin
- **Password**: admin123
- **Role**: Owner (full access)

## User Roles & Permissions

| Feature | Owner | Manager | Waiter | Bartender |
|---------|-------|---------|--------|-----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| POS | ✅ | ✅ | ✅ | ✅ |
| Orders | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ |

## Project Structure

```
bar-management/
├── src/
│   ├── components/         # Reusable UI components
│   ├── context/           # React Context (AuthContext)
│   ├── database/          # SQLite database setup and queries
│   │   ├── database.js    # Database helpers
│   │   └── schema.js      # Table schemas and seed data
│   ├── navigation/        # Navigation configuration
│   │   └── AppNavigator.js
│   ├── screens/           # App screens
│   │   ├── DashboardScreen.js
│   │   ├── POSScreen.js
│   │   ├── OrdersScreen.js
│   │   ├── InventoryScreen.js
│   │   ├── ReportsScreen.js
│   │   ├── SettingsScreen.js
│   │   └── LoginScreen.js
│   ├── services/          # API services (future)
│   └── utils/             # Utility functions
├── App.js                 # Main app entry point
└── package.json

```

## Sample Products (Pre-loaded)

### Beverages
- Primus (Beer) - 1,500 RWF
- Mutzig (Beer) - 1,500 RWF
- Coca-Cola - 800 RWF
- Fanta - 800 RWF
- Sprite - 800 RWF
- Orange Juice - 1,200 RWF

### Food
- Grilled Fish - 6,000 RWF
- Grilled Chicken - 5,000 RWF
- Fried Potatoes - 1,500 RWF
- Beef Brochette - 4,500 RWF

## How to Use

### Taking an Order (Waiter/Bartender)
1. Go to **POS** tab
2. Browse or search for products
3. Tap products to add to cart
4. Tap the floating cart button
5. (Optional) Enter table number
6. Review order and tap "Place Order"

### Managing Orders (Kitchen/Bar)
1. Go to **Orders** tab
2. View pending orders
3. Tap "Mark as preparing" when you start
4. Tap "Mark as ready" when complete
5. Waiter marks as "served" when delivered

### Adding Stock (Manager/Owner)
1. Go to **Inventory** tab
2. Find the product
3. Tap "Add Stock" button
4. Enter quantity
5. Tap "Add Stock" to confirm

### Viewing Reports (Manager/Owner)
1. Go to **Reports** tab
2. Select period (Today/Week/Month)
3. View sales summary and top products

## Development Timeline

### Day 1 ✅ (Completed)
- Project setup
- Database schema
- Authentication
- All core screens
- Basic functionality

### Day 2 🔨 (In Progress)
- Bug fixes and polish
- WhatsApp integration
- Cloud backup
- Testing on devices
- Performance optimization

## Troubleshooting

### Database not initializing
- Clear app data and restart
- Check console for SQLite errors

### Products not showing
- Ensure database seeding completed
- Check `initDatabase()` logs

### Navigation issues
- Restart Expo server
- Clear Metro bundler cache: `npx expo start -c`

## Future Enhancements
- Multi-location support
- Customer loyalty program
- QR code menu for customers
- Table reservation system
- Kitchen display system (KDS)
- Advanced reporting (PDF export)
- Multi-language support
- Dark mode theme

## Support
For issues or questions, contact the development team.

## License
Proprietary - All rights reserved

---

**Built with ❤️ for Bar & Restaurant Management**
