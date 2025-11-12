import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Config dedicata per il widget pubblico, su porta 5174
// Manteniamo il root del progetto per poter importare da /src.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    open: '/widget/',
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        ws: true,
      },
    },
  },
});
