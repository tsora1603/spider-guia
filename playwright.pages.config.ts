import { defineConfig } from '@playwright/test';
import config from './playwright.config';

// Reutiliza o dist/ já aprovado pelos fluxos completos, sem gerar outro build.
export default defineConfig({
  ...config,
  testDir: './tests/hosting',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/pages', open: 'never' }]],
  use: { ...config.use, baseURL: 'http://127.0.0.1:4174/spider-guia/' },
  webServer: {
    command: 'npm run preview -- --base /spider-guia/ --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/spider-guia/',
    reuseExistingServer: false,
    timeout: 30_000
  }
});
