import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Service Worker 등록 (PWA) — 개발 서버(HMR)와 충돌하므로 프로덕션 빌드에서만 등록
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ SW registration failed:', error);
      });
  });
} else if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
  // 🍊 개발 서버에서는 이전에(예: 프로덕션 빌드 미리보기 등으로) 같은 origin에 등록됐을 수 있는
  // 서비스워커를 자동 해제 — 안 그러면 오래된 캐시된 JS 번들이 계속 서빙돼서 최신 코드가 반영 안 된 것처럼 보임.
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
  if (window.caches) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
}