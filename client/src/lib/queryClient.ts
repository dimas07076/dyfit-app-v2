// client/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from './apiClient';

// <<< INÍCIO DA ALTERAÇÃO >>>
// Função de atraso para as retentativas (delay "exponencial" com um teto)
// Isso dá tempo para a conexão de rede se restabelecer.
const retryDelay = (attemptIndex: number) => {
  // Tenta após 1s, depois 2s, depois 4s... com um máximo de 30s de espera.
  return Math.min(1000 * 2 ** attemptIndex, 30000); 
}
// <<< FIM DA ALTERAÇÃO >>>

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const relativeUrl = url.startsWith('/') ? url : `/${url}`;
  const options: RequestInit = { method };
  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }
  try {
    return await fetchWithAuth<T>(relativeUrl, options);
  } catch (error) {
    throw error;
  }
}

// <<< INÍCIO DA ALTERAÇÃO >>>
// Adicionamos configurações padrão globais para todas as queries da aplicação.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Por 2 minutos, os dados são considerados "frescos". O React Query
      // os servirá do cache instantaneamente sem fazer uma nova chamada de rede.
      // Isso torna a volta ao app muito mais rápida.
      staleTime: 1000 * 60 * 2, // 2 minutos

      // Se uma query falhar (ex: por erro de rede ao voltar pro app),
      // ela tentará automaticamente mais 2 vezes antes de mostrar um erro.
      retry: 2, 

      // Define o atraso entre as tentativas, dando tempo para a conexão voltar.
      retryDelay: retryDelay,

      // Mantemos isso como true, pois é o comportamento padrão e desejável.
      // O staleTime já previne chamadas desnecessárias.
      refetchOnWindowFocus: true, 
    },
  },
});
// <<< FIM DA ALTERAÇÃO >>>