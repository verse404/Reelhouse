import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Security headers applied to local dev and preview servers.
// TODO(security): For standalone production deployment, enforce a nonce-based
// script-src Content-Security-Policy; Vite dev mode requires inline HMR scripts.
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Content-Security-Policy':
    "frame-ancestors 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com; object-src 'none'; base-uri 'self';",
};

export default defineConfig({
  plugins: [react()],
  server: {
    // Bound strictly to loopback 127.0.0.1
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: false,
    watch: {
      ignored: ['**/server/**'],
    },
    allowedHosts: true,
    headers: securityHeaders,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    headers: securityHeaders,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: false,
      },
    },
  },
});
