import { defineConfig } from "@playwright/test";
import { normalizeBase } from "./scripts/registry.mjs";

const base = normalizeBase(process.env.BASE_PATH ?? "/");
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: `http://127.0.0.1:4329${base}` },
  webServer: {
    command: "npm run preview -- --port 4329",
    url: `http://127.0.0.1:4329${base}`,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
