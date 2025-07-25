import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react'; // Importa o hook para registrar o Service Worker
import { Button } from '@/components/ui/button'; // CORREÇÃO: Usando alias de caminho
import { useToast } from '@/hooks/use-toast';   // CORREÇÃO: Usando alias de caminho

export function ReloadPrompt() {
  // Usa o hook useRegisterSW para gerenciar o registro do Service Worker e atualizações
  // 'setOfflineReady' e 'setNeedRefresh' foram removidas da desestruturação para evitar avisos de "never read".
  const {
    offlineReady: [offlineReady], // Estado que indica se o app está pronto para uso offline
    needRefresh: [needRefresh],   // Estado que indica se uma nova versão está disponível e precisa de refresh
    updateServiceWorker,         // Função para atualizar o Service Worker e recarregar a página
  } = useRegisterSW({
    // Callback chamado quando o Service Worker é atualizado
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    // Callback chamado quando o Service Worker registra um erro
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const { toast } = useToast(); // Obtém a função toast do hook useToast

  // Efeito para exibir o toast quando uma nova versão estiver disponível
  React.useEffect(() => {
    if (needRefresh) {
      toast({
        title: 'Atualização Disponível',
        description: 'Uma nova versão do aplicativo está disponível. Recarregue para obter as últimas funcionalidades!',
        action: (
          <Button
            onClick={() => updateServiceWorker(true)} // Botão para recarregar a página
            className="bg-primary hover:bg-primary-dark text-white"
          >
            Recarregar Agora
          </Button>
        ),
        duration: 0, // Duração 0 para que o toast permaneça até o usuário interagir
      });
    } else if (offlineReady) {
      // Opcional: Notificar quando o aplicativo está pronto para uso offline
      // toast({
      //   title: 'Aplicativo Pronto',
      //   description: 'O aplicativo está pronto para ser usado offline.',
      //   duration: 3000,
      // });
    }
  }, [needRefresh, offlineReady, updateServiceWorker, toast]);

  // Não renderiza nada diretamente, a notificação é feita via toast
  return null;
}
