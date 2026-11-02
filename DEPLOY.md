# Deploying the frontend to Cloudflare Pages

The backend stays on Render (`https://bank-transaction-system-wdkl.onrender.com`) and is not changed.

## How it fits together

```
Browser ──► https://ledger-pay.pages.dev
              ├─ /, /home, /money …  → static files from dist/ (SPA fallback to index.html)
              └─ /api/*              → functions/api/[[path]].js ──► Render backend
```

The backend's CORS only allows `http://localhost:3000`, so the browser can't call Render directly from
`*.pages.dev`. The Pages Function forwards `/api/*` to Render server-side, so every browser request is
same-origin. This is the production equivalent of the Vite dev proxy. It also drops the backend's `token`
cookie, because the app authenticates with the `Authorization: Bearer` header only.

Files involved:

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Pages project name (`ledger-pay`), output dir (`dist`), compatibility date |
| `functions/api/[[path]].js` | The `/api/*` proxy. Reads `BACKEND_URL`, defaulting to the Render URL |
| `package.json` → `deploy`, `pages:preview` | Build and upload, or build and run locally on the Pages runtime |

Leave `VITE_API_URL` **empty** for production builds so the app calls `/api/...` on its own origin.

## 1. Prerequisites

- A Cloudflare account (the free plan is enough).
- Node.js 22.12 or newer (`node -v`).
- Dependencies installed: `npm install` in `frontend-backend-ledger/`.

## 2. Try it locally on the Pages runtime

```bash
npm run pages:preview
```

Open http://localhost:8788. This serves `dist/` and runs the `/api` proxy against the real Render backend.
The first request after Render has been idle can take 20–60 s. The sign-in screen says so while it waits.

## 3a. Deploy from your machine (quickest)

```bash
npx wrangler login     # opens a browser window to authorise Wrangler with your Cloudflare account
npm run deploy         # vite build + wrangler pages deploy
```

On the first deploy Wrangler asks to create the project `ledger-pay` and pick a production branch. Accept
`main`. When it finishes it prints the URL, `https://ledger-pay.pages.dev`. If that name is taken, change
`name` in `wrangler.jsonc` and deploy again.

Run `npm run deploy` from `frontend-backend-ledger/` so Wrangler finds `functions/`. Without that folder the
site loads but every API call returns 404.

## 3b. Or deploy from GitHub (automatic deploys on push)

1. Put `frontend-backend-ledger/` in a Git repository and push it to GitHub. `.gitignore` already excludes
   `node_modules`, `dist` and `.env`.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick the repo.
3. Build settings:
   - Framework preset: **Vite**, or none
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: the folder that contains `package.json`, if the repo has more than this app in it
4. Environment variables (build): `NODE_VERSION` = `22`
5. **Save and Deploy.** Every push to the production branch redeploys, and other branches get preview URLs.

## 4. Settings (optional)

- **Backend URL:** to point at a different backend, go to the Pages project → **Settings** → **Variables and
  Secrets**, add `BACKEND_URL` (for example `https://your-api.onrender.com`, no trailing slash) for Production
  and Preview, then redeploy.
- **Custom domain:** Pages project → **Custom domains** → **Set up a domain**. Nothing in the app needs to
  change, because API calls are relative.

## 5. Check the deployment

1. Open the site and wait for the splash to finish. You should land on Sign in.
2. Create an account. In DevTools → Network, `POST /api/auth/register` should return **201** from your
   `pages.dev` origin. You'll see no CORS errors because the browser never talks to Render directly.
3. Open an account, then reload on `/money`. The page should load, not 404.
4. Send a transfer between two of your own accounts. It takes about 5 s or more because of the backend's
   built-in delay.

New accounts start at ₹0. Only a system user can add funds, through
`POST /api/transaction/system/initial-funds`, so fund a test account that way before trying a transfer.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| First sign-in hangs about 30–60 s | Render's free instance was asleep. Later requests are fast. |
| Every `/api` call returns 404 | `functions/` wasn't deployed. Redeploy from `frontend-backend-ledger/` with `npm run deploy`. |
| `/api` returns 502/503 | Render is down or redeploying. Check `https://bank-transaction-system-wdkl.onrender.com/`. |
| Deep links like `/money` return 404 | A `404.html` ended up in `dist/`, which turns off Pages' SPA fallback. Remove it. |
| Login works locally but not when deployed | `VITE_API_URL` was set at build time. Leave it empty. |
| `wrangler` fails with esbuild/workerd errors after an update | npm blocked their new install scripts. Run `npm approve-scripts esbuild workerd`. |

## Limits worth knowing (free plan)

- Pages: 500 builds a month, unlimited static requests.
- Pages Functions count as Workers requests: 100,000 a day on the free plan. Only `/api/*` calls count.
  The proxy waits on the network and uses almost no CPU, so the 10 ms CPU limit isn't an issue.
