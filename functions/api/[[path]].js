// Cloudflare Pages Function: forwards /api/* to the backend on Render.
//
// The backend's CORS only allows http://localhost:3000, so the browser can't
// call it from *.pages.dev directly. Proxying keeps every request same-origin,
// like the Vite dev proxy does locally, and the backend needs no changes.

const DEFAULT_BACKEND = "https://bank-transaction-system-wdkl.onrender.com";

export async function onRequest({ request, env }) {
  const backend = (env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "");
  const url = new URL(request.url);
  const target = backend + url.pathname + url.search;

  const headers = new Headers(request.headers);
  // The app authenticates with the Bearer header only. A cookie from the
  // backend would win over the header there, so never forward one.
  headers.delete("cookie");

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  });

  const response = new Response(upstream.body, upstream);
  // Drop the backend's cookie so the browser doesn't store a readable JWT.
  response.headers.delete("set-cookie");
  return response;
}
