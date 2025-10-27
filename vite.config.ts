import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      // Proxy solo per lo sviluppo: tutte le richieste a /v1 passano al BE su :3000
      "/v1": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost",
        ws: true,
      },
    },
  },
});
