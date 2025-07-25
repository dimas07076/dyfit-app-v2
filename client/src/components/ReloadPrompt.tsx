import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button'; // Usando alias de caminho
import { useToast } from '@/hooks/use-toast';   // Usando alias de caminho

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Opcional: Iniciar verificação periódica após o registro
      // setInterval(() => {
      //   r && r.update(); // Força uma verificação de atualização a cada X milissegundos
      // }, 5 * 60 * 1000); // Exemplo: a cada 5 minutos
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const { toast } = useToast();

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

  // Adiciona uma verificação periódica de atualização
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Tenta atualizar o Service Worker
      // `updateServiceWorker()` sem parâmetro apenas verifica por uma nova versão
      // `updateServiceWorker(true)` força a atualização e recarrega a página se uma nova for encontrada
      updateServiceWorker(); 
    }, 5 * 60 * 1000); // Verifica a cada 5 minutos (300000 ms)

    return () => clearInterval(interval); // Limpa o intervalo ao desmontar o componente
  }, [updateServiceWorker]);

  // Opcional: Botão manual para verificar atualizações (pode ser útil para depuração)
  // Remova ou comente esta seção em produção se não quiser um botão visível
  // const handleManualCheck = async () => {
  //   toast({
  //     title: "Verificando Atualizações...",
  //     description: "Buscando por novas versões do aplicativo.",
  //     duration: 2000,
  //   });
  //   await updateServiceWorker();
  // };

  return (
    // <div className="fixed bottom-4 right-4 z-50">
    //   <Button onClick={handleManualCheck} variant="secondary">
    //     Verificar Atualizações (Manual)
    //   </Button>
    // </div>
    null // Não renderiza nada diretamente, a notificação é feita via toast
  );
}
