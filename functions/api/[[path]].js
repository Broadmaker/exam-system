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

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('x-forwarded-host');
  headers.delete('x-real-ip');

  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    try { body = await request.arrayBuffer(); } catch { body = undefined; }
    if (body && body.byteLength === 0) body = undefined;
  }

  try {
    const res = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    });
    // Preserve Set-Cookie (may be multiple) — Pages needs explicit forwarding via getSetCookie
    const outHeaders = new Headers(res.headers);
    // If multiple Set-Cookie, ensure they are preserved (getSetCookie where available)
    try {
      const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      if (cookies.length > 1) {
        outHeaders.delete('set-cookie');
        for (const c of cookies) outHeaders.append('set-cookie', c);
      }
    } catch {}
    return new Response(res.body, { status: res.status, headers: outHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Worker unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
}
