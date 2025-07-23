// client/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
// Etapa 1: Importar o AuthError que criamos no apiClient.
import { fetchWithAuth, AuthError, TokenType } from './apiClient';

const retryDelay = (attemptIndex: number) => {
  return Math.min(1000 * 2 ** attemptIndex, 30000); 
}

// Adicionamos um quarto parâmetro opcional 'tokenType' para especificar qual token usar.
export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
  tokenType: TokenType = 'personalAdmin' // Valor padrão para manter a compatibilidade
): Promise<T> {
  const relativeUrl = url.startsWith('/') ? url : `/${url}`;
  const options: RequestInit = { method };
  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }
  try {
    // Passamos o 'tokenType' para a função fetchWithAuth.
    return await fetchWithAuth<T>(relativeUrl, options, tokenType);
  } catch (error) {
    throw error;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos

      // Etapa 2: Transformar a opção 'retry' em uma função inteligente.
      // Esta função recebe o número de tentativas e o objeto de erro.
      retry: (failureCount, error) => {
        // Se o erro for uma instância do nosso AuthError, a função retorna 'false'.
        // Isso diz ao React Query: "Não tente novamente. Esta é uma falha de autenticação."
        if (error instanceof AuthError) {
          // Adicionado tratamento específico para códigos de erro de autenticação
          if (error.code === 'TOKEN_NOT_PROVIDED' || error.code === 'TOKEN_EXPIRED') {
            // Se o token não foi fornecido ou expirou, não tentar novamente e redirecionar
            // Nota: O redirecionamento real para a página de login deve ser feito
            // por um listener global para o evento 'auth-failed' ou no componente de login.
            // Aqui, apenas impedimos o retry.
            console.warn(`[React Query Retry] Autenticação falhou com código: ${error.code}. Não retentando.`);
            return false; 
          }
          // Para outros AuthErrors (ex: INVALID_TOKEN, UNAUTHORIZED_ROLE, INVALID_CREDENTIALS)
          // também não retentamos, pois são erros que exigem ação do usuário (login correto, permissão).
          console.warn(`[React Query Retry] Erro de autenticação não retentável com código: ${error.code}`);
          return false;
        }

        // Para qualquer outro tipo de erro (ex: falha de rede), mantemos a lógica original.
        // Tenta novamente até 2 vezes (total de 3 tentativas).
        if (failureCount < 2) {
          return true;
        }

        return false;
      }, 

      retryDelay: retryDelay,

      refetchOnWindowFocus: true, 
    },
  },
});
