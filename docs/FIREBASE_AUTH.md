# Firebase Authentication setup

FITZY-Mobile uses the Firebase JavaScript SDK for Email/Password accounts. The Firebase SDK session is persisted through Expo SecureStore. After sign-in, the app sends a Firebase ID token to the API exchange endpoint. The API verifies that token, creates or links a MongoDB profile by Firebase UID, and returns the existing FITZY JWT used by protected API routes. MongoDB remains the source of truth for `role`; new Firebase users always receive `customer`.

This keeps FITZY-Admin and its existing password login working. Existing MongoDB accounts are linked by verified email. If an existing FITZY email is not yet verified in Firebase, the app sends a verification link and asks the user to sign in again after verification. The role on the MongoDB profile is preserved when the link is made.

## Firebase Console

1. Create or select the Firebase project for FITZY.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. Register a **Web app** in that Firebase project and copy its Firebase configuration. The Firebase Web App ID is different from FITZY's native application ID (`com.fitzy.store`).
4. For an existing FITZY admin account, register in the app with the same email, verify that email using the link sent by Firebase, then sign in. The API links it to the existing MongoDB admin profile and keeps its role. Never set the admin role from the mobile app.

The supplied `google-services.json` is installed at `FITZY-Mobile/google-services.json` and referenced by `android.googleServicesFile` in `app.json`. Its Android package matches `com.fitzy.store`, so native Android builds are associated with project `fitzy-d7805`. The current Email/Password implementation uses Firebase's JavaScript SDK, which does not read this file and can run in Expo Go. It still needs the Firebase Web app config below; the Android file cannot provide the Web app ID. See [Expo's Firebase guide](https://docs.expo.dev/guides/using-firebase/) and [Firebase's ID-token verification guide](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## Mobile environment

Copy `FITZY-Mobile/.env.example` to `FITZY-Mobile/.env`, then fill the six `EXPO_PUBLIC_FIREBASE_*` values from the Firebase Web app configuration. Keep `EXPO_PUBLIC_API_URL` pointed at the reachable FITZY API address. `EXPO_PUBLIC_` values are embedded in the client bundle; Firebase client config is not a service-account secret. Use HTTPS for the API in deployed environments.

Restart Expo after changing the file:

```bash
npm run mobile:clear
```

## API service account

The API verifies ID tokens using `firebase-admin`. The Android `google-services.json` is not a service-account credential. In Firebase Console → **Project settings → Service accounts**, generate a private key and download its JSON file. Keep the file private. The easiest local setup is to save it as `FITZY-API/firebase-service-account.json` (this exact path is ignored by Git), then set in `FITZY-API/.env`:

```dotenv
FIREBASE_PROJECT_ID=fitzy-d7805
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/FITZY-API/firebase-service-account.json
```

Alternatively, instead configure these values in `FITZY-API/.env`:

- `FIREBASE_PROJECT_ID`: the same project ID used by the mobile Firebase configuration.
- `FIREBASE_CLIENT_EMAIL`: service-account client email.
- `FIREBASE_PRIVATE_KEY`: service-account private key; in dotenv, keep the PEM newlines as `\n` (the API converts them at runtime).

Keep service account credentials only in the API's private environment; never put them in the mobile app, admin website, source control, or logs. On a trusted Google Cloud runtime, use Application Default Credentials with `FIREBASE_PROJECT_ID`.

If these API credentials are absent, the API still starts, but `POST /api/auth/firebase/exchange` returns `503 FIREBASE_NOT_CONFIGURED`. Fill the actual values in the ignored `.env` files; the repository intentionally contains no fabricated Firebase credentials.

## Identity behavior

- Firebase UID is unique in MongoDB and used to find an already linked profile.
- New Firebase accounts create a MongoDB customer profile on first successful exchange.
- An existing MongoDB email is linked only when Firebase marks the email verified. Existing `role`, phone, addresses, and password hash are retained.
- Blocked accounts remain blocked. Firebase login does not bypass API account checks.
- `/auth/login` remains for FITZY-Admin's existing JWT session; protected API endpoints continue to validate the FITZY JWT returned by the exchange.
- Passwords and Firebase ID tokens are not added to Redux. Firebase manages its persisted session in SecureStore; only the short-lived FITZY API JWT is stored separately in SecureStore.
