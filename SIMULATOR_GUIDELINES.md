# 📱 Ionic Simulator Guide

This guide helps you build and run your Ionic app on Android and iOS simulators using Capacitor.

---

## ⚙️ Prerequisites

- Node.js and NPM installed
- Ionic CLI installed (`npm install -g @ionic/cli`)
- Capacitor installed (`npm install @capacitor/core @capacitor/cli`)
- Platform SDKs:
  - Android Studio for Android
  - Xcode for iOS (macOS only)

---

## 🟢 For Android Emulator

### 1. Build the App

    ionic build --platform=android

### 2. Copy and Sync Capacitor Files

    npx cap copy android && npx cap sync android

### 3. Open Android Project in Android Studio

    npx cap open android

> 💡 In Android Studio, select an emulator and click **Run** ▶️ to launch the app.

---

## 🍏 For iOS Simulator

> ⚠️ Only available on **macOS** with **Xcode** installed.

### 1. Build the App

    ionic build --platform=ios

### 2. Sync and Copy Capacitor Files for iOS

    npx cap sync ios && npx cap copy ios

### 3. Open iOS Project in Xcode

    npx cap open ios

> 💡 In Xcode, choose a simulator (e.g., iPhone 14) and click **Run** ▶️ to launch the app.

---

## ✅ Notes

- Always run `ionic build` before syncing or copying to make sure the latest changes are reflected.
- `npx cap copy` copies your `www` output to the native project.
- `npx cap sync` updates native dependencies and plugin configuration.
