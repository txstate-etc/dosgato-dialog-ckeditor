import { sveltekit } from '@sveltejs/kit/vite'
import { playwright } from '@vitest/browser-playwright'

// the editor needs a real browser, the installed Chrome saves a playwright browser download
// (a function because vitest mutates it per project)
const browser = () => ({
  enabled: true,
  headless: true,
  provider: playwright({ launchOptions: { channel: 'chrome' } }),
  instances: [{ browser: 'chromium' }],
  screenshotFailures: false
})

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ['@iconify-icons/ph', '@iconify-icons/mdi'] // exclude iconify libraries to preserve HMR
  },
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['test/**/*.test.ts'], exclude: ['test/import.test.ts'], browser: browser() } },
      // npm run import-samples, needs the un-anonymized richexamples.json that stays out of git
      { extends: true, test: { name: 'import', include: ['test/import.test.ts'], browser: browser(), testTimeout: 600000 } }
    ]
  }
}

export default config;
