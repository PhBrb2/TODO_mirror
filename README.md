# TODO

<img width="1024" height="1536" alt="grafik" src="https://github.com/user-attachments/assets/5c151d02-1558-4dec-b9d5-9bdf692fee6e" />

## Web (GitHub Pages)

The app is a static site in `docs/`, deployed to GitHub Pages by `.github/workflows/pages.yml` on every push that touches `docs/`. No build step.

## Android app (Capacitor)

The same `docs/` directory is wrapped as an Android app with [Capacitor](https://capacitorjs.com/). The web app stays the single source of truth; the Android project in `android/` is generated, not committed.

Prerequisites: Node.js, JDK 17, Android Studio (or Android SDK + `ANDROID_HOME`).

```bash
npm ci                  # install Capacitor CLI + plugins
npm run cap:add-android # once: generates android/ (runs prepare + cap add)
npm run cap:sync        # copy docs/ into android assets, set version from docs/game-constants.js
npm run cap:open        # open in Android Studio
```

CI builds a debug APK artifact on pushes to `main` that touch `docs/`, `package.json`, `capacitor.config.json` or `scripts/` (see `.github/workflows/android.yml`; also runnable manually via `workflow_dispatch` on any branch). The Pages site deploys on every push to any branch that touches `docs/`.

Native OS features are wired through `docs/native-bridge.js`, which no-ops on the web: haptics on task completion and a daily local-notification reminder (hour configurable via `REMINDER_HOUR` in `docs/game-constants.js`). Plugin web code is vendored into `docs/vendor/capacitor/` by `scripts/prepare-capacitor.mjs` at sync time (gitignored; only present in the native build). To move progress between the web app and the Android app, use the backup export/import in the app's settings — it works in both environments.

## Install from the web (PWA)

The GitHub Pages site is also installable as a PWA: open it in Chrome on Android and use the menu → "Install app" / "Add to Home screen". `docs/manifest.webmanifest` (icons in `docs/icons/`) plus `docs/sw.js` make it run standalone; the service worker is network-first, caches the app shell (not the 3D models in `docs/models/`) and is versioned with the app `VERSION` via `docs/pwa-register.js`. The service worker is not registered inside the Capacitor Android app.

## Credits

- Room decoration models in `docs/models/sooahs/` (and the shared day-bake atlases in `docs/models/textures/`) were extracted from [sooahs-room-folio](https://github.com/andrewwoan/sooahs-room-folio) (MIT License).
