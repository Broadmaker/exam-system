import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  if (mode === 'production') {
    // Same-origin /api is REQUIRED: an absolute VITE_API_URL breaks the
    // SameSite=Strict admin_session cookie -> 401s on all admin routes. The
    // absolute URL can come from a stale .env.production in the build cache OR
    // from a VITE_API_URL env var set in the Cloudflare dashboard — both survive
    // cache clears and process.env precedence. Force relative /api so every
    // production build is correct regardless of the build environment.
    process.env.VITE_API_URL = '';
  }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            icons: ['lucide-react'],
            qr: ['qrcode'],
          },
        },
      },
    },
  };
});
