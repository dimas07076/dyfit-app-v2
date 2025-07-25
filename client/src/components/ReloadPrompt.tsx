// client/src/components/ReloadPrompt.tsx
import { useEffect } from 'react';
import { usePWAUpdate } from '@/hooks/use-pwa-update';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

/**
 * Este componente não renderiza nada visualmente.
 * Ele serve como um controlador para detectar quando uma nova versão
 * do Service Worker está disponível (app atualizado) e notifica o usuário
 * usando o sistema de Toasts, oferecendo uma ação para recarregar a página.
 */
function ReloadPrompt() {
  const { needRefresh, applyUpdate } = usePWAUpdate();
  const { toast } = useToast();

  useEffect(() => {
    console.log(`[PWA] needRefresh status: ${needRefresh}`);
    
    if (needRefresh) {
      console.log('[PWA] Mostrando notificação de atualização para o usuário');
      
      const { dismiss } = toast({
        title: 'Nova Versão Disponível! 🚀',
        description: 'Uma nova versão do DyFit está pronta para ser instalada.',
        duration: Infinity,
        action: (
          <Button
            onClick={() => {
              applyUpdate();
              dismiss();
            }}
          >
            Atualizar Agora
          </Button>
        ),
      });
    }
  }, [needRefresh, applyUpdate, toast]);

  // O componente em si não precisa renderizar nada na tela.
  return null;
}

export default ReloadPrompt;