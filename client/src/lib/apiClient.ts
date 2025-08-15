// client/src/lib/apiClient.ts

export class AuthError extends Error {
  public code?: string; 

  constructor(message = 'Authentication failed', code?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type TokenType = 'personalAdmin' | 'aluno';

// 1. Definir o tipo da nova opção
interface FetchOptions extends RequestInit {
  returnAs?: 'json' | 'response'; // 'json' é o padrão, 'response' para downloads
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

const calculateBackoffDelay = (attempt: number): number => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt);
  return Math.min(delay + Math.random() * 1000, RETRY_CONFIG.maxDelay);
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const validateAndCleanStorage = (tokenType: TokenType): boolean => {
  try {
    const tokenKey = tokenType === 'aluno' ? 'alunoAuthToken' : 'authToken';
    const refreshTokenKey = tokenType === 'aluno' ? 'alunoRefreshToken' : 'refreshToken';
    
    const token = localStorage.getItem(tokenKey);
    const refreshToken = localStorage.getItem(refreshTokenKey);
    
    console.log(`[validateAndCleanStorage] Validando storage para ${tokenType}...`);
    
    if (token === '' || token === 'null' || token === 'undefined') {
      console.warn(`[validateAndCleanStorage] Token ${tokenType} corrompido, limpando apenas este tipo...`);
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(refreshTokenKey);
      
      if (tokenType === 'aluno') {
        localStorage.removeItem('alunoData');
      } else {
        localStorage.removeItem('userData');
      }
      return false;
    }
    
    if (refreshToken === '' || refreshToken === 'null' || refreshToken === 'undefined') {
      console.warn(`[validateAndCleanStorage] Refresh token ${tokenType} corrompido, limpando apenas este tipo...`);
      localStorage.removeItem(refreshTokenKey);
    }
    
    if (token && !token.includes('.')) {
      console.warn(`[validateAndCleanStorage] Token ${tokenType} não tem formato JWT válido, limpando...`);
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(refreshTokenKey);
      return false;
    }
    
    console.log(`[validateAndCleanStorage] Storage para ${tokenType} validado com sucesso.`);
    return true;
  } catch (error) {
    console.error(`[validateAndCleanStorage] Erro ao validar storage para ${tokenType}:`, error);
    return false;
  }
};
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

const refreshToken = async (tokenType: TokenType, retryAttempt: number = 0): Promise<string | null> => {
  if (!validateAndCleanStorage(tokenType)) {
    console.warn(`[refreshToken] Storage corrompido para ${tokenType}, abortando renovação`);
    return null;
  }

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
      
      if (response.status >= 500 && retryAttempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(retryAttempt);
        console.log(`[refreshToken] Erro ${response.status}, tentativa ${retryAttempt + 1}/${RETRY_CONFIG.maxRetries + 1} em ${delay}ms`);
        await sleep(delay);
        return refreshToken(tokenType, retryAttempt + 1);
      }
      
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
    
    if (tokenType === 'aluno') {
      localStorage.setItem('alunoAuthToken', newToken);
    } else {
      localStorage.setItem('authToken', newToken);
    }
    
    console.log(`[refreshToken] Token ${tokenType} renovado com sucesso`);
    return newToken;
    
  } catch (error) {
    console.error(`[refreshToken] Erro ao renovar token ${tokenType}:`, error);
    
    if (retryAttempt < RETRY_CONFIG.maxRetries) {
      const delay = calculateBackoffDelay(retryAttempt);
      console.log(`[refreshToken] Erro de rede, tentativa ${retryAttempt + 1}/${RETRY_CONFIG.maxRetries + 1} em ${delay}ms`);
      await sleep(delay);
      return refreshToken(tokenType, retryAttempt + 1);
    }
    
    return null;
  }
};

const fetchWithAuthInternal = async <T = any>(
  url: string,
  options: FetchOptions = {},
  tokenType: TokenType = 'personalAdmin'
): Promise<T> => {
  if (!url.startsWith('/api/auth/')) {
    validateAndCleanStorage(tokenType);
  }

  let token: string | null = null;
  const isPublicAuthRoute = url.startsWith('/api/auth/');
  
  if (!isPublicAuthRoute) {
      if (tokenType === 'aluno') {
          token = localStorage.getItem('alunoAuthToken');
      } else {
          token = localStorage.getItem('authToken');
      }
  }

  const headers = new Headers(options.headers || {});
  
  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    headers.set('Accept', 'application/json');
  } else {
    console.log(`[fetchWithAuth] FormData upload detected for ${url}`);
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    if (isFormData) {
      console.log(`[fetchWithAuth] Authorization header set for FormData upload`);
    }
  } else if (!isPublicAuthRoute) {
    console.warn(`[fetchWithAuth] Nenhum token encontrado para a rota protegida '${url}' (tipo esperado: ${tokenType})`);
  }

  if (options.body && typeof options.body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  try {
    const response = await fetch(url, { ...options, headers });
    
    // 3. Lógica de retorno modificada
    if (options.returnAs === 'response') {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Erro ${response.status} ao buscar o arquivo.` }));
            throw new Error(errorData.message);
        }
        return response as T;
    }

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
      const errorCode = data?.code;

      if (response.status === 401 || response.status === 403) {
          if (response.status === 401 && !isPublicAuthRoute) {
              if (isRefreshing) {
                  return new Promise((resolve, reject) => {
                      failedQueue.push({ resolve, reject });
                  }).then((token) => {
                      const newHeaders = new Headers(options.headers || {});
                      newHeaders.set('Authorization', `Bearer ${token}`);
                      if (!(options.body instanceof FormData)) {
                        newHeaders.set('Accept', 'application/json');
                      }
                      return fetch(url, { ...options, headers: newHeaders });
                  }).then(async (retryResponse) => {
                      if (retryResponse.status === 204) return null as T;
                      const retryData = await retryResponse.json();
                      if (!retryResponse.ok) {
                          throw new Error(retryData?.message || `Erro ${retryResponse.status}`);
                      }
                      return retryData as T;
                  });
              }

              isRefreshing = true;
              
              try {
                  const newToken = await refreshToken(tokenType);
                  
                  if (newToken) {
                      processQueue(null, newToken);
                      isRefreshing = false;
                      
                      const newHeaders = new Headers(options.headers || {});
                      newHeaders.set('Authorization', `Bearer ${newToken}`);
                      
                      if (!(options.body instanceof FormData)) {
                        newHeaders.set('Accept', 'application/json');
                      }
                      
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
                      const refreshError = new AuthError('Token expirado e não foi possível renovar', 'REFRESH_FAILED');
                      processQueue(refreshError, null);
                      isRefreshing = false;
                      
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
                  processQueue(refreshError, null);
                  isRefreshing = false;
                  
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
      
      if (response.status >= 500) {
        const serverError = new Error(`Erro ${response.status}: ${errorMessage}`);
        (serverError as any).status = response.status;
        (serverError as any).isServerError = true;
        throw serverError;
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

export const fetchWithAuth = async <T = any>(
    url: string,
    options: FetchOptions = {},
    tokenType: TokenType = 'personalAdmin'
  ): Promise<T> => {

    try {
      return await fetchWithAuthInternal<T>(url, options, tokenType);
    } catch (error: any) {
      if (error?.isServerError && error?.status >= 500) {
        console.log(`[fetchWithAuth] Erro ${error.status} detectado para ${url}, implementando retry com backoff`);
        
        for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
          try {
            const delay = calculateBackoffDelay(attempt);
            console.log(`[fetchWithAuth] Tentativa ${attempt + 1}/${RETRY_CONFIG.maxRetries} em ${delay}ms`);
            await sleep(delay);
            
            return await fetchWithAuthInternal<T>(url, options, tokenType);
          } catch (retryError: any) {
            if (attempt === RETRY_CONFIG.maxRetries - 1) {
              console.error(`[fetchWithAuth] Todas as tentativas falharam para ${url}`);
              throw error;
            }
            if (!retryError?.isServerError || retryError?.status < 500) {
              throw retryError;
            }
          }
        }
      }
      
      throw error;
    }
  };

export const apiRequest = async <T = any>(
  method: string,
  url: string,
  body?: any,
  tokenType: TokenType = 'personalAdmin'
): Promise<T> => {
  const options: FetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetchWithAuth<T>(url, options, tokenType);
};