import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      "/login": "http://localhost:3000",
      "/register": "http://localhost:3000",
      "/refresh": "http://localhost:3000",
      "/logout": "http://localhost:3000",
      "/check-admin": "http://localhost:3000",
      "/files": "http://localhost:3000",
      "/upload": "http://localhost:3000",
      "/delete": "http://localhost:3000",
      "/contact": "http://localhost:3000",
      "/uploads": "http://localhost:3000"
    }
  }
});
