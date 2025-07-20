// client/src/lib/apiClient.ts

export const fetchWithAuth = async <T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {

    let token: string |
 null = null;
    let tokenTypeUsed: 'aluno' | 'personalAdmin' | 'none' = 'none';
    const isPublicAuthRoute = url.startsWith('/api/auth/');
 if (!isPublicAuthRoute) {
        // <<< ALTERAÇÃO: Adicionada a rota do histórico à lista de rotas do aluno >>>
        const alunoExclusiveRoutes = [
            '/api/aluno/meus-treinos',
            '/api/aluno/minhas-sessoes',
            '/api/aluno/meu-historico-sessoes', // <-- ROTA ADICIONADA AQUI
            '/api/sessions/aluno/concluir-dia', 
            '/api/sessions/aluno/',             
            '/api/sessions/'                    
        ];
        // <<< FIM DA ALTERAÇÃO >>>

        const isAlunoRoute = alunoExclusiveRoutes.some(route => url.startsWith(route));
 if (isAlunoRoute) {
            token = localStorage.getItem('alunoAuthToken');
            tokenTypeUsed = "aluno";
 } else {
            token = localStorage.getItem('authToken');
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
        if (response.status === 401 || response.status === 403) {
            window.dispatchEvent(new CustomEvent('auth-failed', { 
              detail: { 
                status: response.status,
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