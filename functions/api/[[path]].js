// Cloudflare Pages → Worker API proxy.
//
// The frontend is served by Cloudflare Pages (static assets) while the full
// API + D1 database live in the Worker (Hono). Pages cannot serve /api/* by
// itself, so this catch-all forwards every /api/* request to the Worker.
//
// Browser ↔ Pages is SAME-origin, so the admin_session cookie (same-origin,
// SameSite=Strict) works end-to-end:
//   browser  ── /api/* + Cookie ──▶  Pages proxy  ── /api/* + Cookie ──▶  Worker
//   browser  ◀── Set-Cookie ◀─────  Pages proxy  ◀── Set-Cookie ◀─────  Worker
// The Worker's Set-Cookie is passed straight back to the browser, which stores
// it host-only for the Pages domain.
//
// Configure the Worker origin via the Pages var WORKER_ORIGIN (no trailing
// slash). Falls back to the fixed live Worker if unset.
const FALLBACK = 'https://exam-system.sanigkram24.workers.dev';

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/') && url.pathname !== '/api') {
    return new Response('Not found', { status: 404 });
  }

  const origin = (context.env.WORKER_ORIGIN || FALLBACK).replace(/\/+$/, '');
  const target = origin + url.pathname + url.search;

  // Forward the browser's Cookie header so the Worker sees the admin session.
  // Drop Host so the outbound fetch uses the Worker origin.
  const headers = new Headers(request.headers);
  headers.delete('host');

  // Forward the request body/method. request.body streams through in Workerd.
  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}
