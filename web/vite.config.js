import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

// In the sandbox the preview is served through a proxy whose Host header
// is a rotating sandbox hostname. Vite validates the Host header, so allow that
// domain (and any subdomain) only while running in preview mode.
const allowedHosts = [];
if (process.env.PREVIEW_MODE === '1' && process.env.SANDBOX_HOST_DOMAIN) {
  allowedHosts.push(`.${process.env.SANDBOX_HOST_DOMAIN}`);
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/hook': { target: apiTarget, changeOrigin: true },
    },
    watch: { usePolling: true, interval: 300 },
  },
});
