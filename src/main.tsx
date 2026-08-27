import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {installGlobalErrorHandlers, ErrorOverlay, GlobalErrorBoundary} from './components/ErrorOverlay';
import {UpdateBanner} from './components/UpdateBanner';
import './index.css';

// Capture uncaught errors and promise rejections before anything else runs
installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
      <UpdateBanner />
      {/* On-screen crash overlay for debugging in production / Android WebView */}
      <ErrorOverlay />
    </GlobalErrorBoundary>
  </StrictMode>,
);

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed silently
    });
  });
}
