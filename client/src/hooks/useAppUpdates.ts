import { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface UpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  offlineReady: boolean;
  updateAvailable: boolean;
}

export function useAppUpdates() {
  const [state, setState] = useState<UpdateState>({
    hasUpdate: false,
    isUpdating: false,
    offlineReady: false,
    updateAvailable: false,
  });

  // Track if notifications have been shown to prevent duplicates
  const notificationsShown = useRef({
    update: false,
    offline: false,
  });

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA Service Worker registered:', r);
      if (r) {
        // Check for updates every hour
        setInterval(() => {
          console.log('PWA: Checking for updates...');
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('PWA Service Worker registration error:', error);
    },
  });

  // Update state when PWA status changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      hasUpdate: needRefresh,
      updateAvailable: needRefresh,
      offlineReady: offlineReady,
    }));
  }, [needRefresh, offlineReady]);

  const handleUpdate = async () => {
    setState(prev => ({ ...prev, isUpdating: true }));
    
    try {
      await updateServiceWorker(true);
      // The page will reload, so we don't need to update state
    } catch (error) {
      console.error('Error updating service worker:', error);
      setState(prev => ({ ...prev, isUpdating: false }));
      
      // Reset the notification state to allow retry
      notificationsShown.current.update = false;
    }
    
    // Failsafe: if the update doesn't complete within 10 seconds, reset the state
    setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        isUpdating: false 
      }));
    }, 10000);
  };

  const handleOfflineReady = () => {
    setOfflineReady(false);
    setState(prev => ({ ...prev, offlineReady: false }));
  };

  const dismissUpdate = () => {
    setNeedRefresh(false);
    notificationsShown.current.update = false;
    setState(prev => ({ ...prev, hasUpdate: false, updateAvailable: false }));
  };

  // Reset notification flags when states change
  useEffect(() => {
    if (!needRefresh) {
      notificationsShown.current.update = false;
    }
  }, [needRefresh]);

  useEffect(() => {
    if (!offlineReady) {
      notificationsShown.current.offline = false;
    }
  }, [offlineReady]);

  return {
    ...state,
    needRefresh,
    offlineReady,
    notificationShown: notificationsShown.current,
    handleUpdate,
    handleOfflineReady,
    dismissUpdate,
    markUpdateNotificationShown: () => { notificationsShown.current.update = true; },
    markOfflineNotificationShown: () => { notificationsShown.current.offline = true; },
  };
}