import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/*
  THE SITE, AT THE ROOT.

  It was built at /next/ beside the previous front end and became the site on
  14 Oct 2026. The previous one still serves the paths only it has (/app,
  /work, sign-up, settings…) from the same origin: same API, same session
  cookie and remembered identity, so a reader moves between the two without
  signing in twice, and nothing here can compute a number the engine did not.

  `@web/*` reaches into the current app for ONE thing — its typed API client —
  so the wire contract exists once. A second copy here would be a second place
  for a field to be renamed and a figure to go missing without a type error.
*/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@web': fileURLToPath(new URL('../web/src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
