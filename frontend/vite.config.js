import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // VITE_BASE_URL is set in CI to /<repo-name>/ for GitHub Pages.
  // Locally it defaults to / so dev works without any extra config.
  base: process.env.VITE_BASE_URL || '/',
  server: {
    port: 5173,
  },
})
