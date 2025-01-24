import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import mkcert from "vite-plugin-mkcert";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), mkcert()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    open: true,
    // https: true,
    proxy: {
      "/graphql": {
        target: "http://localhost:3000/graphql",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/graphql/, ""),
      },
    },
  },
});
