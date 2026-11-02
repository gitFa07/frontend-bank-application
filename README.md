# Ledger Pay (frontend)

Mobile-first React UI for `../backend-ledger`, styled after the Google Pay UI kit.
Built with React 19, Vite, Tailwind CSS 4, GSAP and three.js.

## Run

```bash
# 1. backend (port 3000)
cd ../backend-ledger && npm run dev

# 2. frontend (port 5173)
npm install
npm run dev
```

Open http://localhost:5173. The dev server also listens on your LAN, so you can open it on a phone.
On a phone over plain `http`, the camera scanner and clipboard paste are unavailable (they need https); pasting/typing an account ID still works.

Vite proxies `/api` to the backend, because the backend's CORS only allows `http://localhost:3000`.
To develop against the deployed API, set `VITE_PROXY_TARGET` in `.env` (see `.env.example`).

## Deploy and Android

- Cloudflare Pages deployment: see [DEPLOY.md](DEPLOY.md).
- Android app (Expo, React Native): see [mobile/README.md](mobile/README.md).

## Structure

```
src/
  lib/        api client, formatting, local payment history, GSAP helpers, theme
  context/    AuthContext (session), LedgerContext (accounts, balances, history)
  components/ UI primitives, bottom sheet, nav, toasts, three.js coin scene
  pages/      Auth, Home, Money, You, Pay (recipient → amount → processing → result),
              MyQR, Scan, Receipt
```

## Things the backend doesn't do (yet)

- **No transaction history endpoint.** Payments sent from this browser are kept in `localStorage`; money received isn't shown.
- **No user lookup.** You pay someone by their 24-character account ID (paste it, or scan their QR).
- **No way to add money** except the system-user initial-funds route. New accounts start at ₹0.
