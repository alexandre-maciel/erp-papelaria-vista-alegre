import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5179",
    browserName: "chromium",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run dev -- --port 5179 --strictPort`,
    url: "http://127.0.0.1:5179",
    reuseExistingServer: !process.env.CI,
  },
});
