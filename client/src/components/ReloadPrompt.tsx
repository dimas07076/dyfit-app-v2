import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Download, Wifi } from 'lucide-react';

export function ReloadPrompt() {
  const [isUpdating, setIsUpdating] = React.useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('PWA Service Worker registered:', r);
      if (r) {
        // Verifica por atualizações a cada 1 hora
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

  const { toast, dismiss } = useToast();

  // Toast para notificação de atualização - NO TOPO
  React.useEffect(() => {
    let toastId: string | undefined;

    if (needRefresh) {
      const { id } = toast({
        title: '🚀 Nova versão disponível!',
        description: 'DyFit foi atualizado com melhorias e correções.',
        action: (
          <Button
            onClick={async () => {
              setIsUpdating(true);
              try {
                await updateServiceWorker(true);
              } catch (error) {
                console.error('Erro ao atualizar:', error);
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            {isUpdating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isUpdating ? 'Atualizando...' : 'Atualizar'}
          </Button>
        ),
        duration: 0, // Não fechar automaticamente
        className: "top-4 border-blue-200 bg-blue-50 text-blue-900 shadow-lg",
      });
      toastId = id;
    }

    return () => {
      if (toastId) {
        dismiss(toastId);
      }
    };
  }, [needRefresh, updateServiceWorker, toast, dismiss, isUpdating]);

  // Toast para app offline ready - NO TOPO
  React.useEffect(() => {
    let toastId: string | undefined;

    if (offlineReady) {
      const { id } = toast({
        title: '📱 App pronto para offline!',
        description: 'DyFit já pode ser usado sem internet.',
        action: (
          <Button
            onClick={() => setOfflineReady(false)}
            variant="outline"
            size="sm"
            className="border-green-200 text-green-700 hover:bg-green-50"
          >
            <Wifi className="mr-2 h-4 w-4" />
            OK
          </Button>
        ),
        duration: 5000,
        className: "top-4 border-green-200 bg-green-50 text-green-900 shadow-lg",
      });
      toastId = id;
    }

    return () => {
      if (toastId) {
        dismiss(toastId);
      }
    };
  }, [offlineReady, setOfflineReady, toast, dismiss]);

  return null;
}