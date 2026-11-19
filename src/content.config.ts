import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { pluginSchema } from "../scripts/registry.mjs";

export const collections = {
  plugins: defineCollection({
    loader: glob({ pattern: "*.yaml", base: "./registry/plugins" }),
    schema: pluginSchema,
  }),
};
