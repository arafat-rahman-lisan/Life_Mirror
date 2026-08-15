# LifeGlass Android

LifeGlass is the Android wrapper for the LifeGlass self-monitoring dashboard. The existing HTML/CSS/JavaScript application is bundled locally inside the APK and runs offline in Android WebView.

## What works

- Daily dashboard, tasks, activities, goals, journal, reflection and analytics
- Persistent `localStorage` on the phone
- Mobile glassmorphism UI
- Dark/light theme
- JSON backup using Android's native **Save document** picker
- JSON import using Android's native file picker
- Local bundled photography; no internet is needed for the dashboard
- Web links, if added later, open in the phone's normal browser

## Project details

- Package: `com.lifeglass.tracker`
- App name: `LifeGlass`
- Minimum Android: API 26 / Android 8.0
- Compile SDK: API 36
- Target SDK: API 36
- Android Gradle Plugin: 9.3.0
- Gradle: 9.5.0
- No AndroidX or third-party runtime libraries are required.

## Build in Android Studio

1. Open this folder in Android Studio.
2. Let Android Studio install/sync SDK 36 and Gradle dependencies.
3. Select **Build > Build APK(s)**.
4. The debug APK will be under `app/build/outputs/apk/debug/app-debug.apk`.
5. Copy the APK to your Android phone, allow installation from the file manager/browser when Android asks, and install it.

## Build with GitHub Actions

A workflow is included at `.github/workflows/build-apk.yml`.
Push this project to GitHub, open **Actions > Build Android APK > Run workflow**, then download the `LifeGlass-debug-apk` artifact after the build succeeds.

## Data note

LifeGlass data is stored in Android WebView's app data. It normally survives app restarts and app updates, but uninstalling the app or clearing its storage can remove it. Use **Settings > Export JSON** periodically if the data matters to you.
