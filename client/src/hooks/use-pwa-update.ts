// client/src/hooks/use-pwa-update.ts
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/use-toast';

export function usePWAUpdate() {
  const { toast } = useToast();
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const checkForUpdates = async () => {
    try {
      console.log('[PWA] Verificação manual de atualizações iniciada...');
      
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('[PWA] Forçando verificação de atualização...');
          await registration.update();
          
          // Aguarda um pouco para dar tempo do SW processar
          setTimeout(() => {
            if (!needRefresh) {
              toast({
                title: 'Nenhuma Atualização Disponível',
                description: 'Você já está usando a versão mais recente do DyFit.',
                duration: 3000,
              });
            }
          }, 1000);
        }
      }
    } catch (error) {
      console.error('[PWA] Erro ao verificar atualizações:', error);
      toast({
        title: 'Erro ao Verificar Atualizações',
        description: 'Não foi possível verificar se há atualizações disponíveis.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const applyUpdate = () => {
    console.log('[PWA] Aplicando atualização...');
    updateServiceWorker(true);
  };

  return {
    needRefresh,
    checkForUpdates,
    updateServiceWorker,
    applyUpdate,
  };
}