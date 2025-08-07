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

// Configurações para retry com backoff exponencial
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffFactor: 2
};

// Função para calcular delay com backoff exponencial
const calculateBackoffDelay = (attempt: number): number => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt);
  return Math.min(delay + Math.random() * 1000, RETRY_CONFIG.maxDelay); // Adiciona jitter
};

// Função para aguardar um determinado tempo
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Função para validar se localStorage está corrompido - agora token-type aware
const validateAndCleanStorage = (tokenType: TokenType): boolean => {
  try {
    const tokenKey = tokenType === 'aluno' ? 'alunoAuthToken' : 'authToken';
    const refreshTokenKey = tokenType === 'aluno' ? 'alunoRefreshToken' : 'refreshToken';
    
    const token = localStorage.getItem(tokenKey);
    const refreshToken = localStorage.getItem(refreshTokenKey);
    
    // CORREÇÃO: Só limpa tokens do tipo específico solicitado
    // Não remove tokens de outros tipos durante a validação
    console.log(`[validateAndCleanStorage] Validando storage para ${tokenType}...`);
    
    // Se há token mas está vazio ou inválido, limpa APENAS o token do tipo solicitado
    if (token === '' || token === 'null' || token === 'undefined') {
      console.warn(`[validateAndCleanStorage] Token ${tokenType} corrompido, limpando apenas este tipo...`);
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(refreshTokenKey);
      
      // IMPORTANTE: Não remove dados de outros tipos de usuário
      if (tokenType === 'aluno') {
        localStorage.removeItem('alunoData');
      } else {
        localStorage.removeItem('userData');
      }
      return false;
    }
    
    // Se há refresh token mas está vazio ou inválido, limpa apenas este refresh token
    if (refreshToken === '' || refreshToken === 'null' || refreshToken === 'undefined') {
      console.warn(`[validateAndCleanStorage] Refresh token ${tokenType} corrompido, limpando apenas este tipo...`);
      localStorage.removeItem(refreshTokenKey);
    }
    
    // Verifica se o token é válido estruturalmente (tem formato JWT)
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

// Função para renovar o token com retry e backoff
const refreshToken = async (tokenType: TokenType, retryAttempt: number = 0): Promise<string | null> => {
  // Valida e limpa storage corrompido antes de tentar renovar
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
      
      // Se for erro 5xx e ainda temos tentativas, faz retry com backoff
      if (response.status >= 500 && retryAttempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(retryAttempt);
        console.log(`[refreshToken] Erro ${response.status}, tentativa ${retryAttempt + 1}/${RETRY_CONFIG.maxRetries + 1} em ${delay}ms`);
        await sleep(delay);
        return refreshToken(tokenType, retryAttempt + 1);
      }
      
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
    
    // Se for erro de rede e ainda temos tentativas, faz retry com backoff
    if (retryAttempt < RETRY_CONFIG.maxRetries) {
      const delay = calculateBackoffDelay(retryAttempt);
      console.log(`[refreshToken] Erro de rede, tentativa ${retryAttempt + 1}/${RETRY_CONFIG.maxRetries + 1} em ${delay}ms`);
      await sleep(delay);
      return refreshToken(tokenType, retryAttempt + 1);
    }
    
    return null;
  }
};

// Função interna para fetchWithAuth com retry para erros 500
const fetchWithAuthInternal = async <T = any>(
  url: string,
  options: RequestInit = {},
  tokenType: TokenType = 'personalAdmin',
  retryAttempt: number = 0
): Promise<T> => {
  // Valida e limpa storage corrompido antes de fazer a requisição
  if (!url.startsWith('/api/auth/')) {
    validateAndCleanStorage(tokenType);
  }

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
          // Check if 403 is a business logic error that shouldn't trigger auth-failed
          const isBusinessLogicError = response.status === 403 && errorCode && [
            'STUDENT_LIMIT_EXCEEDED',
            'STUDENT_NOT_FOUND', 
            'VALIDATION_SERVICE_ERROR',
            'INSUFFICIENT_TOKENS',
            'NO_SUITABLE_TOKEN',
            'INTERNAL_ERROR'
          ].includes(errorCode);
          
          // For business logic 403 errors, throw regular Error instead of AuthError
          if (isBusinessLogicError) {
            throw new Error(errorMessage);
          }
          
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
              // Para 403 de autorização real ou rotas públicas, comportamento original
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
      
      // Tratamento específico para erros 500 (servidor) com retry e backoff
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

// A função agora aceita um terceiro parâmetro 'tokenType'
export const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {},
    tokenType: TokenType = 'personalAdmin'
  ): Promise<T> => {

    try {
      return await fetchWithAuthInternal<T>(url, options, tokenType);
    } catch (error: any) {
      // Se for erro 500 e ainda temos tentativas, faz retry com backoff
      if (error?.isServerError && error?.status >= 500) {
        console.log(`[fetchWithAuth] Erro ${error.status} detectado para ${url}, implementando retry com backoff`);
        
        for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
          try {
            const delay = calculateBackoffDelay(attempt);
            console.log(`[fetchWithAuth] Tentativa ${attempt + 1}/${RETRY_CONFIG.maxRetries} em ${delay}ms`);
            await sleep(delay);
            
            return await fetchWithAuthInternal<T>(url, options, tokenType, attempt + 1);
          } catch (retryError: any) {
            if (attempt === RETRY_CONFIG.maxRetries - 1) {
              // Última tentativa falhou, lança o erro original
              console.error(`[fetchWithAuth] Todas as tentativas falharam para ${url}`);
              throw error;
            }
            // Se não for erro 500, não continua tentando
            if (!retryError?.isServerError || retryError?.status < 500) {
              throw retryError;
            }
          }
        }
      }
      
      throw error;
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
