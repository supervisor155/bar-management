# 🚀 Supabase Setup Guide

Complete guide to set up Supabase backend with offline-first architecture and push notifications.

---

## ✅ **STEP 1: Create Supabase Project**

1. Go to https://supabase.com
2. Click **"Start your project"** → Sign in/Sign up
3. Click **"New Project"**
4. Fill in:
   - **Name**: `bar-management`
   - **Database Password**: Choose strong password (save it!)
   - **Region**: Choose closest to Rwanda (Europe West or Middle East)
5. Click **"Create new project"**
6. Wait 2-3 minutes for setup

---

## ✅ **STEP 2: Run Database Migration**

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open file: `supabase/migrations/001_initial_schema.sql`
4. Copy entire content
5. Paste into SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. Wait for success message: "Success. No rows returned"

✅ This creates all 17 tables + indexes + triggers + default data

---

## ✅ **STEP 3: Enable Realtime**

1. Go to **Database** → **Replication** (left sidebar)
2. Enable replication for these tables:
   - ✅ `orders`
   - ✅ `products`
   - ✅ `cash_drawer_shifts`
3. Click **"Save"**

✅ This enables real-time subscriptions for notifications

---

## ✅ **STEP 4: Get API Credentials**

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:

```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Open file: `src/config/supabase.js`
4. Replace placeholders:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // Paste your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Paste your key
```

5. Save file

---

## ✅ **STEP 5: Install Dependencies**

Run these commands in your terminal:

```bash
cd bar-management

# Install new packages
npm install @supabase/supabase-js@^2.48.1
npm install @react-native-community/netinfo@^11.5.3
npm install expo-notifications@~0.31.0
npm install expo-device@~7.0.2
npm install expo-constants@~56.0.5

# Verify installation
npm list
```

---

## ✅ **STEP 6: Configure Expo Notifications**

### A. Create Expo Account (if you don't have one)

1. Go to https://expo.dev
2. Sign up with email/GitHub
3. Verify email

### B. Install EAS CLI

```bash
npm install -g eas-cli
```

### C. Login to Expo

```bash
eas login
```

### D. Configure app.json

Open `app.json` and add:

```json
{
  "expo": {
    "name": "Bar Management",
    "slug": "bar-management",
    "version": "1.0.0",
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID_HERE"
      }
    },
    "android": {
      "package": "com.yourcompany.barmanagement",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#1976d2",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### E. Get Expo Project ID

```bash
eas build:configure
```

This will create `eas.json` and give you a project ID. Copy the ID to `app.json` → `extra.eas.projectId`

---

## ✅ **STEP 7: Update App Entry Point**

Open `App.js` and replace with:

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ActivityIndicator, Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database/sqliteDatabase';
import { syncEngine } from './src/services/syncEngine';
import { notificationService } from './src/services/notificationService';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Initializing app...');

        // 1. Initialize local SQLite database
        await initDatabase();
        console.log('✅ Local database initialized');

        // 2. Start sync engine
        await syncEngine.start();
        console.log('✅ Sync engine started');

        // Note: Notification service will be initialized after login
        // because it needs userId and userRole

        setIsReady(true);
        console.log('🎉 App ready!');
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        setIsReady(true); // Continue anyway
      }
    }

    prepare();

    // Cleanup on unmount
    return () => {
      syncEngine.stop();
      notificationService.cleanup();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ marginTop: 16 }}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <PaperProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
  );
}
```

---

## ✅ **STEP 8: Update AuthContext**

We need to initialize notifications after login.

Open `src/context/AuthContext.js` and add this after successful login:

```javascript
// Import at top
import { notificationService } from '../services/notificationService';

// After login success (in login function):
// Initialize notifications with user context
await notificationService.initialize(userData.id, userData.role);
```

---

## ✅ **STEP 9: Test the System**

### A. Start the app

```bash
npm start
```

### B. Test offline mode

1. Login with default credentials (admin/admin123)
2. Create a new order
3. Turn off WiFi/mobile data
4. Create another order (should work!)
5. Check Dashboard → should show "Pending sync" indicator
6. Turn WiFi back on
7. Wait 10 seconds → orders sync automatically!

### C. Test notifications

1. Login as manager (admin/admin123)
2. Settings → Enable notifications
3. Open another device/browser
4. Login as cook
5. Create new order on first device
6. Cook should receive notification: "🍽️ New Order Received"

---

## 🎯 **FEATURES ENABLED**

### ✅ Offline-First Architecture
- All data saved to local SQLite
- Works completely offline
- Auto-sync when internet returns
- No data loss on phone shutdown
- Transaction-safe operations

### ✅ Real-time Notifications (5 Types)
1. **Kitchen**: New order alerts
2. **Waiters**: Order ready notifications
3. **Managers**: Low stock alerts
4. **Managers**: Cash drawer variance alerts
5. **Managers**: AI insight notifications

### ✅ Data Safety
- Sync queue persists to disk
- Survives app crashes
- Survives phone shutdowns
- Automatic retry on failures
- Conflict resolution (last write wins)

---

## 🔧 **Troubleshooting**

### Issue: "Cannot connect to Supabase"
**Solution**: Check `src/config/supabase.js` has correct URL and key

### Issue: "Notifications not working"
**Solution**: Run `eas build:configure` and ensure `app.json` has project ID

### Issue: "Sync queue growing"
**Solution**: Check internet connection, run `offlineDb.forceSync()` manually

### Issue: "Database locked"
**Solution**: Restart app, SQLite transactions will auto-rollback

---

## 📊 **Monitoring**

### Check sync status:
```javascript
const status = await offlineDb.getSyncStatus();
console.log('Pending operations:', status.pendingOperations);
```

### Force sync:
```javascript
await offlineDb.forceSync();
```

### Test notification:
```javascript
await notificationService.testNotification();
```

---

## 🚀 **Next Steps**

1. ✅ Create Supabase project
2. ✅ Run migration
3. ✅ Update credentials
4. ✅ Install dependencies
5. ✅ Configure notifications
6. ✅ Test offline mode
7. ✅ Test notifications
8. 🎉 **Production ready!**

---

## 📝 **Important Notes**

- **Never commit** `src/config/supabase.js` with real credentials to public repos
- Add to `.gitignore`:
  ```
  src/config/supabase.js
  google-services.json
  ```
- For production: Use environment variables
- For teams: Each member creates their own Supabase project for dev

---

## 🎉 **You're All Set!**

Your bar management system now has:
- ✅ Cloud database (Supabase PostgreSQL)
- ✅ Offline-first architecture
- ✅ Real-time notifications
- ✅ Data safety guarantees
- ✅ Auto-sync
- ✅ Push notifications

**Questions?** Check Supabase docs: https://supabase.com/docs
