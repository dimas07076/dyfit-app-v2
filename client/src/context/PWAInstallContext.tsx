// client/src/context/PWAInstallContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
// <<< INÍCIO DA ALTERAÇÃO >>>
import { Share, PlusSquare, X } from 'lucide-react'; 
// <<< FIM DA ALTERAÇÃO >>>

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
  // <<< INÍCIO DA ALTERAÇÃO >>>
  showIOSInstallBanner: boolean;
  // <<< FIM DA ALTERAÇÃO >>>
}

const PWAInstallContext = createContext<PWAInstallContextType | undefined>(undefined);


// <<< INÍCIO DA CRIAÇÃO DO NOVO COMPONENTE >>>
const IOSInstallBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-indigo-700 text-white p-3 rounded-lg shadow-2xl z-50 animate-slide-up-fade-in">
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-1 right-1 p-1 text-indigo-200 hover:text-white"
                aria-label="Dispensar"
            >
                <X size={16} />
            </button>
            <div className="flex items-center gap-3">
                <img src="/pwa-192x192.png" alt="DyFit Logo" className="w-12 h-12 rounded-lg" />
                <div>
                    <p className="font-bold text-sm">Instale o DyFit no seu iPhone!</p>
                    <p className="text-xs text-indigo-200 mt-1">
                        Toque em <Share size={12} className="inline-block mx-1" />
                        e depois em 'Adicionar à Tela de Início' <PlusSquare size={12} className="inline-block mx-1" />
                    </p>
                </div>
            </div>
        </div>
    );
};
// <<< FIM DA CRIAÇÃO DO NOVO COMPONENTE >>>
// CONTINUAÇÃO...

export const PWAInstallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  // <<< INÍCIO DA ALTERAÇÃO >>>
  const [showIOSInstallBanner, setShowIOSInstallBanner] = useState(false);
  // <<< FIM DA ALTERAÇÃO >>>

  useEffect(() => {
    console.log('[PWA Context] Contexto inicializado e ouvindo pelo evento de instalação.');

    // --- Lógica para Android/Desktop (baseada em evento) ---
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      console.log('[PWA Context] SUCESSO: Evento de instalação capturado e pronto para ser usado.');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // --- Lógica para iOS (baseada em detecção do navegador) ---
    const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches;

    // Se for iOS e o app ainda NÃO estiver instalado, mostramos o banner de instrução.
    if (isIOS() && !isPWAInstalled) {
      // Pequeno delay para garantir que a UI principal renderize primeiro
      setTimeout(() => {
        setShowIOSInstallBanner(true);
      }, 1500);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstallPrompt = useCallback(() => {
    if (!installPromptEvent) {
      console.error("[PWA Context] FALHA: O botão 'Instalar' foi clicado, mas o navegador ainda não forneceu o evento 'beforeinstallprompt'.");
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
    // <<< INÍCIO DA ALTERAÇÃO >>>
    showIOSInstallBanner,
    // <<< FIM DA ALTERAÇÃO >>>
  };

  return (
    <PWAInstallContext.Provider value={value}>
      {children}
      {/* <<< INÍCIO DA ALTERAÇÃO >>> */}
      {/* O banner de instrução para iOS é renderizado aqui se a condição for verdadeira */}
      {showIOSInstallBanner && <IOSInstallBanner />}
      {/* <<< FIM DA ALTERAÇÃO >>> */}
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