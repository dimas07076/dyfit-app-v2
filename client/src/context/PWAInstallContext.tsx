// client/src/context/PWAInstallContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';

// Interface para o evento especial que o navegador dispara para PWAs
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallContextType {
  canInstall: boolean;
  triggerInstallPrompt: () => void;
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(undefined);

export const PWAInstallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // <<< LOG DE DEPURAÇÃO ADICIONADO >>>
    console.log('[PWA Context] Contexto inicializado e ouvindo pelo evento de instalação.');

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      console.log('[PWA Context] SUCESSO: Evento de instalação capturado e pronto para ser usado.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstallPrompt = useCallback(() => {
    if (!installPromptEvent) {
      // <<< LOG DE DEPURAÇÃO ADICIONADO >>>
      console.error("[PWA Context] FALHA: O botão 'Instalar' foi clicado, mas o navegador ainda não forneceu o evento 'beforeinstallprompt'. Verifique os critérios de PWA (Manifest, Service Worker, HTTPS).");
      alert("A instalação não está disponível no momento. Verifique se você está usando um navegador compatível (como Chrome ou Edge) e se o site é seguro (HTTPS).");
      return;
    }
    
    installPromptEvent.prompt();

    installPromptEvent.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA Context] Usuário aceitou a instalação do PWA.');
      } else {
        console.log('[PWA Context] Usuário recusou a instalação do PWA.');
      }
      setInstallPromptEvent(null);
    });
  }, [installPromptEvent]);

  const value = {
    canInstall: installPromptEvent !== null,
    triggerInstallPrompt,
  };

  return (
    <PWAInstallContext.Provider value={value}>
      {children}
    </PWAInstallContext.Provider>
  );
};

export const usePWAInstall = (): PWAInstallContextType => {
  const context = useContext(PWAInstallContext);
  if (context === undefined) {
    throw new Error('usePWAInstall deve ser usado dentro de um PWAInstallProvider');
  }
  return context;
};