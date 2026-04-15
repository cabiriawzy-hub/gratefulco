import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves at /<repo>/ — set base so asset paths are correct.
  // Falls back to '/' for local dev (GITHUB_ACTIONS is not set locally).
  base: process.env.GITHUB_ACTIONS ? '/gratefulco/' : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
})
