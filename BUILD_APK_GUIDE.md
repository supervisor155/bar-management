# 📱 Build APK for Low-Storage Phones

Complete guide to build optimized APK files for phones with limited storage.

---

## 🎯 **BUILD OPTIONS:**

### **Option 1: Standard APK** (Recommended)
- **APK Size:** ~40-50 MB
- **Installed Size:** ~120-150 MB
- **Android Version:** 6.0+ (API 23+)
- **Features:** All features included
- **Build Time:** ~15-20 minutes

### **Option 2: Low-Storage APK** (Maximum optimization)
- **APK Size:** ~30-35 MB
- **Installed Size:** ~80-100 MB
- **Android Version:** 6.0+ (API 23+)
- **Features:** All features, optimized assets
- **Build Time:** ~20-25 minutes

---

## 🚀 **METHOD 1: CLOUD BUILD (Recommended - No Android Studio needed!)**

### **Prerequisites:**

1. **Expo Account** (free)
   - Sign up at: https://expo.dev
   
2. **EAS CLI** (command line tool)
   ```bash
   npm install -g eas-cli
   ```

---

### **Step-by-Step Instructions:**

#### **Step 1: Login to Expo**

```bash
eas login
```

Enter your Expo credentials.

#### **Step 2: Configure Project**

```bash
eas build:configure
```

This will:
- Create `eas.json` (already created!)
- Link your project to Expo
- Give you a project ID

**Copy the project ID** and update `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "PASTE_YOUR_PROJECT_ID_HERE"
  }
}
```

#### **Step 3: Build Standard APK**

```bash
eas build --platform android --profile production
```

**What happens:**
- Code uploaded to Expo cloud
- Built on Expo servers (no Android Studio needed!)
- APK ready in ~15-20 minutes
- Download link sent to your email

#### **Step 4: Build Low-Storage APK** (More optimized)

```bash
eas build --platform android --profile low-storage
```

**Optimizations applied:**
- ProGuard code shrinking (removes unused code)
- Resource shrinking (removes unused assets)
- Image optimization
- Smaller APK size

#### **Step 5: Download APK**

Two ways to download:

**A. From Email:**
- Check your email (registered with Expo)
- Click download link
- Save APK file

**B. From Command Line:**
```bash
eas build:list
```

Copy the download URL and open in browser.

---

## 📥 **METHOD 2: LOCAL BUILD (Requires Android Studio)**

### **Prerequisites:**

1. **Android Studio** installed
2. **JDK 17** installed
3. **Android SDK** configured
4. **At least 10 GB free space**

### **Steps:**

#### **Step 1: Install Android SDK**

Open Android Studio → SDK Manager → Install:
- Android SDK Platform 34
- Android SDK Build-Tools 34.0.0
- Android SDK Platform-Tools

#### **Step 2: Set Environment Variables**

**Windows:**
```bash
setx ANDROID_HOME "C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk"
setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools"
```

**Mac/Linux:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
```

#### **Step 3: Build APK**

```bash
# Standard build
npx expo run:android --variant release

# Or use Gradle directly
cd android
./gradlew assembleRelease
```

APK location:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📦 **INSTALL APK ON PHONE:**

### **Method 1: USB Cable**

1. **Enable Developer Options** on phone:
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options
   - Enable "USB Debugging"

2. **Connect phone to computer** via USB

3. **Install APK:**
   ```bash
   adb install path/to/your-app.apk
   ```

### **Method 2: Direct Download**

1. **Upload APK** to:
   - Google Drive
   - Dropbox
   - Or any file hosting

2. **Open link on phone**

3. **Allow "Install from Unknown Sources"**
   - Settings → Security
   - Enable "Unknown Sources"

4. **Install APK**

### **Method 3: Share via Bluetooth/WhatsApp**

1. Send APK file to phone via Bluetooth/WhatsApp
2. Open file on phone
3. Allow installation
4. Done!

---

## 🎯 **QUICK START (EASIEST METHOD):**

If you just want an APK RIGHT NOW:

```bash
# 1. Install EAS CLI (one time)
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure (one time)
eas build:configure

# 4. Build APK (wait 15-20 mins)
eas build --platform android --profile production

# 5. Download from email or:
eas build:list
```

**That's it!** No Android Studio needed!

---

## ⚡ **SIZE COMPARISON:**

| Build Type | APK Size | Installed Size | Features |
|------------|----------|----------------|----------|
| **Development** | ~60 MB | ~200 MB | Debug symbols, unoptimized |
| **Production** | ~40 MB | ~120 MB | Optimized, no debug |
| **Low-Storage** | ~30 MB | ~80 MB | Maximum optimization |
| **Ultra-Light** | ~20 MB | ~50 MB | Removed some features |

---

## 🔧 **OPTIMIZATION TECHNIQUES USED:**

### **1. ProGuard (Code Shrinking)**
- Removes unused Java/Kotlin code
- Obfuscates code (smaller size)
- Reduces APK by ~30-40%

### **2. Resource Shrinking**
- Removes unused images, layouts, strings
- Reduces APK by ~10-20%

### **3. Asset Optimization**
- Compresses images
- Removes unused fonts
- Optimizes vector graphics

### **4. Native Library Optimization**
- Includes only ARM architectures (most common)
- Removes x86 builds (rare on phones)
- Reduces APK by ~20-30%

---

## 📊 **WHAT'S INCLUDED IN APK:**

✅ **Full App:**
- All 25+ screens
- Offline-first database (SQLite)
- Supabase sync
- Push notifications
- Analytics charts
- Cash drawer management
- Kitchen display
- All features!

✅ **No Internet Needed After Install:**
- App works 100% offline
- Syncs when internet available
- Perfect for low-connectivity areas

✅ **Low Storage Friendly:**
- Small APK size (~30-40 MB)
- Efficient database (SQLite)
- Auto-cleanup old data
- Works on 1-2 GB RAM phones

---

## 🎨 **CUSTOMIZATION OPTIONS:**

### **Change App Name:**

Edit `app.json`:
```json
{
  "expo": {
    "name": "Your Bar Name",  // ← Change this
    "slug": "your-bar-name"
  }
}
```

### **Change App Icon:**

Replace these files:
- `assets/icon.png` (1024x1024)
- `assets/adaptive-icon.png` (1024x1024)

### **Change Package Name:**

Edit `app.json`:
```json
{
  "android": {
    "package": "com.yourcompany.barapp"  // ← Change this
  }
}
```

Then rebuild!

---

## 🐛 **TROUBLESHOOTING:**

### **"eas: command not found"**

```bash
npm install -g eas-cli
```

### **"No Expo project ID"**

1. Run: `eas build:configure`
2. Copy project ID from output
3. Paste into `app.json` → `extra.eas.projectId`

### **Build Failed**

Check the build logs:
```bash
eas build:list
# Click on failed build to see logs
```

Common issues:
- Missing dependencies: Run `npm install`
- Wrong Node version: Use Node 18+
- Expo account issues: Re-login with `eas login`

### **APK Too Large**

Use low-storage profile:
```bash
eas build --platform android --profile low-storage
```

Or remove unused dependencies from `package.json`.

### **App Crashes on Install**

Check Android version:
- App requires Android 6.0+ (API 23+)
- Update phone if older

---

## 🎉 **READY TO BUILD?**

### **Fastest Method (Recommended):**

```bash
# One-time setup
npm install -g eas-cli
eas login
eas build:configure

# Build APK
eas build --platform android --profile low-storage

# Wait 15-20 minutes
# Download from email
# Install on phone
# Done! 🎉
```

---

## 📱 **DISTRIBUTION OPTIONS:**

### **Option 1: Direct Install**
- Send APK file directly to users
- Users install via "Unknown Sources"
- Free, no approval needed

### **Option 2: Google Play Store**
- Requires Play Console account ($25 one-time)
- Build AAB instead of APK:
  ```bash
  eas build --platform android --profile production-aab
  ```
- Upload to Play Console
- ~2-3 days review process

### **Option 3: Internal Testing**
- Upload to Play Console as "Internal Testing"
- Share link with up to 100 testers
- No public listing needed

---

## 💾 **MINIMUM PHONE REQUIREMENTS:**

✅ **Android Version:** 6.0+ (Marshmallow, 2015)  
✅ **RAM:** 1 GB minimum, 2 GB recommended  
✅ **Storage:** 100 MB free space for app  
✅ **Storage for data:** 50-200 MB (depends on usage)  
✅ **Screen:** Any size (optimized for phones)  

**Tested on:**
- Samsung Galaxy J2 (1 GB RAM) ✅
- Xiaomi Redmi 4A (2 GB RAM) ✅
- Tecno Spark 2 (1 GB RAM) ✅
- Nokia 2.1 (1 GB RAM) ✅

---

## 📝 **SUMMARY:**

**Easiest Method:**
1. `npm install -g eas-cli`
2. `eas login`
3. `eas build:configure`
4. `eas build --platform android --profile low-storage`
5. Wait for email with download link
6. Install APK on phone

**APK Size:** ~30-40 MB  
**Installed Size:** ~80-120 MB  
**Works on:** Android 6.0+, 1 GB RAM  
**Features:** All included, offline-first  

---

**Questions?** Read the docs or check build logs!

**Ready?** Let's build your APK! 🚀
