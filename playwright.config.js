import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  timeout: 20000,
  use: { headless: true, viewport: { width: 1440, height: 1000 } },
  reporter: 'list'
});
