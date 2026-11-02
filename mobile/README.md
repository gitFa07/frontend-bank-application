# Ledger Pay (Android, Expo)

Native React Native version of the web frontend in `../src`, built with Expo SDK 58 and Expo Router.
It talks directly to the backend on Render (`https://bank-transaction-system-wdkl.onrender.com`).
CORS doesn't apply to native apps, so no proxy is needed. To point it somewhere else, set
`EXPO_PUBLIC_API_URL` in `mobile/.env`.

| Web | Mobile |
|---|---|
| Tailwind | `StyleSheet` + the same Material 3 tokens (`src/constants/theme.ts`) |
| GSAP | Reanimated (entrances, success badge, processing, scanner line) |
| three.js on a DOM canvas | three.js on `expo-gl`, with the ₹ extruded as 3D geometry |
| `localStorage` token | `expo-secure-store` (Android Keystore) |
| BarcodeDetector | `expo-camera` |
| Material Symbols font | `expo-symbols` (Material Symbols on Android) |
| Bottom nav | `NativeTabs` (native Material 3 navigation bar) |

## Try it in Expo Go

1. Install **Expo Go** from the Play Store. It must support SDK 58; the version is shown in Expo Go → Settings.
2. Put your phone and PC on the **same Wi-Fi**.
3. In this folder:
   ```bash
   npm install
   npx expo start
   ```
4. In Expo Go, tap **Scan QR code** and scan the QR code in the terminal.

If the phone can't connect (different networks, or Windows Firewall blocking Node), run
`npx expo start --tunnel` instead. Also allow Node.js on private networks if Windows asks.

The first sign-in can take 30–60 s while Render's free instance wakes up.

## Build an installable APK

Uses EAS Build in the cloud and needs a free Expo account:

```bash
npx eas-cli@latest login
npx eas-cli@latest init                              # links the project and adds its ID to app.json
npx eas-cli@latest build -p android --profile preview
```

`eas.json` is already set up. The `preview` profile builds an installable **APK**, and `production` builds an
AAB for the Play Store. On the first build, let EAS generate an Android keystore and keep it on Expo's servers;
every later update has to be signed with the same key. When the build finishes, EAS prints a link and a QR code to
download the APK.

Before publishing, change `android.package` in `app.json` (currently `com.ledgerpay.mobile`) to an ID you own,
and replace the template icons in `assets/images/`.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

## Structure

```
src/
  app/          routes: auth, (tabs)/index|money|you, pay, qr, scan, activity/[key]
  components/   ui primitives, BottomSheet, Toast, CoinScene (expo-gl + three), ResultBadge
  context/      theme, auth (SecureStore session), ledger (accounts, balances, local history)
  lib/          api client, formatting, local payment history, storage
```
