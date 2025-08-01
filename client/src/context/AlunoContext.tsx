// client/src/context/AlunoContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient'; // ← CORREÇÃO: Import correto

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

const AlunoContext = createContext<AlunoContextType | undefined>(undefined);

export const useAluno = () => {
  const context = useContext(AlunoContext);
  if (context === undefined) {
    throw new Error('useAluno must be used within an AlunoProvider');
  }
  return context;
};

export const AlunoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aluno, setAluno] = useState<AlunoLogado | null>(null);
  const [tokenAluno, setTokenAluno] = useState<string | null>(null);
  const [isLoadingAluno, setIsLoadingAluno] = useState<boolean>(false);
  const [lastValidationTime, setLastValidationTime] = useState<number>(0);
  const [refreshAttempts, setRefreshAttempts] = useState<number>(0); // Contador de tentativas de refresh
  const [, setLocationWouter] = useLocation();
  const [location] = useLocation();

  const ALUNO_TOKEN_KEY = 'alunoAuthToken';
  const ALUNO_DATA_KEY = 'alunoData';
  const ALUNO_REFRESH_TOKEN_KEY = 'alunoRefreshToken'; // Nova chave para o refresh token
  const VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const MAX_REFRESH_ATTEMPTS = 3; // Máximo de tentativas de refresh consecutivas
  const REFRESH_COOLDOWN = 60 * 1000; // 1 minuto de cooldown após falhas

  // 🔥 NOVA FUNÇÃO: Verifica se a rota atual é pública
  const isPublicRoute = useCallback((path: string) => {
    const publicRoutes = [
      '/convite/aluno/',
      '/convite/personal/',
      '/login',
      '/aluno/login',
      '/cadastrar-',
      '/',
      '/demo'
    ];
    
    return publicRoutes.some(route => path.includes(route) || path === '/');
  }, []);

  // 🔥 NOVA FUNÇÃO: Verifica se deve executar verificações de autenticação
  const shouldSkipAuthCheck = useCallback(() => {
    const currentPath = location;
    const isPublic = isPublicRoute(currentPath);
    
    if (isPublic) {
      console.log(`[AlunoContext] Pulando verificações de auth - rota pública: ${currentPath}`);
      return true;
    }
    
    return false;
  }, [location, isPublicRoute]);

  const logoutAluno = useCallback((options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect ?? true;
    console.log("[AlunoContext] Iniciando logout do aluno...");
    setAluno(null);
    setTokenAluno(null);
    setRefreshAttempts(0); // Reset contador de tentativas
    localStorage.removeItem(ALUNO_TOKEN_KEY);
    localStorage.removeItem(ALUNO_DATA_KEY);
    localStorage.removeItem(ALUNO_REFRESH_TOKEN_KEY); // Remover refresh token também
    console.log("[AlunoContext] Dados de sessão do aluno removidos do localStorage.");
    
    if (shouldRedirect && !shouldSkipAuthCheck()) {
        // Check if route restoration is in progress
        const restaurandoRota = localStorage.getItem("restaurandoRota");
        if (restaurandoRota) {
          console.log("[AlunoContext] Route restoration in progress, delaying logout redirect");
          // Wait longer for route restoration to complete before redirecting
          setTimeout(() => {
            if (!localStorage.getItem("restaurandoRota")) {
              console.log("[AlunoContext] Redirecionando para /login (hub) após logout do Aluno.");
              setLocationWouter("/login");
            } else {
              console.log("[AlunoContext] Route restoration still active, skipping logout redirect");
            }
          }, 2000); // Increased delay to 2 seconds
        } else {
          console.log("[AlunoContext] Redirecionando para /login (hub) após logout do Aluno.");
          setLocationWouter("/login");
        }
    }
  }, [setLocationWouter, shouldSkipAuthCheck]);

  const setAlunoFromToken = useCallback((token: string): AlunoLogado | null => {
    try {
      console.log("[AlunoContext] Tentando decodificar token de aluno...");
      const decodedToken = jwtDecode<AlunoLogado>(token);
      if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
        console.warn("Contexto Aluno: Token de aluno expirado ao tentar decodificar. Expirou em:", new Date(decodedToken.exp * 1000));
        logoutAluno({ redirect: false });
        return null;
      }
      
      if (decodedToken.id && decodedToken.role === 'aluno') {
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
        console.log("[AlunoContext] Aluno logado com sucesso:", alunoData.nome, "(ID:", alunoData.id, ")");
        return alunoData;
      } else {
        console.error("Contexto Aluno: Payload do token de aluno inválido ou faltando 'id'/'role'. Payload:", decodedToken);
        logoutAluno({ redirect: false });
        return null;
      }
    } catch (error) {
      console.error("Contexto Aluno: Erro ao decodificar token de aluno:", error);
      logoutAluno({ redirect: false });
      return null;
    }
  }, [logoutAluno]);

  // Função para renovar o token do aluno com controle de tentativas
  const refreshAlunoToken = useCallback(async (): Promise<boolean> => {
    // 🔥 OTIMIZAÇÃO: Não executa refresh em rotas públicas
    if (shouldSkipAuthCheck()) {
      console.log("[AlunoContext] Pulando refresh token - rota pública");
      return false;
    }

    // Verifica se já tentamos renovar muitas vezes recentemente
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      const lastAttemptKey = 'alunoLastRefreshAttempt';
      const lastAttempt = localStorage.getItem(lastAttemptKey);
      const lastAttemptTime = lastAttempt ? parseInt(lastAttempt) : 0;
      const now = Date.now();
      
      if (now - lastAttemptTime < REFRESH_COOLDOWN) {
        console.warn(`[AlunoContext] Muitas tentativas de refresh (${refreshAttempts}). Aguardando cooldown.`);
        return false;
      } else {
        // Reset do contador após cooldown
        setRefreshAttempts(0);
        localStorage.removeItem(lastAttemptKey);
      }
    }

    const refreshToken = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
    console.log("[AlunoContext] refreshAlunoToken: Verificando refresh token. Existe:", !!refreshToken);

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
        setAlunoFromToken(response.token);
        setRefreshAttempts(0); // Reset contador em caso de sucesso
        localStorage.removeItem('alunoLastRefreshAttempt');
        console.log("[AlunoContext] Token de aluno renovado com sucesso! Novo token gerado.");
        return true;
      }
      console.warn("[AlunoContext] Resposta de refresh token inválida:", response);
      return false;
    } catch (error: any) { // Capturar erro como 'any' para acessar 'message'
      console.error("[AlunoContext] Falha ao renovar token do aluno. Erro:", error.message || error);
      
      // Se atingiu o limite de tentativas, força logout
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.error("[AlunoContext] Limite de tentativas de refresh atingido. Forçando logout.");
        logoutAluno();
      }
      
      return false;
    }
  }, [logoutAluno, setAlunoFromToken, refreshAttempts, shouldSkipAuthCheck]);

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
    // 🔥 OTIMIZAÇÃO: Não executa verificação em rotas públicas
    if (shouldSkipAuthCheck()) {
      console.log("[AlunoContext] Pulando checkAlunoSession - rota pública");
      setIsLoadingAluno(false);
      return;
    }

    console.log("[AlunoContext] checkAlunoSession: Verificando sessão do aluno...");
    setIsLoadingAluno(true);
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
            setIsLoadingAluno(false);
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
    setIsLoadingAluno(false);
    console.log("[AlunoContext] checkAlunoSession: Verificação de sessão concluída. isLoadingAluno:", false);
  }, [setAlunoFromToken, refreshAlunoToken, logoutAluno, shouldSkipAuthCheck]);

  // 🔥 OTIMIZAÇÃO: useEffect inicial agora verifica se deve executar
  useEffect(() => {
    if (!shouldSkipAuthCheck()) {
      console.log("[AlunoContext] useEffect (montagem inicial): Chamando checkAlunoSession().");
      checkAlunoSession();
    } else {
      console.log("[AlunoContext] useEffect (montagem inicial): Pulando checkAlunoSession - rota pública.");
    }
    // Initial check on mount
  }, [checkAlunoSession, shouldSkipAuthCheck]); // Adicionado shouldSkipAuthCheck como dependência

  // Checa a cada 5 minutos se o token está próximo de expirar e tenta renovar
  useEffect(() => {
    // 🔥 OTIMIZAÇÃO: Não configura intervalo em rotas públicas
    if (shouldSkipAuthCheck()) {
      console.log("[AlunoContext] useEffect (intervalo de refresh): Pulando configuração - rota pública.");
      return;
    }

    console.log("[AlunoContext] useEffect (intervalo de refresh): Configurando intervalo.");
    const interval = setInterval(() => {
      if (tokenAluno && !shouldSkipAuthCheck()) {
        try {
          const decodedToken = jwtDecode<AlunoLogado>(tokenAluno);
          const expiresIn = decodedToken.exp ? decodedToken.exp * 1000 - Date.now() : 0;
          console.log("[AlunoContext] Intervalo de refresh: Token expira em (ms):", expiresIn);
          // Se o token expirar em menos de 10 minutos (600000 ms), tenta renovar
          if (expiresIn > 0 && expiresIn < 10 * 60 * 1000) {
            console.log("[AlunoContext] Token de aluno próximo de expirar (intervalo). Tentando renovar...");
            refreshAlunoToken();
          } else if (expiresIn <= 0) {
            console.warn("[AlunoContext] Token de aluno já expirado (intervalo). Forçando logout.");
            logoutAluno();
          } else {
            console.log("[AlunoContext] Token de aluno ainda válido (intervalo). Próxima verificação em 5min.");
          }
        } catch (error) {
          console.error("[AlunoContext] Erro ao verificar expiração do token no intervalo:", error);
          logoutAluno();
        }
      } else {
        console.log("[AlunoContext] Intervalo de refresh: Nenhum token de aluno ativo ou rota pública. Pulando verificação.");
      }
    }, 5 * 60 * 1000); // Roda a cada 5 minutos

    return () => {
      console.log("[AlunoContext] useEffect (intervalo de refresh): Limpando intervalo.");
      clearInterval(interval);
    };
  }, [tokenAluno, refreshAlunoToken, logoutAluno, shouldSkipAuthCheck]);

  useEffect(() => {
    console.log("[AlunoContext] useEffect (storage change): Configurando listener.");
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ALUNO_TOKEN_KEY && event.newValue === null) {
        console.log("[AlunoContext] StorageEvent: Token de acesso removido. Forçando logout.");
        logoutAluno();
      }
      if (event.key === ALUNO_REFRESH_TOKEN_KEY && event.newValue === null) {
        console.log("[AlunoContext] StorageEvent: Refresh token removido. Forçando logout.");
        logoutAluno();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      console.log("[AlunoContext] useEffect (storage change): Removendo listener.");
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [logoutAluno]);
  
  useEffect(() => {
    console.log("[AlunoContext] useEffect (auth-failed event): Configurando listener.");
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[AlunoContext] Evento 'auth-failed' recebido. Detalhes:", customEvent.detail);
      if (customEvent.detail && customEvent.detail.status === 401) {
        if (customEvent.detail.forAluno && aluno) {
          console.warn("[AlunoContext] Falha de autenticação (401) para Aluno detectada. Tentando renovar token ou fazendo logout...");
          refreshAlunoToken(); // Tenta renovar antes de deslogar
        }
      }
    };
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => {
      console.log("[AlunoContext] useEffect (auth-failed event): Removendo listener.");
      window.removeEventListener('auth-failed', handleAuthFailed);
    };
  }, [aluno, refreshAlunoToken]); // Alterado para tentar refresh antes de logout

  // --- INÍCIO DA ETAPA 3: VALIDAÇÃO PROATIVA COM CACHE INTELIGENTE ---
  useEffect(() => {
    // 🔥 OTIMIZAÇÃO: Não configura listener de visibilidade em rotas públicas
    if (shouldSkipAuthCheck()) {
      console.log("[AlunoContext] useEffect (visibility change): Pulando configuração - rota pública.");
      return;
    }

    console.log("[AlunoContext] useEffect (visibility change): Configurando listener.");
    // Esta função será chamada sempre que o estado de visibilidade da página mudar.
    const handleVisibilityChange = () => {
      // Verificamos o estado apenas quando a página se torna visível.
      if (!document.hidden && !shouldSkipAuthCheck()) {
        const now = Date.now();
        const timeSinceLastValidation = now - lastValidationTime;
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
        }
        else {
          console.log("[AlunoContext] App tornou-se visível. Cache ainda válido, pulando revalidação.");
        }
      }
    };

    // Adiciona o event listener ao documento.
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Retorna uma função de limpeza para remover o listener quando o componente for desmontado.
    // Isso evita vazamentos de memória.
    return () => {
      console.log("[AlunoContext] useEffect (visibility change): Removendo listener.");
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAlunoSession, lastValidationTime, tokenAluno, refreshAlunoToken, shouldSkipAuthCheck]); // Adicionado shouldSkipAuthCheck
  // --- FIM DA ETAPA 3 ---

  return (
    <AlunoContext.Provider value={{ aluno, tokenAluno, isLoadingAluno, loginAluno, logoutAluno, checkAlunoSession }}>
      {children}
    </AlunoContext.Provider>
  );
};