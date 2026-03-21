import { defineConfig } from 'vite' // <--- This line is likely missing!
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
                            base: './',
})
