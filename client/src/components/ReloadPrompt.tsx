// client/src/components/ReloadPrompt.tsx
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

/**
 * Este componente não renderiza nada visualmente.
 * Ele serve como um controlador para detectar quando uma nova versão
 * do Service Worker está disponível (app atualizado) e notifica o usuário
 * usando o sistema de Toasts, oferecendo uma ação para recarregar a página.
 */
function ReloadPrompt() {
  const { toast } = useToast();

  // O hook useRegisterSW é fornecido por 'vite-plugin-pwa'
  // needRefresh: um booleano que se torna true quando há uma atualização pronta.
  // updateServiceWorker: uma função para ativar o novo SW e recarregar a página.
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // <<< ALTERAÇÃO AQUI: Ajustado o tipo para aceitar 'undefined' >>>
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log(`Service Worker registrado.`);
      // Adicionamos a verificação 'if (r)' para usar o objeto de registro com segurança
      if (r) {
        // Opcional: Logar o registro a cada hora para garantir que está checando por atualizações.
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // 1 hora
      }
    },
    onRegisterError(error: any) {
      console.error('Erro ao registrar o Service Worker:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      // Se uma nova versão for detectada, mostramos um toast persistente.
      const { dismiss } = toast({
        title: 'Nova Versão Disponível!',
        description: 'Uma nova versão do DyFit está pronta para ser instalada.',
        duration: Infinity, // O toast não desaparece sozinho
        action: (
          <Button
            onClick={() => {
              // Ao clicar, ativamos o novo Service Worker.
              // O `true` como argumento força o recarregamento da página.
              updateServiceWorker(true);
              dismiss(); // Fecha o toast
            }}
          >
            Atualizar Agora
          </Button>
        ),
      });
    }
  }, [needRefresh, toast, updateServiceWorker]);

  // O componente em si não precisa renderizar nada na tela.
  return null;
}

export default ReloadPrompt;