import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/*
  THE NEW FRONT END, SERVED BESIDE THE CURRENT ONE AT /next/.

  Same origin, same API, same engine packages: the session cookie and the
  remembered identity are shared, so a reader moves between the two without
  signing in twice, and nothing here can compute a number the engine did not.

  `@web/*` reaches into the current app for ONE thing — its typed API client —
  so the wire contract exists once. A second copy here would be a second place
  for a field to be renamed and a figure to go missing without a type error.
*/
export default defineConfig({
  base: '/next/',
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
