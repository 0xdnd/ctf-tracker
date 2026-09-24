import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Unregister any stale legacy service worker and flush cache to prevent serving outdated assets
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

// Request durable non-evictable storage quota and monitor usage
if (typeof window !== 'undefined' && 'storage' in navigator) {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then((persistent) => {
      if (import.meta.env.DEV) {
        console.info(`[ZeroBox Storage] Persistent storage mode: ${persistent ? 'GRANTED' : 'DEFAULT_EVICTABLE'}`);
      }
    }).catch((err) => {
      console.warn('[ZeroBox Storage] Could not request persistent storage:', err);
    });
  }
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({ quota, usage }) => {
      if (quota && usage) {
        const percentUsed = (usage / quota) * 100;
        if (percentUsed > 80) {
          console.warn(
            `[ZeroBox Storage Warning] Approaching quota limits: ${percentUsed.toFixed(1)}% used (${Math.round(usage / (1024 * 1024))}MB / ${Math.round(quota / (1024 * 1024))}MB). Consider exporting a workspace backup.`
          );
        }
      }
    }).catch(() => {});
  }
}

(window as any).__SPECTER_LOADED__ = true;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
