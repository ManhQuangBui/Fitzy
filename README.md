# FITZY — Fashion Commerce Demo

FITZY is a JavaScript-only monorepo for a fashion store demo: an Expo/React Native customer app, an Express/Mongoose API, and a React/Vite administration site. Sample products and articles created by the seed script are demo content, not a live store catalog.

## Project layout

```text
FITZY-Mobile/   Expo customer app, React Navigation and Redux Toolkit
FITZY-API/      Express REST API, MongoDB/Mongoose, auth and Gemini integration
FITZY-Admin/    Vite + React administration site
docs/           API reference and implementation notes
```

The project uses JavaScript throughout; there are no TypeScript sources.

## Assumptions and demo rules

- Checkout supports COD and manual bank transfer. MoMo, ZaloPay, and VNPay options appear when their API-side merchant keys and callback URLs are configured. Provider payments use signed server requests/callbacks; online transactions must be refunded through the provider before an admin records the refund and permits cancellation.
- Shipping costs 30,000 VND below a 500,000 VND post-discount subtotal and is free at or above that amount.
- Dashboard revenue counts orders marked `completed`. Cancelled, pending, confirmed, preparing, shipping, delivery-failed orders are not recognized as revenue. Completed COD orders are marked paid when the administrator completes them.
- Stock is reserved when a customer places an order and restored if a pending/confirmed/preparing order is cancelled. Order transitions and promotion usage updates use MongoDB transactions. New orders record each status change and its timestamp; legacy orders do not have historical status timestamps.
- Therefore MongoDB must run as a replica set, including for a local demo. A one-node replica set is sufficient.
- Seed admin credentials come from environment variables. The seed script refuses to run without a password of at least 12 characters. Public registration only creates customer accounts.
- Demo product and banner photos reference Unsplash image URLs. Replace them with store-owned or properly licensed images before presenting FITZY as a real shop.
- Admin uploads are saved under `FITZY-API/uploads`. Use persistent object storage/CDN for production deployment.

## Requirements

- Node.js 22.13 or later for the current stable Expo SDK used here; npm.
- MongoDB 7+ configured as a replica set. The API and seed script need a reachable `MONGODB_URI`.
- Expo Go and a phone/simulator, or Android Studio/Xcode for a local simulator.

## Install dependencies

Open three terminals from the repository root:

```sh
cd FITZY-API && npm install
cd ../FITZY-Mobile && npm install
cd ../FITZY-Admin && npm install
```

The mobile dependencies target Expo SDK 57 / React Native 0.86. After installing, run `npx expo install --check` in `FITZY-Mobile`; use `npx expo install <package>` to align any Expo native packages with the installed SDK.

## Start MongoDB as a one-node replica set

Create a database directory and start MongoDB with replica set mode:

```sh
mkdir -p /tmp/fitzy-mongodb
mongod --dbpath /tmp/fitzy-mongodb --replSet rs0 --bind_ip 127.0.0.1
```

In a second terminal, initialize the replica set once:

```sh
mongosh --eval 'rs.initiate()'
```

Wait until `rs.status().myState` is `1` before running API requests. If MongoDB is already installed as a service, configure the same `replSetName: rs0` in its `mongod.conf` and restart it.

## Configure and run the API

```sh
cd FITZY-API
cp .env.example .env
```

Set `JWT_SECRET` to a long random value and enter a unique `SEED_ADMIN_PASSWORD` (at least 12 characters). Keep `.env` private. Set `CLIENT_ORIGINS` to the Admin URL and any development origins, comma-separated. For Gemini, add a server-side `GEMINI_API_KEY`; it is never sent to the mobile or admin bundle. `GEMINI_MODEL` defaults to `gemini-3.8-flash`, listed as a stable Gemini API model in Google's current model guide. The stylist has a database-backed fallback when the key is absent or Gemini fails.

```sh
npm run dev
```

The API listens on `http://localhost:4000`. Check `GET /api/health` for status.

Seed categories, clearly marked demo products, one published demo article, `FITZY10`, and a protected admin account:

```sh
npm run seed
```

The default admin email is `admin@fitzy.local`; the password is exactly the value of `SEED_ADMIN_PASSWORD`. Seed is safe to rerun for its sample records.

For checkout payments, set the provider variables in `FITZY-API/.env` using sandbox credentials first. Bank transfer requires `BANK_TRANSFER_BANK_NAME`, `BANK_TRANSFER_ACCOUNT_NAME`, and `BANK_TRANSFER_ACCOUNT_NUMBER`. MoMo and ZaloPay require their merchant keys plus public HTTPS IPN callback URLs. VNPay requires `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, a return URL, and its IPN URL registered in the VNPay merchant portal. Keep all provider secrets on the API server; never add them to Expo public variables. Production credentials should only replace sandbox credentials after provider onboarding and successful end-to-end verification.

## Run the mobile app

Create `FITZY-Mobile/.env` from `FITZY-Mobile/.env.example`, then set `EXPO_PUBLIC_API_URL` to the API URL reachable from the device. Expo inlines this public URL at build time; never put API keys or JWT secrets in `EXPO_PUBLIC_*` variables.

```sh
npm run mobile
```

To clear Metro's cache and restart, stop the current Expo server and run `npm run mobile:clear` from the repository root. Run Expo from `FITZY-Mobile` rather than `npx expo start` at the repository root so Metro resolves the mobile app entry point correctly.

Common API URLs:

- iOS simulator: `http://localhost:4000/api`
- Android emulator: `http://10.0.2.2:4000/api`
- Physical device: `http://<your-computer-LAN-IP>:4000/api` (phone and computer must share a network; allow the port through the local firewall)

The JWT is stored in Expo SecureStore. AsyncStorage persists the shopping cart. Mobile checkout shows COD, manual bank transfer, and any configured online gateways. Admin can confirm received transfers and record completed refunds.

## Run the Admin site

Set `VITE_API_URL` in `FITZY-Admin/.env` if the API is not at the default local URL. Add the exact Admin origin to `CLIENT_ORIGINS` in the API environment.

```sh
cd FITZY-Admin
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`) and sign in with the seeded admin email/password. The backend rejects customer tokens for all admin endpoints.

## API, tests, and builds

The endpoint overview, ownership rules, and example order request are in [docs/API.md](docs/API.md). Run the automated API tests from `FITZY-API`:

```sh
npm test
```

The API integration tests create an ephemeral one-node replica set through `mongodb-memory-server`; the first run may download a MongoDB binary. The business rules also have Node's built-in test coverage. Admin production build: `cd FITZY-Admin && npm run build`. Expo bundle export: `cd FITZY-Mobile && npx expo export`.

For Postman, import the routes and example payloads in `docs/API.md`, set `baseUrl` to `http://localhost:4000/api`, sign in through `/auth/login`, and use the returned token as a Bearer token. Do not export a real `.env` or password with the collection.

## Manual demo walkthrough

1. Register a customer in the mobile app, or sign in with an existing customer account.
2. Search/filter the demo catalog, open a product, choose an in-stock size/color and add it to the cart.
3. Apply `FITZY10` to an eligible order, enter a shipping address, and place a COD order.
4. In Admin, confirm the order, move it to shipping, then completed; revenue includes it only after completion.
5. Return to the customer app to view the order and submit a review after completion.
6. Try a cancelled/pending order and confirm inventory is restored. Try an admin endpoint with a customer token and confirm it returns 403.
7. Use FITZY Stylist with Gemini configured, then repeat with the key unset to see the database-backed fallback.

## Common problems

- `ECONNREFUSED` from the API: start MongoDB, confirm the replica set is PRIMARY, then check `MONGODB_URI`.
- Transaction/replica-set error on checkout: the database is probably a standalone `mongod`; run it with `--replSet rs0` and initialize `rs.initiate()`.
- Mobile can't connect: `localhost` refers to the phone for physical devices. Use `10.0.2.2` on Android emulator or the computer's LAN IP on a real device.
- CORS error in Admin: include the exact origin (including scheme and port) in API `CLIENT_ORIGINS`, then restart the API.
- Images fail on a device: the stored upload URL uses the host that made the upload request. Replace uploaded image links with a LAN/API hostname reachable from the mobile device.
- Stylist uses fallback recommendations: configure `GEMINI_API_KEY`, verify the selected model is enabled for that key, and restart the API.

## Current limitations

No live merchant credentials, shipping provider, password-reset email service, cloud image storage, or production deployment setup is configured. Payment gateway integration code is present but remains hidden until API-side credentials and callback URLs are set. Admin CRUD is backed by the API; category deletion is rejected when products reference it, used promotions are deactivated, and product deletion hides the product to preserve order history. The API runtime dependency audit is clean. The full Expo build-tool dependency tree has 22 moderate/high npm audit findings; npm's suggested broad fix downgrades Expo to 44.0.6, so it was not applied to this SDK 57 project. See [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) for verification details.
