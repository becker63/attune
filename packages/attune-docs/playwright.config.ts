import { execFileSync } from "node:child_process";

import { defineConfig } from "@playwright/test";

const systemChromium = (): string | undefined => {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE !== undefined) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  try {
    return execFileSync("which", ["chromium"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
};

const executablePath = systemChromium();

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: "line",
  testDir: "./test",
  testMatch: "e2e.spec.ts",
  timeout: 30_000,
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: executablePath === undefined ? {} : { executablePath },
  },
});
