// The user guide's capture server (`scripts/guide/capture.mjs`): the site from source
// on 5190, proxied to an API on 4100 started with DEVELOPER_STANDARDS=off. A separate
// port from `pnpm dev`, so the pictures are never of a developer's brief the dev API
// has switched on.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:4100', changeOrigin: true } },
  },
});
