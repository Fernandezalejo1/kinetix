import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {installGlobalErrorHandlers, ErrorOverlay, GlobalErrorBoundary} from './components/ErrorOverlay';
import {UpdateBanner} from './components/UpdateBanner';
import {ToastProvider} from './context/ToastContext';
import './index.css';

// Capture uncaught errors and promise rejections before anything else runs
installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <ToastProvider>
        <App />
        <UpdateBanner />
        <ErrorOverlay />
      </ToastProvider>
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
