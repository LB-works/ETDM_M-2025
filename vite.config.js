import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ETDM_M-2025/', // Change to '/<REPO_NAME>/' for GitHub Pages project sites
})

