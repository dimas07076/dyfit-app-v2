// client/src/lib/apiClient.ts

export const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    
    const token = localStorage.getItem('authToken');
    // <<< REMOÇÃO: Variável não utilizada foi removida daqui >>>
    // const tokenTypeUsed = "authToken";
  
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
  
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  
    if (options.body && typeof options.body === 'string') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
  
      if (response.status === 204) {
        return null as T; 
      }
  
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        throw new Error(`Erro ${response.status}: Resposta inválida do servidor (não é JSON).`);
      }
      
      if (!response.ok) {
        if (response.status === 401) {
            window.dispatchEvent(new CustomEvent('auth-failed', { 
              detail: { 
                status: 401,
                forAluno: false, 
                forPersonalAdmin: true
              } 
            }));
        }
        
        const errorMessage = data?.message || data?.mensagem || data?.erro || `Erro ${response.status}: ${response.statusText || 'Ocorreu um erro na comunicação.'}`;
        throw new Error(errorMessage);
      }
      return data as T;
  
    } catch (error) {
      console.error(`[fetchWithAuth] Erro de rede para a rota '${url}':`, error);
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