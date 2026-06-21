import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes the built files work even inside a Hostinger subfolder.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
});
