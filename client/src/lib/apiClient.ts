// client/src/lib/apiClient.ts

// Etapa 1: Definir uma classe de erro customizada para falhas de autenticação.
export class AuthError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}

// <<< INÍCIO DA ALTERAÇÃO >>>
// Adicionamos um tipo para o tokenType para maior segurança de código
export type TokenType = 'personalAdmin' | 'aluno';

// A função agora aceita um terceiro parâmetro 'tokenType'
export const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {},
    tokenType: TokenType = 'personalAdmin'
  ): Promise<T> => {

    let token: string | null = null;
    const isPublicAuthRoute = url.startsWith('/api/auth/');
    
    // A lógica de rotas exclusivas foi removida. A decisão agora é explícita.
    if (!isPublicAuthRoute) {
        if (tokenType === 'aluno') {
            token = localStorage.getItem('alunoAuthToken');
        } else {
            token = localStorage.getItem('authToken');
        }
    }
// <<< FIM DA ALTERAÇÃO >>>

    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (!isPublicAuthRoute) {
      // Mensagem de erro agora usa o tokenType explícito
      console.warn(`[fetchWithAuth] Nenhum token encontrado para a rota protegida '${url}' (tipo esperado: ${tokenType})`);
    }

    if (options.body && typeof options.body === 'string') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 204) return null as T;

      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      let data;
      let responseText = await response.text();

      if (responseText && isJson) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[fetchWithAuth] Erro ao parsear JSON da rota '${url}':`, parseError, `Conteúdo: ${responseText.substring(0, 200)}...`);
          throw new Error(`Erro ${response.status}: Resposta JSON inválida do servidor.`);
        }
      } else if (responseText) {
        data = { message: responseText };
      } else {
        data = null;
      }
      
      if (!response.ok) {
        const errorMessage = data?.message || data?.mensagem || data?.erro || `Erro ${response.status}: ${response.statusText || 'Ocorreu um erro na comunicação.'}`;

        if (response.status === 401 || response.status === 403) {
            // Evento customizado agora usa o tokenType explícito
            window.dispatchEvent(new CustomEvent('auth-failed', { 
              detail: { 
                status: response.status,
                forAluno: tokenType === 'aluno', 
                forPersonalAdmin: tokenType === 'personalAdmin'
              } 
            }));
            throw new AuthError(errorMessage);
        }
        
        throw new Error(errorMessage);
      }

      return data as T;

    } catch (error) {
      console.error(`[fetchWithAuth] Erro de rede ou de requisição para a rota '${url}':`, error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
        }
        throw error;
      } else {
        throw new Error('Erro desconhecido durante a requisição.');
      }
    }
  };