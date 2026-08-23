# Push notifications setup

1. Create a Firebase project and enable Cloud Messaging.
2. Create a Firebase service account and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` on the backend. Keep the private key out of source control.
3. In Firebase, register Android app `com.schoolregistry.app`; place the downloaded `google-services.json` in `mobile/android/app/` and configure the Google Services Gradle plugin.
4. Register the iOS bundle ID; place `GoogleService-Info.plist` in `mobile/ios/Runner/`, enable Push Notifications and Background Modes in Xcode, and upload an APNs key to Firebase.
5. Apply the Prisma migration and restart the backend. The retry worker runs every 60 seconds by default.

Client token endpoints:

- `POST /api/notifications/devices/register`
- `POST /api/notifications/devices/unregister`
- `GET|PUT /api/notifications/preferences`
- `GET /api/notifications/:id/deliveries` (admin)
- `POST /api/notifications/deliveries/retry` (admin)
