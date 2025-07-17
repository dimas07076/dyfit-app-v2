// client/src/lib/apiClient.ts

export const fetchWithAuth = async <T = any>(
    url: string, // A URL recebida já deve ser o caminho da API, ex: '/api/auth/login'
    options: RequestInit = {}
  ): Promise<T> => {
    
    // --- LÓGICA DE URL COMPLETAMENTE REMOVIDA ---
    // A função 'fetch' usará o caminho relativo 'url' diretamente.
    // Isso força o navegador a fazer a requisição para o mesmo domínio do site,
    // o que é o comportamento correto para o proxy (dev) e para a Vercel (prod).
    // A variável 'fullUrl' foi removida.
    
    let token: string | null = null;
    let tokenTypeUsed: string = "Nenhum";
  
    // --- LÓGICA DE SELEÇÃO DE TOKEN (sem alterações) ---
    if (
        url.startsWith('/api/aluno/') && 
        !url.startsWith('/api/aluno/gerenciar') &&
        !url.startsWith('/api/aluno/convite')
    ) {
      token = localStorage.getItem('alunoAuthToken');
      tokenTypeUsed = "alunoAuthToken";
    } else {
      token = localStorage.getItem('authToken');
      tokenTypeUsed = "authToken";
    }
  
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
  
    // O console.log foi removido para não poluir o console de produção.
  
    try {
      // A chamada 'fetch' agora usa 'url' diretamente.
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
              forAluno: tokenTypeUsed === 'alunoAuthToken',
              forPersonalAdmin: tokenTypeUsed === 'authToken'
            } 
          }));
        }
        
        const errorMessage = data?.message || data?.mensagem || data?.erro || `Erro ${response.status}: ${response.statusText || 'Ocorreu um erro na comunicação.'}`;
        throw new Error(errorMessage);
      }
      return data as T;
  
    } catch (error) {
      // O erro 'Failed to fetch' (net::ERR_CONNECTION_REFUSED) acontece aqui.
      console.error(`[fetchWithAuth] Erro de rede para a rota '${url}':`, error);
      if (error instanceof Error) {
        // Para dar uma mensagem mais clara ao usuário em caso de falha de conexão.
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
        }
        throw error; 
      } else {
        throw new Error('Erro desconhecido durante a requisição.');
      }
    }
  };