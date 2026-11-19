import { defineConfig } from "astro/config";
import { normalizeBase } from "./scripts/registry.mjs";

export default defineConfig({
  output: "static",
  base: normalizeBase(process.env.BASE_PATH ?? "/"),
  site: process.env.SITE_URL || undefined,
  trailingSlash: "always",
});
