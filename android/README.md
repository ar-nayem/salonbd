# Android wrapper (Trusted Web Activity)

The Play Store app is a thin shell around https://salon.arnayem.top. There is no separate app
code: the same deploy serves the website and the app.

Build:

```bash
cd android
export BUBBLEWRAP_KEYSTORE_PASSWORD='<store password>'   # ~/Desktop/salonbd-android/SIGNING-README.txt
export BUBBLEWRAP_KEY_PASSWORD="$BUBBLEWRAP_KEYSTORE_PASSWORD"
npx @bubblewrap/cli update --skipVersionUpgrade
npx @bubblewrap/cli build --skipPwaValidation
```

Outputs `app-release-bundle.aab` (upload this to Play) and `app-release-signed.apk` (for testing
on a device or emulator).

Releasing a new version: raise `appVersionCode` and `appVersionName` in `twa-manifest.json`, then
build again. Play rejects a bundle whose version code is not higher than the last one.

Signing key lives outside this repo at `~/Desktop/salonbd-android/`. Only `twa-manifest.json` and
this file are tracked; generated Gradle output is ignored.
