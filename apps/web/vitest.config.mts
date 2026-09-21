import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/** Unit tests only, and deliberately so: everything under test here is
 * pure (CLAUDE.md §3 — `lib/calc` never touches React or Prisma), so the
 * suite needs no database, no server and no browser, and it runs in about
 * a second. Component and end-to-end coverage are Storybook's and
 * Playwright's jobs (§2) and are not wired up yet. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
