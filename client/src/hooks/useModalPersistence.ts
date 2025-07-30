// client/src/hooks/useModalPersistence.ts
import { useEffect, useState } from 'react';

interface UseModalPersistenceOptions {
  modalKey: string;
  onRestore?: () => void;
}

export function useModalPersistence({ modalKey, onRestore }: UseModalPersistenceOptions) {
  const [isOpen, setIsOpen] = useState(false);

  // Restore modal state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`modal_${modalKey}`);
    if (savedState === 'true') {
      setIsOpen(true);
      onRestore?.();
    }
  }, [modalKey, onRestore]);

  // Save modal state to localStorage when it changes
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(`modal_${modalKey}`, 'true');
    } else {
      localStorage.removeItem(`modal_${modalKey}`);
    }
  }, [isOpen, modalKey]);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal,
    setIsOpen
  };
}