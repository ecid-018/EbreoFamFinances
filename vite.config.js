import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// Vercel sets process.env.VERCEL during its builds; GitHub Pages' project-page
// subpath needs the base prefix, Vercel serves from the domain root.
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/EbreoFamFinances/',
  plugins: [react()],
})
