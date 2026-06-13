import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  esbuild: {
    // 🚀 프로덕션 빌드에서만 console.*/debugger 제거 (개발 중에는 유지)
    drop: command === 'build' ? ['console', 'debugger'] : [],
  },
}))
