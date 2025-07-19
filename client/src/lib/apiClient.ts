// client/src/lib/apiClient.ts

export const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    
    let token: string | null = null;
    let tokenTypeUsed: 'aluno' | 'personalAdmin' | 'none' = 'none';

    // <<< CORREÇÃO DEFINITIVA: Lógica de seleção de token restaurada e corrigida >>>
    // Verifica se a rota é específica da área logada do aluno.
    if (
        url.startsWith('/api/aluno/') && 
        !url.startsWith('/api/aluno/gerenciar') &&
        !url.startsWith('/api/aluno/convite')
    ) {
      token = localStorage.getItem('alunoAuthToken');
      tokenTypeUsed = "aluno";
    } else {
      // Para todas as outras rotas (personal, admin, etc.), usa o authToken principal.
      token = localStorage.getItem('authToken');
      tokenTypeUsed = "personalAdmin";
    }
  
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
  
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn(`[fetchWithAuth] Nenhum token encontrado para a rota '${url}' (tipo esperado: ${tokenTypeUsed})`);
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
                // Informa corretamente qual contexto falhou
                forAluno: tokenTypeUsed === 'aluno', 
                forPersonalAdmin: tokenTypeUsed === 'personalAdmin'
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