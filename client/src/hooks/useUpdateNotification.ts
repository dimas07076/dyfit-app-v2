// client/src/hooks/useUpdateNotification.ts
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useUpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
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
    // A página irá recarregar automaticamente após a atualização.
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  return {
    showUpdatePrompt,
    isUpdating,
    handleUpdate,
    handleDismiss,
  };
}