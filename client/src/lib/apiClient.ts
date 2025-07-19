// client/src/lib/apiClient.ts

export const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    
    let token: string | null = null;
    let tokenTypeUsed: 'aluno' | 'personalAdmin' | 'none' = 'none';
    const isPublicAuthRoute = url.startsWith('/api/auth/');

    if (!isPublicAuthRoute) {
        // <<< CORREÇÃO DEFINITIVA E MAIS SIMPLES >>>
        // A regra é: Se o token de aluno existir, ele tem prioridade para as rotas que pode acessar.
        // Se não, tentamos o token do personal. Isso cobre todos os casos.

        const alunoToken = localStorage.getItem('alunoAuthToken');
        const personalToken = localStorage.getItem('authToken');

        // Rotas que são EXCLUSIVAS e devem usar o token de ALUNO
        const alunoExclusiveRoutes = [
            '/api/aluno/meus-treinos',
            '/api/aluno/minhas-sessoes',
            '/api/sessions/aluno/', // cobre /concluir-dia, /feedback, etc.
            '/api/sessions/concluir-dia' // Adicionando a rota exata por segurança
        ];

        // Verifica se a URL corresponde a alguma das rotas exclusivas do aluno
        const isAlunoRoute = alunoExclusiveRoutes.some(route => url.startsWith(route));

        if (isAlunoRoute) {
            token = alunoToken;
            tokenTypeUsed = "aluno";
        } else {
            // Para todas as outras rotas, usa o token do personal/admin
            token = personalToken;
            tokenTypeUsed = "personalAdmin";
        }
    }
  
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
  
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (!isPublicAuthRoute) {
      console.warn(`[fetchWithAuth] Nenhum token encontrado para a rota protegida '${url}' (tipo esperado: ${tokenTypeUsed})`);
    }
  
    if (options.body && typeof options.body === 'string') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    }
  
    try {
      const response = await fetch(url, { ...options, headers });
  
      if (response.status === 204) return null as T; 
  
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