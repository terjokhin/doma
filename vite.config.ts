import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative base: the build can be served from any path (its own container, HA's /local/, …).
  base: "./",
  // Listen on the LAN too, so a tablet can open the dev server.
  server: { host: true, port: 5173 },
});
