import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    offlineReady: [offlineReady], // Removido setOfflineReady que não estava sendo usado
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA Service Worker registered:', r);
      // Verifica por atualizações a cada 1 hora
      r && setInterval(() => {
        console.log('PWA: Checking for updates...');
        r.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('PWA Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    await updateServiceWorker(true);
    setShowUpdatePrompt(false);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  return {
    showUpdatePrompt,
    isUpdating,
    offlineReady,
    handleUpdate,
    handleDismiss,
  };
}