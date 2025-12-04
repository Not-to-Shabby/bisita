import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export const useServiceWorker = () => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
  });

  useEffect(() => {
    if (!state.isSupported) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[App] Service worker registered:', registration.scope);

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update available
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      } catch (error) {
        console.error('[App] Service worker registration failed:', error);
      }
    };

    // Register on page load
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, [state.isSupported]);

  const updateServiceWorker = () => {
    if (!state.registration?.waiting) return;
    
    state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  const clearCache = async () => {
    if (!state.registration?.active) return;
    
    state.registration.active.postMessage({ type: 'CLEAR_CACHE' });
  };

  return {
    ...state,
    updateServiceWorker,
    clearCache,
  };
};

// Register service worker on module load (for production)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('[App] Service worker registration failed:', error);
    });
  });
}

export default useServiceWorker;
