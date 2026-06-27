#!/bin/bash

# Bar Management System - Supabase Setup Script
# This script installs all required dependencies for offline-first + notifications

echo "🚀 Installing Supabase dependencies..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run this script from the bar-management directory."
  exit 1
fi

echo "📦 Installing packages..."
echo ""

# Install Supabase client
echo "1/5 Installing @supabase/supabase-js..."
npm install @supabase/supabase-js@^2.48.1

# Install network detection
echo "2/5 Installing @react-native-community/netinfo..."
npm install @react-native-community/netinfo@^11.5.3

# Install Expo Notifications
echo "3/5 Installing expo-notifications..."
npm install expo-notifications@~0.31.0

# Install Expo Device
echo "4/5 Installing expo-device..."
npm install expo-device@~7.0.2

# Install Expo Constants
echo "5/5 Installing expo-constants..."
npm install expo-constants@~56.0.5

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Create Supabase project at https://supabase.com"
echo "2. Run SQL migration from: supabase/migrations/001_initial_schema.sql"
echo "3. Update credentials in: src/config/supabase.js"
echo "4. Configure push notifications:"
echo "   - Run: npm install -g eas-cli"
echo "   - Run: eas login"
echo "   - Run: eas build:configure"
echo "5. Start the app: npm start"
echo ""
echo "📖 Full guide: Read SUPABASE_SETUP.md"
echo ""
echo "🎉 Happy coding!"
