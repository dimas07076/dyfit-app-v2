// client/src/context/AlunoContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient'; // Importar apiRequest para chamadas ao backend

export interface AlunoLogado {
  id: string;
  nome: string;
  role: 'aluno';
  email: string;
  personalId?: string;
  exp?: number;
  iat?: number;
}

// Nova interface para a resposta do endpoint de refresh de aluno
interface AlunoRefreshResponse {
  message: string;
  token: string;
  aluno: AlunoLogado; // Assumindo que 'aluno' na resposta corresponde a AlunoLogado
}

interface AlunoContextType {
  aluno: AlunoLogado | null;
  tokenAluno: string | null;
  isLoadingAluno: boolean;
  loginAluno: (token: string, refreshToken: string) => void; // Adicionado refreshToken aqui
  logoutAluno: (options?: { redirect?: boolean }) => void;
  checkAlunoSession: () => void;
}

export const AlunoContext = createContext<AlunoContextType | undefined>(undefined);

export const AlunoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aluno, setAluno] = useState<AlunoLogado | null>(null);
  const [tokenAluno, setTokenAluno] = useState<string | null>(null);
  const [isLoadingAluno, setIsLoadingAluno] = useState<boolean>(true);
  const [lastValidationTime, setLastValidationTime] = useState<number>(0);
  const [refreshAttempts, setRefreshAttempts] = useState<number>(0); // Contador de tentativas de refresh
  const [isValidating, setIsValidating] = useState<boolean>(false); // NOVO: Flag para evitar validações simultâneas
  const [, setLocationWouter] = useLocation();

  const ALUNO_TOKEN_KEY = 'alunoAuthToken';
  const ALUNO_DATA_KEY = 'alunoData';
  const ALUNO_REFRESH_TOKEN_KEY = 'alunoRefreshToken'; // Nova chave para o refresh token
  const VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const MAX_REFRESH_ATTEMPTS = 3; // Máximo de tentativas de refresh consecutivas
  const REFRESH_COOLDOWN = 60 * 1000; // 1 minuto de cooldown após falhas
  const DEBOUNCE_VALIDATION_TIME = 1000; // 1 segundo de debounce para validações

  // NOVA FUNÇÃO: Verificar se é uma rota pública de convite
  const isPublicInviteRoute = useCallback((pathname?: string) => {
    const currentPath = pathname || window.location.pathname;
    return currentPath.includes('/convite/aluno/') || 
           currentPath.includes('/cadastrar-aluno/convite/') ||
           currentPath.includes('/cadastrar-personal/convite/');
  }, []);

  const logoutAluno = useCallback((options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect ?? true;
    console.log("[AlunoContext] Iniciando logout do aluno...");

    // CORREÇÃO: Não fazer logout em rotas de convite
    if (isPublicInviteRoute()) {
      console.log("[AlunoContext] Logout cancelado - rota de convite detectada:", window.location.pathname);
      return;
    }

    setAluno(null);
    setTokenAluno(null);
    setRefreshAttempts(0); // Reset contador de tentativas
    localStorage.removeItem(ALUNO_TOKEN_KEY);
    localStorage.removeItem(ALUNO_DATA_KEY);
    localStorage.removeItem(ALUNO_REFRESH_TOKEN_KEY); // Remover refresh token também
    console.log("[AlunoContext] Dados de sessão do aluno removidos do localStorage.");
    
    if (shouldRedirect) {
        // Check if route restoration is in progress
        const restaurandoRota = localStorage.getItem("restaurandoRota");
        if (restaurandoRota) {
            console.log("[AlunoContext] Restauração de rota em progresso, não redirecionando após logout do aluno.");
            return;
        }
        console.log("[AlunoContext] Redirecionando para /login (hub) após logout do Aluno.");
        setLocationWouter("/login");
    }
  }, [setLocationWouter, isPublicInviteRoute]);

  const setAlunoFromToken = useCallback((token: string): AlunoLogado | null => {
    try {
      const decodedToken = jwtDecode<AlunoLogado>(token);
      
      // CORREÇÃO: Verificar se o token está expirado antes de processar
      if (decodedToken.exp && decodedToken.exp * 1000 <= Date.now()) {
        console.warn("Contexto Aluno: Token de aluno expirado ao tentar decodificar. Expirou em:", new Date(decodedToken.exp * 1000));
        // CORREÇÃO: Não fazer logout imediatamente, tentar refresh primeiro
        return null;
      }
      
      // CORREÇÃO: Verificação mais rigorosa dos campos obrigatórios
      if (decodedToken.id && decodedToken.role === 'aluno' && decodedToken.nome && decodedToken.email) {
        const alunoData: AlunoLogado = {
          id: decodedToken.id,
          nome: decodedToken.nome,
          role: decodedToken.role,
          email: decodedToken.email,
          personalId: decodedToken.personalId,
          exp: decodedToken.exp,
          iat: decodedToken.iat,
        };
        setAluno(alunoData);
        setTokenAluno(token);
        localStorage.setItem(ALUNO_TOKEN_KEY, token);
        localStorage.setItem(ALUNO_DATA_KEY, JSON.stringify(alunoData));
        console.log("Contexto Aluno: Aluno logado com sucesso:", alunoData.nome, "(ID:", alunoData.id, ")");
        return alunoData;
      } else {
        console.error("Contexto Aluno: Payload do token de aluno inválido ou faltando campos obrigatórios. Payload:", decodedToken);
        // CORREÇÃO: Não fazer logout imediatamente se for apenas campos faltando
        return null;
      }
    } catch (error) {
      console.error("Contexto Aluno: Erro ao decodificar token de aluno:", error);
      // CORREÇÃO: Não fazer logout imediatamente em caso de erro de decodificação
      return null;
    }
  }, []); // Removida dependência de logoutAluno para evitar loops
  
  // Função para renovar o token do aluno com controle de tentativas
  const refreshAlunoToken = useCallback(async (): Promise<boolean> => {
    // CORREÇÃO: Verificar se já está validando para evitar execuções simultâneas
    if (isValidating) {
      console.log("[AlunoContext] refreshAlunoToken: Validação já em andamento, pulando refresh...");
      return false;
    }

    // CORREÇÃO: Não tentar refresh em rotas de convite
    if (isPublicInviteRoute()) {
      console.log("[AlunoContext] Refresh cancelado - rota de convite detectada:", window.location.pathname);
      return false;
    }

    console.log("[AlunoContext] refreshAlunoToken: Verificando refresh token. Existe:", !!localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY));
    const refreshToken = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      console.log("[AlunoContext] Nenhum refresh token de aluno encontrado. Realizando logout.");
      logoutAluno();
      return false;
    }

    try {
      console.log("[AlunoContext] Tentando renovar token do aluno via API...");
      setRefreshAttempts(prev => prev + 1);
      localStorage.setItem('alunoLastRefreshAttempt', Date.now().toString());
      
      // Tipagem explícita da resposta da apiRequest
      const response = await apiRequest('POST', '/api/auth/aluno/refresh', { refreshToken }, 'aluno') as AlunoRefreshResponse;
      if (response.token && response.aluno) {
        // CORREÇÃO: Usar função melhorada para definir token
        const alunoData = setAlunoFromToken(response.token);
        if (alunoData) {
          setRefreshAttempts(0); // Reset contador em caso de sucesso
          localStorage.removeItem('alunoLastRefreshAttempt');
          console.log("[AlunoContext] Token de aluno renovado com sucesso! Novo token gerado.");
          return true;
        } else {
          console.error("[AlunoContext] Falha ao processar o novo token recebido durante refresh.");
          logoutAluno();
          return false;
        }
      } else {
        console.error("[AlunoContext] Resposta inválida do servidor durante refresh de aluno:", response);
        logoutAluno();
        return false;
      }
    } catch (error) {
      console.error("[AlunoContext] Erro ao renovar token do aluno:", error);
      
      // CORREÇÃO: Controle de tentativas com cooldown
      const lastAttempt = localStorage.getItem('alunoLastRefreshAttempt');
      const timeSinceLastAttempt = lastAttempt ? Date.now() - parseInt(lastAttempt) : Infinity;
      
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS || timeSinceLastAttempt < REFRESH_COOLDOWN) {
        console.warn("[AlunoContext] Muitas tentativas de refresh ou muito cedo para nova tentativa. Fazendo logout.");
        logoutAluno();
      }
      return false;
    }
  }, [setAlunoFromToken, logoutAluno, refreshAttempts, MAX_REFRESH_ATTEMPTS, REFRESH_COOLDOWN, isValidating, isPublicInviteRoute]);

  const loginAluno = useCallback((token: string, refreshToken: string) => {
    console.log("[AlunoContext] Iniciando login do aluno...");
    setIsLoadingAluno(true);
    setRefreshAttempts(0); // Reset contador ao fazer novo login
    setAlunoFromToken(token);
    localStorage.setItem(ALUNO_REFRESH_TOKEN_KEY, refreshToken); // Salvar o refresh token
    localStorage.removeItem('alunoLastRefreshAttempt'); // Limpa tentativas anteriores
    console.log("[AlunoContext] Refresh token de aluno salvo.");
    setIsLoadingAluno(false);
  }, [setAlunoFromToken]);

  const checkAlunoSession = useCallback(async () => { // Tornar assíncrona
    // CORREÇÃO: Adicionar debounce e verificação de validação em andamento
    if (isValidating) {
      console.log("[AlunoContext] checkAlunoSession: Validação já em andamento, pulando...");
      return;
    }

    // CORREÇÃO: Não verificar sessão em rotas de convite
    if (isPublicInviteRoute()) {
      console.log("[AlunoContext] Verificação de sessão cancelada - rota de convite detectada:", window.location.pathname);
      setIsLoadingAluno(false);
      return;
    }

    console.log("[AlunoContext] checkAlunoSession: Verificando sessão do aluno...");
    setIsValidating(true);
    setIsLoadingAluno(true);

    try {
      const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
      console.log("[AlunoContext] checkAlunoSession: Token de acesso armazenado:", !!storedToken);

      if (storedToken) {
        try {
          const decodedToken = jwtDecode<AlunoLogado>(storedToken);
          const expiresIn = decodedToken.exp ? decodedToken.exp * 1000 - Date.now() : 0;
          console.log("[AlunoContext] checkAlunoSession: Token expira em (ms):", expiresIn);

          // Se o token estiver expirado ou expirar em menos de 1 minuto, tenta renovar
          if (expiresIn <= 60 * 1000) { // 1 minuto
            console.log("[AlunoContext] Token de aluno expirado ou próximo de expirar. Tentando renovar...");
            const refreshed = await refreshAlunoToken();
            if (!refreshed) {
              console.log("[AlunoContext] Falha na renovação durante checkAlunoSession. Encerrando sessão.");
              return;
            }
          } else {
            setAlunoFromToken(storedToken);
            console.log("[AlunoContext] Token de aluno válido e ativo.");
          }
        } catch (error) {
          console.error("[AlunoContext] Erro ao decodificar token armazenado durante checkAlunoSession:", error);
          logoutAluno();
        }
      } else {
        // Se não há token de acesso, tenta renovar com refresh token
        console.log("[AlunoContext] Nenhum token de acesso encontrado. Tentando renovar com refresh token...");
        await refreshAlunoToken();
      }
      setLastValidationTime(Date.now());
    } finally {
      setIsLoadingAluno(false);
      setIsValidating(false);
      console.log("[AlunoContext] checkAlunoSession: Verificação de sessão concluída. isLoadingAluno:", false);
    }
  }, [setAlunoFromToken, refreshAlunoToken, logoutAluno, isValidating, isPublicInviteRoute]);

  useEffect(() => {
    console.log("[AlunoContext] useEffect (montagem inicial): Chamando checkAlunoSession().");
    checkAlunoSession();
  }, [checkAlunoSession]);

  // --- INÍCIO DA ETAPA 2: REFRESH AUTOMÁTICO ---
  useEffect(() => {
    console.log("[AlunoContext] useEffect (intervalo de refresh): Configurando intervalo.");
    const refreshInterval = setInterval(() => {
      // CORREÇÃO: Não executar refresh automático em rotas de convite
      if (isPublicInviteRoute()) {
        console.log("[AlunoContext] Refresh automático cancelado - rota de convite detectada");
        return;
      }

      // CORREÇÃO: Só executa se há token e não está validando
      if (tokenAluno && !isValidating) {
        try {
          const decodedToken = jwtDecode<AlunoLogado>(tokenAluno);
          const expiresIn = decodedToken.exp ? decodedToken.exp * 1000 - Date.now() : 0;
          console.log("[AlunoContext] Intervalo de refresh: Token expira em (ms):", expiresIn);
          
          // Renovar quando restam menos de 2 minutos
          if (expiresIn <= 2 * 60 * 1000 && expiresIn > 0) {
            console.log("[AlunoContext] Intervalo de refresh: Renovando token proativamente...");
            refreshAlunoToken();
          }
        } catch (error) {
          console.error("[AlunoContext] Erro ao verificar expiração durante intervalo de refresh:", error);
        }
      }
    }, 60 * 1000); // Verificar a cada minuto

    return () => {
      console.log("[AlunoContext] useEffect (intervalo de refresh): Limpando intervalo.");
      clearInterval(refreshInterval);
    };
  }, [tokenAluno, refreshAlunoToken, isValidating, isPublicInviteRoute]);

  // --- INÍCIO DA ETAPA 2.5: ARMAZENAMENTO LOCAL ---
  useEffect(() => {
    console.log("[AlunoContext] useEffect (storage change): Configurando listener.");
    const handleStorageChange = (event: StorageEvent) => {
      // CORREÇÃO: Não processar mudanças de storage em rotas de convite
      if (isPublicInviteRoute()) {
        console.log("[AlunoContext] Storage change ignorado - rota de convite detectada");
        return;
      }

      // Se o token do aluno foi removido em outra aba
      if (event.key === ALUNO_TOKEN_KEY && !event.newValue && aluno) {
        console.log("[AlunoContext] Token de aluno removido em outra aba. Fazendo logout local.");
        setAluno(null);
        setTokenAluno(null);
      }
      // Se um novo token foi definido em outra aba
      else if (event.key === ALUNO_TOKEN_KEY && event.newValue && !aluno) {
        console.log("[AlunoContext] Novo token de aluno detectado em outra aba. Atualizando sessão.");
        setAlunoFromToken(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      console.log("[AlunoContext] useEffect (storage change): Removendo listener.");
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [aluno, setAlunoFromToken, isPublicInviteRoute]);

  // --- INÍCIO DA ETAPA 2.6: EVENT LISTENER PARA AUTH-FAILED ---
  useEffect(() => {
    console.log("[AlunoContext] useEffect (auth-failed event): Configurando listener.");
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[AlunoContext] Evento 'auth-failed' recebido. Detalhes:", customEvent.detail);
      
      // CORREÇÃO: Verificar se o evento é realmente para aluno antes de processar
      if (customEvent.detail && customEvent.detail.forAluno && customEvent.detail.status === 401) {
        // CORREÇÃO: Só processa se realmente há um aluno logado e não está validando
        if (aluno && !isValidating) {
          console.warn("[AlunoContext] Falha de autenticação (401) para Aluno detectada. Tentando renovar token ou fazendo logout...");
          
          // CORREÇÃO: Tentar renovar apenas se não houve muitas tentativas recentes
          if (refreshAttempts < MAX_REFRESH_ATTEMPTS) {
            refreshAlunoToken(); // Tenta renovar antes de deslogar
          } else {
            console.warn("[AlunoContext] Muitas tentativas de refresh, forçando logout.");
            logoutAluno();
          }
        } else if (!aluno) {
          console.log("[AlunoContext] Evento auth-failed recebido, mas nenhum aluno logado. Ignorando.");
        } else {
          console.log("[AlunoContext] Evento auth-failed recebido, mas validação em andamento. Ignorando para evitar conflito.");
        }
      } else if (customEvent.detail && !customEvent.detail.forAluno) {
        console.log("[AlunoContext] Evento auth-failed não é para aluno, ignorando.");
      }
    };
    
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => {
      console.log("[AlunoContext] useEffect (auth-failed event): Removendo listener.");
      window.removeEventListener('auth-failed', handleAuthFailed);
    };
  }, [aluno, refreshAlunoToken, logoutAluno, isValidating, refreshAttempts, MAX_REFRESH_ATTEMPTS]); // Adicionadas dependências necessárias

  // --- INÍCIO DA ETAPA 3: VALIDAÇÃO PROATIVA COM CACHE INTELIGENTE E DEBOUNCE ---
  useEffect(() => {
    console.log("[AlunoContext] useEffect (visibility change): Configurando listener.");
    let debounceTimer: NodeJS.Timeout | null = null;
    
    // Esta função será chamada sempre que o estado de visibilidade da página mudar.
    const handleVisibilityChange = () => {
      // Verificamos o estado apenas quando a página se torna visível.
      if (document.visibilityState === 'visible') {
        // CORREÇÃO: Limpar timer anterior se existir
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // CORREÇÃO: Implementar debounce para evitar validações excessivas
        debounceTimer = setTimeout(() => {
          // Check if route restoration is in progress - if so, delay validation significantly
          const restaurandoRota = localStorage.getItem("restaurandoRota");
          if (restaurandoRota) {
            console.log("[AlunoContext] App tornou-se visível, mas restauração de rota em progresso. Adiando validação...");
            return;
          }

          // CORREÇÃO: Não validar em rotas de convite
          if (isPublicInviteRoute()) {
            console.log("[AlunoContext] App tornou-se visível, mas em rota de convite. Pulando validação.");
            return;
          }

          // CORREÇÃO: Verificar se não está validando para evitar execuções simultâneas
          if (isValidating) {
            console.log("[AlunoContext] App tornou-se visível, mas validação já em andamento. Pulando...");
            return;
          }
          
          const timeSinceLastValidation = Date.now() - lastValidationTime;
          console.log("[AlunoContext] App tornou-se visível. Tempo desde última validação (ms):", timeSinceLastValidation);
          console.log("[AlunoContext] App tornou-se visível. Token atual:", !!tokenAluno);
          
          // Só revalida se passou do tempo de cache ou se nunca foi validado
          // E se o token atual não for nulo, para evitar loop de refresh sem token
          if ((timeSinceLastValidation > VALIDATION_CACHE_DURATION || lastValidationTime === 0) && tokenAluno) {
            console.log("[AlunoContext] App tornou-se visível. Revalidando a sessão do aluno... (cache expirado ou primeira validação)");
            checkAlunoSession();
          } else if (!tokenAluno) {
            // Se não há token, tenta renovar com refresh token (caso tenha sido removido por algum motivo)
            console.log("[AlunoContext] App tornou-se visível, mas sem token de acesso. Tentando renovar com refresh token...");
            refreshAlunoToken();
          } else {
            console.log("[AlunoContext] App tornou-se visível. Cache ainda válido, pulando revalidação.");
          }
        }, DEBOUNCE_VALIDATION_TIME);
      }
    };

    // Adiciona o event listener ao documento.
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Retorna uma função de limpeza para remover o listener quando o componente for desmontado.
    // Isso evita vazamentos de memória.
    return () => {
      console.log("[AlunoContext] useEffect (visibility change): Removendo listener.");
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAlunoSession, lastValidationTime, tokenAluno, refreshAlunoToken, isValidating, isPublicInviteRoute]); // Adicionado isValidating como dependência
  // --- FIM DA ETAPA 3 ---

  return (
    <AlunoContext.Provider value={{ aluno, tokenAluno, isLoadingAluno, loginAluno, logoutAluno, checkAlunoSession }}>
      {children}
    </AlunoContext.Provider>
  );
};

export const useAluno = (): AlunoContextType => {
  const context = useContext(AlunoContext);
  if (context === undefined) {
    throw new Error('useAluno deve ser usado dentro de um AlunoProvider');
  }
  return context;
};