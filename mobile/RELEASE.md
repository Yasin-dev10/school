# School Registry — Mobile release

Package ID: `com.schoolregistry.app`  
Live API: `https://school-ta8j.onrender.com/api` (same as web)

## One-time setup (Windows)

1. Install [Flutter](https://docs.flutter.dev/get-started/install/windows) and Android Studio.
2. From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File mobile/scripts/setup-release.ps1
```

That script will:
- create `android/app/upload-keystore.jks` (signing key)
- keep secrets in `android/key.properties` (gitignored)
- build **APK** + **Play Store AAB**

**Backup** `upload-keystore.jks` + `key.properties` somewhere safe. If you lose them you cannot update the Play Store app.

## Build again later

```bash
cd mobile
flutter build apk --release
flutter build appbundle --release
```

Outputs:
- `build/app/outputs/flutter-apk/app-release.apk` — share / sideload
- `build/app/outputs/bundle/release/app-release.aab` — upload to Google Play

## Google Play

1. Open [Play Console](https://play.google.com/console) → Create app
2. Application ID must stay: `com.schoolregistry.app`
3. Upload the `.aab`
4. Complete store listing, content rating, privacy policy
5. Roll out to Production (or Internal testing first)

## Version bump (each new upload)

In `pubspec.yaml`:

```yaml
version: 1.0.1+2   # name+code — code must always increase
```

## iOS (Mac only)

1. Open `ios/Runner.xcworkspace` in Xcode
2. Signing & Capabilities → your Apple Team
3. Bundle ID: `com.schoolregistry.app`
4. `flutter build ipa --release`

## Local API testing (not for store builds)

```bash
flutter run --dart-define=USE_LOCAL_API=true
```

Release builds always use the production API by default.
