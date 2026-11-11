# TODO

<img width="1024" height="1536" alt="grafik" src="https://github.com/user-attachments/assets/5c151d02-1558-4dec-b9d5-9bdf692fee6e" />

## Web (GitHub Pages)

The app is a static site in `docs/`, deployed to GitHub Pages by `.github/workflows/pages.yml` on every push that touches `docs/`. No build step.

## Android app (Capacitor)

The same `docs/` directory is wrapped as an Android app with [Capacitor](https://capacitorjs.com/). The web app stays the single source of truth; the Android project in `android/` is generated, not committed.

Prerequisites: Node.js 24+, JDK 21, Android Studio 2026.1+ (or Android SDK with platform 37 + `ANDROID_HOME`). Uses Capacitor 9 pre-release (npm dist-tag `next`: AGP 9.4.1 / Gradle 9.8.2 / compileSdk 37), which the AppFunctions integration requires.

```bash
npm ci                  # install Capacitor CLI + plugins
npm run cap:add-android # once: generates android/ (runs prepare + cap add)
npm run cap:sync        # copy docs/ into android assets, set version from docs/game-constants.js
npm run cap:open        # open in Android Studio
```

The APK build is currently on hold (assistant-side AppFunctions support is not available yet): `.github/workflows/android.yml` runs manually only via `workflow_dispatch` on any branch — the push trigger is commented out and can be re-enabled there. The Pages site deploys on every push to any branch that touches `docs/`.

Native OS features are wired through `docs/native-bridge.js`, which no-ops on the web: haptics on task completion and a daily local-notification reminder (hour configurable via `REMINDER_HOUR` in `docs/game-constants.js`). Plugin web code is vendored into `docs/vendor/capacitor/` by `scripts/prepare-capacitor.mjs` at sync time (gitignored; only present in the native build). To move progress between the web app and the Android app, use the backup export/import in the app's settings — it works in both environments.

## AI assistant support (AppFunctions)

The Android app exposes functions to on-device AI assistants (Android 16+, e.g. Gemini) via [AppFunctions](https://developer.android.com/ai/appfunctions). The native side is a local Capacitor plugin in `plugins/todo-assistant/` (generated into `android/` by `cap sync`, uses `androidx.appfunctions:1.0.0-beta01` with KSP 2.3.3 on AGP 9 / compileSdk 37). Functions bridge into the WebView: `window.todoAssistant` in `docs/assistant-bridge.js` calls the regular game functions.

Current test function: `createTestTask` creates a task with fixed settings (title "🧪 Assistant test task", easy, todo list). Verify on a device with:

```bash
adb shell cmd app_function list-app-functions --package dev.phbrb.todo
adb shell "cmd app_function execute-app-function --package dev.phbrb.todo --function 'dev.phbrb.todo.assistant.BaseTodoAppFunctionService#createTestTask' --parameters '{}'"
```

Note: assistant-side (Gemini) access to AppFunctions is in limited preview; the `adb` commands above work regardless.

## Install from the web (PWA)

The GitHub Pages site is also installable as a PWA: open it in Chrome on Android and use the menu → "Install app" / "Add to Home screen". `docs/manifest.webmanifest` (icons in `docs/icons/`) plus `docs/sw.js` make it run standalone; the service worker is network-first, caches the app shell (not the 3D models in `docs/models/`) and is versioned with the app `VERSION` via `docs/pwa-register.js`. The service worker is not registered inside the Capacitor Android app.

## Credits

- Room decoration models in `docs/models/sooahs/` (and the shared day-bake atlases in `docs/models/textures/`) were extracted from [sooahs-room-folio](https://github.com/andrewwoan/sooahs-room-folio) (MIT License).
