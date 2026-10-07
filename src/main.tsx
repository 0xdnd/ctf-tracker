import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';
import { isTauriTarget } from './utils/runtimeTarget';

// Register offline Service Worker only in production builds; clear any stale SW in DEV mode
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) caches.delete(key);
      });
    }
  } else if (!isTauriTarget()) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('[ZeroBox SW] Service Worker registration failed:', err);
        });
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
