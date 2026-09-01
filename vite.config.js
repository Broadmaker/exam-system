import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const forceRelativeApi = mode === 'production';
  if (forceRelativeApi) {
    // Same-origin /api is REQUIRED: absolute VITE_API_URL breaks SameSite=Strict
    // admin_session cookie. Override via Vite define (no global process.env mutation) so
    // parallel builds don't leak env. Allow escape hatch VITE_API_URL_OVERRIDE if ever needed.
    if (!process.env.VITE_API_URL_OVERRIDE) process.env.VITE_API_URL = '';
  }
  return {
    define: forceRelativeApi && !process.env.VITE_API_URL_OVERRIDE ? { 'import.meta.env.VITE_API_URL': '""' } : {},
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
