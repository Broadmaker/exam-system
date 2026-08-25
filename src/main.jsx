import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// Dismiss PWA splash (#pwa-splash in index.html) as soon as React has mounted
// — window.__hideSplash() is defined inline in index.html for instant paint before bundle loads.
requestAnimationFrame(() => {
  setTimeout(() => {
    try { window.__hideSplash?.(); } catch {}
  }, 400);
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
