import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serpentineApi } from './server/api.ts';

export default defineConfig({
  plugins: [react(), serpentineApi()],
  server: { port: 5199 },
  // maplibre resolves its module worker relative to its own file; pre-bundling breaks that
  optimizeDeps: { exclude: ['maplibre-gl'] },
});
