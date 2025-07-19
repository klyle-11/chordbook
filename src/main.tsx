import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { errorMonitor } from './services/ErrorMonitoring'

// Global error handlers - non-blocking, just for monitoring
window.addEventListener('error', (event) => {
  console.warn('Global error caught:', event.error);
  errorMonitor.logComponentError('Global', event.error);
  // Don't prevent default - let errors bubble up normally
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  errorMonitor.logComponentError('UnhandledPromise', new Error(event.reason));
  // Don't prevent default - let rejections bubble up normally
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
