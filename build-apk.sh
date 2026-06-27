#!/bin/bash

# Bar Management System - APK Build Script
# This script guides you through building an optimized APK

echo "📱 Bar Management System - APK Builder"
echo "======================================"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "⚠️  EAS CLI not found. Installing..."
    npm install -g eas-cli
    echo "✅ EAS CLI installed!"
    echo ""
fi

# Check if logged in
echo "🔐 Checking Expo login..."
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to Expo."
    echo "Please login with your Expo account:"
    eas login
    echo ""
fi

# Show current user
EXPO_USER=$(eas whoami)
echo "✅ Logged in as: $EXPO_USER"
echo ""

# Check if project is configured
if [ ! -f "eas.json" ]; then
    echo "⚠️  Project not configured. Running configuration..."
    eas build:configure
    echo ""
    echo "⚠️  IMPORTANT: Copy the project ID and update app.json!"
    echo "   Edit app.json → extra.eas.projectId"
    echo ""
    read -p "Press Enter after updating app.json..."
fi

# Select build type
echo "📦 Select Build Type:"
echo ""
echo "1. Standard APK (~40 MB, all features)"
echo "2. Low-Storage APK (~30 MB, optimized for small phones)"
echo "3. Production AAB (for Google Play Store)"
echo "4. Check build status"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🏗️  Building Standard APK..."
        echo "This will take ~15-20 minutes."
        echo ""
        eas build --platform android --profile production
        ;;
    2)
        echo ""
        echo "🏗️  Building Low-Storage APK..."
        echo "This will take ~20-25 minutes."
        echo ""
        eas build --platform android --profile low-storage
        ;;
    3)
        echo ""
        echo "🏗️  Building Production AAB..."
        echo "This will take ~15-20 minutes."
        echo ""
        eas build --platform android --profile production-aab
        ;;
    4)
        echo ""
        echo "📊 Recent Builds:"
        eas build:list --platform android --limit 5
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Build started! You will receive an email when it's ready."
echo ""
echo "📋 To check build status:"
echo "   eas build:list"
echo ""
echo "📥 To download APK:"
echo "   - Check your email"
echo "   - Or run: eas build:list (and copy download URL)"
echo ""
echo "🎉 Done!"
