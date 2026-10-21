import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

// Register PWA service worker (offline capability and mobile app install support).
// Production only. In development the worker serves the previous build's
// hashed asset filenames, which no longer exist, so the shell loads and the
// app renders nothing. Any worker left over from a production build on the
// same origin is removed on the next dev load.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.info('PWA SW note:', err);
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations?.()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    caches?.keys?.().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
}

