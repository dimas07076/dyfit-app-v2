// client/src/hooks/useModalPersistence.ts
import { useEffect, useState } from 'react';

interface UseModalPersistenceOptions {
  modalKey: string;
  onRestore?: () => void;
  expectedRoute?: string; // Route where modal should be restored
}

export function useModalPersistence({ modalKey, onRestore, expectedRoute }: UseModalPersistenceOptions) {
  const [isOpen, setIsOpen] = useState(false);

  // Restore modal state on mount with route validation
  useEffect(() => {
    const savedState = localStorage.getItem(`modal_${modalKey}`);
    if (savedState === 'true') {
      // Verify user is still on the correct page before restoring modal
      if (expectedRoute && !window.location.pathname.includes(expectedRoute)) {
        // User is not on the expected route, clear the modal state
        localStorage.removeItem(`modal_${modalKey}`);
        return;
      }
      
      setIsOpen(true);
      onRestore?.();
    }
  }, [modalKey, onRestore, expectedRoute]);

  // Save modal state to localStorage when it changes
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem(`modal_${modalKey}`, 'true');
    } else {
      localStorage.removeItem(`modal_${modalKey}`);
    }
  }, [isOpen, modalKey]);

  const openModal = () => setIsOpen(true);
  
  const closeModal = () => {
    setIsOpen(false);
    // Immediately clear persistence to prevent unwanted restoration
    localStorage.removeItem(`modal_${modalKey}`);
  };

  return {
    isOpen,
    openModal,
    closeModal,
    setIsOpen
  };
}