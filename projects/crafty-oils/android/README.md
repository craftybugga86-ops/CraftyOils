# Crafty Oils — Android

A minimal native wrapper around the Crafty Oils web game: a single
`WebView` (see `MainActivity.java`) loading the game straight out of the
app's own assets (`app/src/main/assets/`, a copy of the repo's `index.html`,
`dig-grid.html`, `css/`, and `js/`). No network permission is requested —
everything, including the Collection/turn-history database, runs and
persists entirely on-device via the WebView's local storage.

## Keeping the assets in sync

The web game itself is the source of truth. After changing anything in the
project root (`index.html`, `dig-grid.html`, `css/`, `js/`), copy the updated
files into `app/src/main/assets/` before rebuilding:

```sh
cp ../index.html ../dig-grid.html app/src/main/assets/
cp -r ../css ../js app/src/main/assets/
```

## Building the APK

Building requires the Android SDK (specifically `dl.google.com`, which
isn't reachable from every environment). The included GitHub Actions
workflow (`.github/workflows/build-android-apk.yml`) builds a debug APK on
every push that touches `projects/crafty-oils/android/**`, or on demand via the Actions tab's
"Run workflow" button, and uploads it as a downloadable build artifact
named `crafty-oils-debug-apk`.

To build locally instead, with the Android SDK installed and
`ANDROID_HOME` set:

```sh
./gradlew assembleDebug
```

The output APK lands at `app/build/outputs/apk/debug/app-debug.apk`. It's
unsigned (debug-signed with Android's default debug key), so it installs
fine for testing (`adb install app-debug.apk`, or sideloading with "install
from unknown sources" enabled) but isn't suitable for a Play Store release
as-is — that needs a proper release signing key and an `assembleRelease`
build.
