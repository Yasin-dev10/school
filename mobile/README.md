# School Registry — Flutter mobile client

Shares the **same Express API + JWT + Socket.IO** backend as the Next.js web app.

- Package ID: `com.schoolregistry.app`
- Production API: `https://school-ta8j.onrender.com/api`
- Release guide: [RELEASE.md](RELEASE.md)

## Run (live data, same as web)

```bash
cd mobile
flutter pub get
flutter run
```

## Release build (APK + Play Store)

```powershell
powershell -ExecutionPolicy Bypass -File mobile/scripts/setup-release.ps1
```

See [RELEASE.md](RELEASE.md) for Play Store / iOS steps.

## Local backend

```bash
flutter run --dart-define=USE_LOCAL_API=true
# Physical device:
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:5000/api
```
