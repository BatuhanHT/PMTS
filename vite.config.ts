import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' keeps asset URLs relative, so the build also opens from file:// (desktop wrapper)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
