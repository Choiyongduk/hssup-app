import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // 🚀 프로덕션 빌드에서 console.*/debugger 제거 (개발 중에는 그대로).
        //    Vite 8부터 예전 esbuild.drop 옵션은 무시돼서, 번들러(rolldown) 압축 옵션으로 옮겼다.
        minify: { compress: { dropConsole: true, dropDebugger: true } },
        // 라이브러리(react, supabase, 아이콘)는 따로 묶는다.
        // 앱을 새로 올려도 이 파일은 그대로라, 쓰던 사람은 바뀐 앱 코드만 다시 받는다.
        codeSplitting: { groups: [{ name: 'vendor', test: /node_modules/ }] },
      },
    },
  },
})
