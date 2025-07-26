// client/src/lib/apiClient.ts

// Etapa 1: Definir uma classe de erro customizada para falhas de autenticação.
export class AuthError extends Error {
  // Adicionamos uma propriedade 'code' para armazenar o código de erro específico
  public code?: string; 

  constructor(message = 'Authentication failed', code?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code; // Atribui o código de erro
  }
}

// Adicionamos um tipo para o tokenType para maior segurança de código
export type TokenType = 'personalAdmin' | 'aluno';

// Variável para controlar se já estamos tentando renovar um token (evita loops infinitos)
let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

// Função para processar a fila de requisições que falharam durante a renovação
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Função para renovar o token
const refreshToken = async (tokenType: TokenType): Promise<string | null> => {
  const refreshTokenKey = tokenType === 'aluno' ? 'alunoRefreshToken' : 'refreshToken';
  const refreshTokenValue = localStorage.getItem(refreshTokenKey);
  
  if (!refreshTokenValue) {
    console.warn(`[refreshToken] Nenhum refresh token encontrado para ${tokenType}`);
    return null;
  }

  const endpoint = tokenType === 'aluno' ? '/api/auth/aluno/refresh' : '/api/auth/refresh';
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { message: errorData };
      }
      
      console.warn(`[refreshToken] Falha ao renovar token ${tokenType}:`, parsedError.message);
      
      // Remove tokens inválidos
      localStorage.removeItem(refreshTokenKey);
      if (tokenType === 'aluno') {
        localStorage.removeItem('alunoAuthToken');
      } else {
        localStorage.removeItem('authToken');
      }
      
      return null;
    }

    const data = await response.json();
    const newToken = data.token;
    
    // Armazena o novo token
    if (tokenType === 'aluno') {
      localStorage.setItem('alunoAuthToken', newToken);
    } else {
      localStorage.setItem('authToken', newToken);
    }
    
    console.log(`[refreshToken] Token ${tokenType} renovado com sucesso`);
    return newToken;
    
  } catch (error) {
    console.error(`[refreshToken] Erro ao renovar token ${tokenType}:`, error);
    return null;
  }
};

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
        // Captura a mensagem e o código de erro do backend, se existirem
        const errorMessage = data?.message || data?.mensagem || data?.erro || `Erro ${response.status}: ${response.statusText || 'Ocorreu um erro na comunicação.'}`;
        const errorCode = data?.code; // Captura o código de erro enviado pelo backend

        if (response.status === 401 || response.status === 403) {
            // Tentar renovar o token apenas em caso de 401 (não 403, que é falta de permissão)
            if (response.status === 401 && !isPublicAuthRoute) {
                // Se já estamos renovando, adiciona à fila
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then((token) => {
                        // Retry com o novo token
                        const newHeaders = new Headers(options.headers || {});
                        newHeaders.set('Authorization', `Bearer ${token}`);
                        return fetch(url, { ...options, headers: newHeaders });
                    }).then(async (retryResponse) => {
                        // Processa a resposta da tentativa com o novo token
                        if (retryResponse.status === 204) return null as T;
                        const retryData = await retryResponse.json();
                        if (!retryResponse.ok) {
                            throw new Error(retryData?.message || `Erro ${retryResponse.status}`);
                        }
                        return retryData as T;
                    });
                }

                // Marca que estamos renovando
                isRefreshing = true;
                
                try {
                    const newToken = await refreshToken(tokenType);
                    
                    if (newToken) {
                        // Processa a fila com sucesso
                        processQueue(null, newToken);
                        isRefreshing = false;
                        
                        // Retry da requisição original com o novo token
                        const newHeaders = new Headers(options.headers || {});
                        newHeaders.set('Authorization', `Bearer ${newToken}`);
                        
                        const retryResponse = await fetch(url, { ...options, headers: newHeaders });
                        
                        if (retryResponse.status === 204) return null as T;
                        
                        const retryContentType = retryResponse.headers.get('content-type');
                        const retryIsJson = retryContentType && retryContentType.includes('application/json');
                        
                        let retryData;
                        const retryResponseText = await retryResponse.text();
                        
                        if (retryResponseText && retryIsJson) {
                            try {
                                retryData = JSON.parse(retryResponseText);
                            } catch (parseError) {
                                console.error(`[fetchWithAuth] Erro ao parsear JSON na tentativa de retry da rota '${url}':`, parseError);
                                throw new Error(`Erro ${retryResponse.status}: Resposta JSON inválida do servidor.`);
                            }
                        } else if (retryResponseText) {
                            retryData = { message: retryResponseText };
                        } else {
                            retryData = null;
                        }
                        
                        if (!retryResponse.ok) {
                            const retryErrorMessage = retryData?.message || retryData?.mensagem || retryData?.erro || `Erro ${retryResponse.status}: ${retryResponse.statusText || 'Ocorreu um erro na comunicação.'}`;
                            throw new Error(retryErrorMessage);
                        }
                        
                        return retryData as T;
                    } else {
                        // Renovação falhou, processa a fila com erro
                        const refreshError = new AuthError('Token expirado e não foi possível renovar', 'REFRESH_FAILED');
                        processQueue(refreshError, null);
                        isRefreshing = false;
                        
                        // Dispara evento de falha de autenticação
                        window.dispatchEvent(new CustomEvent('auth-failed', { 
                          detail: { 
                            status: response.status,
                            forAluno: tokenType === 'aluno', 
                            forPersonalAdmin: tokenType === 'personalAdmin',
                            code: 'REFRESH_FAILED'
                          } 
                        }));
                        
                        throw refreshError;
                    }
                } catch (refreshError) {
                    // Processa a fila com erro
                    processQueue(refreshError, null);
                    isRefreshing = false;
                    
                    // Se o erro não é de renovação, dispara o evento original
                    if (!(refreshError instanceof AuthError)) {
                        window.dispatchEvent(new CustomEvent('auth-failed', { 
                          detail: { 
                            status: response.status,
                            forAluno: tokenType === 'aluno', 
                            forPersonalAdmin: tokenType === 'personalAdmin',
                            code: errorCode
                          } 
                        }));
                    }
                    
                    throw refreshError;
                }
            } else {
                // Para 403 ou rotas públicas, comportamento original
                window.dispatchEvent(new CustomEvent('auth-failed', { 
                  detail: { 
                    status: response.status,
                    forAluno: tokenType === 'aluno', 
                    forPersonalAdmin: tokenType === 'personalAdmin',
                    code: errorCode
                  } 
                }));
                throw new AuthError(errorMessage, errorCode);
            }
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

// NOVO: Função auxiliar para requisições API que não precisam de autenticação específica ou que já usam fetchWithAuth internamente
export const apiRequest = async <T = any>(
  method: string,
  url: string,
  body?: any,
  tokenType: TokenType = 'personalAdmin' // Default para personalAdmin, pode ser 'aluno' se necessário
): Promise<T> => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // Reutiliza fetchWithAuth para lidar com autenticação e tratamento de erros
  return fetchWithAuth<T>(url, options, tokenType);
};
