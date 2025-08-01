// client/src/components/ReloadPrompt.tsx
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

export function ReloadPrompt() {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA Service Worker registered:', r);
      if (r) {
        setInterval(() => {
          console.log('PWA: Checking for updates...');
          r.update();
        }, 60 * 60 * 1000); // 1 hora
      }
    },
    onRegisterError(error) {
      console.error('PWA Service Worker registration error:', error);
    },
  });

  const { toast, dismiss } = useToast();

  React.useEffect(() => {
    let toastId: string | undefined;

    if (needRefresh) {
      const { id } = toast({
        title: 'Atualização Disponível!',
        description: 'Uma nova versão do DyFit está pronta para ser instalada.',
        action: (
          <Button
            onClick={() => {
              setIsUpdating(true);
              updateServiceWorker(true);
            }}
            disabled={isUpdating}
            size="sm"
          >
            {isUpdating ? <RefreshCw className="animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar Agora
          </Button>
        ),
        duration: Infinity, // Mantém o toast visível até ser dispensado
        // <<< CORREÇÃO: Propriedade 'onDismiss' removida >>>
      });
      toastId = id;
    }

    return () => {
      if (toastId) {
        dismiss(toastId);
      }
    };
  }, [needRefresh, updateServiceWorker, toast, dismiss]);

  return null;
}