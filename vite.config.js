import { sveltekit } from '@sveltejs/kit/vite'

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ['@iconify-icons/ph', '@iconify-icons/mdi'] // exclude iconify libraries to preserve HMR
  }
}

export default config;
