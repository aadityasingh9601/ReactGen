import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  server: {
    //These headers are here to make our website cross origin isolated, which is a necessary condition for
    //web containers to run in our website.
    //These headers are needed because WebContainer requires SharedArrayBuffer, which, in turn, requires
    // your website to be cross-origin isolated.
    headers: {
      "Cross-Origin-Embedder-Policy": " require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
