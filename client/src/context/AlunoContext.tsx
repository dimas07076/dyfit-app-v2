// client/src/context/AlunoContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient'; // Importar apiRequest para chamadas ao backend
import { validateAndCleanStorage } from '@/utils/validateAndCleanStorage';
import { refreshTokenWithCooldown, isTokenExpired, shouldRefreshToken } from '@/utils/refreshToken';

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
    console.log("[AlunoContext] setAlunoFromToken: Processing token...");
    console.log("[AlunoContext] DEBUG - Token input:", {
      provided: !!token,
      length: token?.length,
      firstChars: token?.substring(0, 20) + "..."
    });
    
    try {
      console.log("[AlunoContext] Attempting to decode JWT token...");
      const decodedToken = jwtDecode<AlunoLogado>(token);
      console.log("[AlunoContext] Token decoded successfully:", {
        id: decodedToken.id,
        nome: decodedToken.nome,
        email: decodedToken.email,
        role: decodedToken.role,
        personalId: decodedToken.personalId,
        exp: decodedToken.exp,
        iat: decodedToken.iat,
        expiresAt: decodedToken.exp ? new Date(decodedToken.exp * 1000).toISOString() : "no expiration"
      });
      
      // CORREÇÃO: Verificar se o token está expirado antes de processar
      if (decodedToken.exp && decodedToken.exp * 1000 <= Date.now()) {
        console.warn("[AlunoContext] Token de aluno expirado ao tentar decodificar. Expirou em:", new Date(decodedToken.exp * 1000));
        console.warn("[AlunoContext] Current time:", new Date().toISOString());
        // CORREÇÃO: Não fazer logout imediatamente, tentar refresh primeiro
        return null;
      }
      
      // CORREÇÃO: Verificação mais rigorosa dos campos obrigatórios
      console.log("[AlunoContext] Validating required fields...");
      const hasRequiredFields = decodedToken.id && decodedToken.role === 'aluno' && decodedToken.nome && decodedToken.email;
      console.log("[AlunoContext] Required fields check:", {
        hasId: !!decodedToken.id,
        hasCorrectRole: decodedToken.role === 'aluno',
        hasNome: !!decodedToken.nome,
        hasEmail: !!decodedToken.email,
        allValid: hasRequiredFields
      });
      
      if (hasRequiredFields) {
        const alunoData: AlunoLogado = {
          id: decodedToken.id,
          nome: decodedToken.nome,
          role: decodedToken.role,
          email: decodedToken.email,
          personalId: decodedToken.personalId,
          exp: decodedToken.exp,
          iat: decodedToken.iat,
        };
        
        console.log("[AlunoContext] Setting aluno state and storing in localStorage...");
        setAluno(alunoData);
        setTokenAluno(token);
        
        try {
          localStorage.setItem(ALUNO_TOKEN_KEY, token);
          localStorage.setItem(ALUNO_DATA_KEY, JSON.stringify(alunoData));
          console.log("[AlunoContext] Data stored successfully in localStorage");
          
          // Verify storage was successful
          const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
          const storedData = localStorage.getItem(ALUNO_DATA_KEY);
          console.log("[AlunoContext] Storage verification:", {
            tokenStored: !!storedToken,
            dataStored: !!storedData,
            tokenMatches: storedToken === token,
            dataValid: storedData ? !!JSON.parse(storedData).id : false
          });
        } catch (storageError) {
          console.error("[AlunoContext] CRITICAL - Error storing data in localStorage:", storageError);
          // Even if storage fails, keep the in-memory state
        }
        
        console.log("[AlunoContext] Aluno logado com sucesso:", alunoData.nome, "(ID:", alunoData.id, ")");
        return alunoData;
      } else {
        console.error("[AlunoContext] Payload do token de aluno inválido ou faltando campos obrigatórios. Payload:", decodedToken);
        console.error("[AlunoContext] Missing fields details:", {
          id: !decodedToken.id ? "MISSING" : "OK",
          role: decodedToken.role !== 'aluno' ? `INVALID (${decodedToken.role})` : "OK",
          nome: !decodedToken.nome ? "MISSING" : "OK",
          email: !decodedToken.email ? "MISSING" : "OK"
        });
        // CORREÇÃO: Não fazer logout imediatamente se for apenas campos faltando
        return null;
      }
    } catch (error) {
      console.error("[AlunoContext] Erro ao decodificar token de aluno:", error);
      console.error("[AlunoContext] Token that failed to decode:", {
        length: token?.length,
        firstChars: token?.substring(0, 50),
        hasCorrectFormat: token?.includes('.') && token?.split('.').length === 3
      });
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

    // MELHORIA: Validar storage antes de tentar refresh
    const validationResult = validateAndCleanStorage('aluno');
    if (!validationResult.isValid && validationResult.tokensRemoved.length > 0) {
      console.warn("[AlunoContext] Storage corrompido detectado, limpeza realizada");
    }

    console.log("[AlunoContext] refreshAlunoToken: Verificando refresh token. Existe:", !!localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY));
    const refreshToken = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      console.log("[AlunoContext] Nenhum refresh token de aluno encontrado. Realizando logout.");
      logoutAluno();
      return false;
    }

    try {
      console.log("[AlunoContext] Tentando renovar token do aluno via nova função utilitária...");
      setRefreshAttempts(prev => prev + 1);
      
      // MELHORIA: Usar nova função utilitária com cooldown
      const newToken = await refreshTokenWithCooldown('aluno');
      
      if (newToken) {
        // CORREÇÃO: Usar função melhorada para definir token
        const alunoData = setAlunoFromToken(newToken);
        if (alunoData) {
          setRefreshAttempts(0); // Reset contador em caso de sucesso
          console.log("[AlunoContext] Token de aluno renovado com sucesso! Novo token gerado.");
          return true;
        } else {
          console.error("[AlunoContext] Falha ao processar o novo token recebido durante refresh.");
          logoutAluno();
          return false;
        }
      } else {
        console.error("[AlunoContext] Falha na renovação do token via função utilitária");
        
        // CORREÇÃO: Controle de tentativas com cooldown
        if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
          console.warn("[AlunoContext] Muitas tentativas de refresh. Fazendo logout.");
          logoutAluno();
        }
        return false;
      }
    } catch (error) {
      console.error("[AlunoContext] Erro ao renovar token do aluno:", error);
      
      // CORREÇÃO: Controle de tentativas
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.warn("[AlunoContext] Muitas tentativas de refresh ou erro crítico. Fazendo logout.");
        logoutAluno();
      }
      return false;
    }
  }, [setAlunoFromToken, logoutAluno, refreshAttempts, MAX_REFRESH_ATTEMPTS, isValidating, isPublicInviteRoute]);

  const loginAluno = useCallback((token: string, refreshToken: string) => {
    console.log("[AlunoContext] ========== LOGIN PROCESS STARTED ==========");
    console.log("[AlunoContext] Iniciando login do aluno...");
    console.log("[AlunoContext] DEBUG - Input validation:");
    console.log("  - Token provided:", !!token, "length:", token?.length);
    console.log("  - RefreshToken provided:", !!refreshToken, "length:", refreshToken?.length);
    console.log("  - Token first 20 chars:", token?.substring(0, 20) + "...");
    console.log("  - RefreshToken first 20 chars:", refreshToken?.substring(0, 20) + "...");
    
    setIsLoadingAluno(true);
    setRefreshAttempts(0); // Reset contador ao fazer novo login
    
    // CORREÇÃO: Set a flag to prevent validation from interfering with login
    console.log("[AlunoContext] Setting login in progress flag");
    localStorage.setItem('alunoLoginInProgress', 'true');
    
    // CORREÇÃO: Validate input parameters
    if (!token || token.trim() === '') {
      console.error("[AlunoContext] ERROR - Access token inválido fornecido para login");
      localStorage.removeItem('alunoLoginInProgress');
      setIsLoadingAluno(false);
      return;
    }
    
    if (!refreshToken || refreshToken.trim() === '') {
      console.error("[AlunoContext] ERROR - Refresh token inválido fornecido para login");
      localStorage.removeItem('alunoLoginInProgress');
      setIsLoadingAluno(false);
      return;
    }
    
    // Check current storage state before starting
    console.log("[AlunoContext] DEBUG - Pre-login storage state:");
    console.log("  - Current access token:", !!localStorage.getItem(ALUNO_TOKEN_KEY));
    console.log("  - Current refresh token:", !!localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY));
    console.log("  - Current user data:", !!localStorage.getItem(ALUNO_DATA_KEY));
    
    // Salvar refresh token ANTES de processar o access token
    try {
      console.log("[AlunoContext] Saving refresh token to localStorage...");
      localStorage.setItem(ALUNO_REFRESH_TOKEN_KEY, refreshToken);
      console.log("[AlunoContext] Refresh token de aluno salvo com sucesso");
      
      // Verify it was actually saved
      const verifyRefresh = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
      console.log("[AlunoContext] DEBUG - Refresh token verification:", {
        saved: !!verifyRefresh,
        length: verifyRefresh?.length,
        matches: verifyRefresh === refreshToken
      });
    } catch (error) {
      console.error("[AlunoContext] CRITICAL ERROR - Erro ao salvar refresh token:", error);
      localStorage.removeItem('alunoLoginInProgress');
      setIsLoadingAluno(false);
      return;
    }
    
    // Processar o access token
    console.log("[AlunoContext] Processing access token...");
    console.log("[AlunoContext] DEBUG - About to call setAlunoFromToken with token length:", token?.length);
    
    const alunoData = setAlunoFromToken(token);
    console.log("[AlunoContext] DEBUG - setAlunoFromToken result:", {
      success: !!alunoData,
      alunoId: alunoData?.id,
      alunoName: alunoData?.nome,
      alunoRole: alunoData?.role
    });
    
    if (!alunoData) {
      console.error("[AlunoContext] CRITICAL ERROR - Falha ao processar token de acesso durante login");
      console.error("[AlunoContext] This could be due to:");
      console.error("  - Invalid token format");
      console.error("  - Expired token");
      console.error("  - Missing required fields in token payload");
      
      // Limpar refresh token se access token é inválido
      localStorage.removeItem(ALUNO_REFRESH_TOKEN_KEY);
      localStorage.removeItem('alunoLoginInProgress');
      setIsLoadingAluno(false);
      return;
    }
    
    // Verificar se os tokens foram realmente salvos
    const savedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
    const savedRefreshToken = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
    const savedData = localStorage.getItem(ALUNO_DATA_KEY);
    
    console.log("[AlunoContext] DEBUG - Post-login storage verification:");
    console.log("  - Access token saved:", !!savedToken, "length:", savedToken?.length);
    console.log("  - Refresh token saved:", !!savedRefreshToken, "length:", savedRefreshToken?.length);
    console.log("  - User data saved:", !!savedData);
    console.log("  - User data content:", savedData ? JSON.parse(savedData) : null);
    
    // Verify tokens match what we expect
    if (savedToken !== token) {
      console.error("[AlunoContext] WARNING - Saved access token doesn't match input token!");
    }
    if (savedRefreshToken !== refreshToken) {
      console.error("[AlunoContext] WARNING - Saved refresh token doesn't match input token!");
    }
    
    // Limpar tentativas anteriores de refresh
    localStorage.removeItem('alunoLastRefreshAttempt');
    
    // Clear the login flag after a short delay to ensure everything is saved
    console.log("[AlunoContext] Scheduling login flag cleanup in 500ms...");
    setTimeout(() => {
      localStorage.removeItem('alunoLoginInProgress');
      console.log("[AlunoContext] Login flag cleared - login process complete");
      
      // Final verification after flag cleanup
      const finalToken = localStorage.getItem(ALUNO_TOKEN_KEY);
      const finalRefresh = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
      console.log("[AlunoContext] FINAL VERIFICATION after flag cleanup:");
      console.log("  - Final access token exists:", !!finalToken);
      console.log("  - Final refresh token exists:", !!finalRefresh);
    }, 500);
    
    console.log("[AlunoContext] Login do aluno concluído com sucesso");
    console.log("[AlunoContext] ========== LOGIN PROCESS FINISHED ==========");
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
    
    // CORREÇÃO: Add debug logging before setting validation state
    const preCheckToken = localStorage.getItem(ALUNO_TOKEN_KEY);
    const preCheckRefresh = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
    const preCheckData = localStorage.getItem(ALUNO_DATA_KEY);
    
    console.log("[AlunoContext] DEBUG - Pre-validation storage state:");
    console.log("  - Access token exists:", !!preCheckToken, "length:", preCheckToken?.length);
    console.log("  - Refresh token exists:", !!preCheckRefresh, "length:", preCheckRefresh?.length);
    console.log("  - User data exists:", !!preCheckData);
    
    setIsValidating(true);
    setIsLoadingAluno(true);

    try {
      // MELHORIA: Validar e limpar storage antes de verificar sessão
      const validationResult = validateAndCleanStorage('aluno');
      if (!validationResult.isValid && validationResult.tokensRemoved.length > 0) {
        console.warn("[AlunoContext] Storage corrompido detectado durante checkAlunoSession, limpeza realizada");
        console.log("[AlunoContext] DEBUG - Tokens removed during validation:", validationResult.tokensRemoved);
      }

      const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
      console.log("[AlunoContext] checkAlunoSession: Token de acesso armazenado:", !!storedToken);
      
      // CORREÇÃO: Add debug logging after validation
      const postValidationToken = localStorage.getItem(ALUNO_TOKEN_KEY);
      const postValidationRefresh = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
      const postValidationData = localStorage.getItem(ALUNO_DATA_KEY);
      
      console.log("[AlunoContext] DEBUG - Post-validation storage state:");
      console.log("  - Access token exists:", !!postValidationToken, "length:", postValidationToken?.length);
      console.log("  - Refresh token exists:", !!postValidationRefresh, "length:", postValidationRefresh?.length);
      console.log("  - User data exists:", !!postValidationData);

      if (storedToken) {
        try {
          // MELHORIA: Usar funções utilitárias para verificar expiração
          if (isTokenExpired('aluno')) {
            console.log("[AlunoContext] Token de aluno expirado. Tentando renovar...");
            const refreshed = await refreshAlunoToken();
            if (!refreshed) {
              console.log("[AlunoContext] Falha na renovação durante checkAlunoSession. Encerrando sessão.");
              return;
            }
          } else if (shouldRefreshToken('aluno', 1)) { // Renova se expira em menos de 1 minuto
            console.log("[AlunoContext] Token próximo de expirar. Renovando proativamente...");
            await refreshAlunoToken(); // Não falhamos se a renovação preventiva falha
          } else {
            setAlunoFromToken(storedToken);
            console.log("[AlunoContext] Token de aluno válido e ativo.");
          }
        } catch (error) {
          console.error("[AlunoContext] Erro ao verificar token armazenado durante checkAlunoSession:", error);
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

  // Create a stable version of checkAlunoSession for the initial mount effect
  const initialCheckAlunoSession = useCallback(async () => {
    // CORREÇÃO: Skip if login is in progress
    if (localStorage.getItem('alunoLoginInProgress') === 'true') {
      console.log("[AlunoContext] Skipping initial session check - login in progress");
      setIsLoadingAluno(false);
      return;
    }
    
    // CORREÇÃO: Não verificar sessão em rotas de convite
    if (isPublicInviteRoute()) {
      console.log("[AlunoContext] Verificação inicial de sessão cancelada - rota de convite detectada:", window.location.pathname);
      setIsLoadingAluno(false);
      return;
    }

    // Add a small delay to ensure any login process has completed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check again after delay
    if (localStorage.getItem('alunoLoginInProgress') === 'true') {
      console.log("[AlunoContext] Skipping initial session check after delay - login still in progress");
      setIsLoadingAluno(false);
      return;
    }

    console.log("[AlunoContext] initialCheckAlunoSession: Verificando sessão inicial do aluno...");
    setIsLoadingAluno(true);

    try {
      // Check storage state before validation
      const preValidationToken = localStorage.getItem(ALUNO_TOKEN_KEY);
      const preValidationRefresh = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
      const preValidationData = localStorage.getItem(ALUNO_DATA_KEY);
      
      console.log("[AlunoContext] DEBUG - Pre-validation storage in initialCheck:");
      console.log("  - Access token exists:", !!preValidationToken);
      console.log("  - Refresh token exists:", !!preValidationRefresh);
      console.log("  - User data exists:", !!preValidationData);

      // MELHORIA: Validar e limpar storage antes de verificar sessão
      const validationResult = validateAndCleanStorage('aluno');
      if (!validationResult.isValid && validationResult.tokensRemoved.length > 0) {
        console.warn("[AlunoContext] Storage corrompido detectado durante verificação inicial, limpeza realizada");
        console.log("[AlunoContext] DEBUG - Tokens removed:", validationResult.tokensRemoved);
      }

      const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
      console.log("[AlunoContext] initialCheckAlunoSession: Token de acesso armazenado:", !!storedToken);

      if (storedToken) {
        // Try to set aluno from stored token
        const alunoData = setAlunoFromToken(storedToken);
        if (alunoData) {
          console.log("[AlunoContext] Token de aluno válido encontrado no localStorage.");
        } else {
          console.log("[AlunoContext] Token inválido, tentando renovar com refresh token...");
          // If stored token is invalid, try refresh
          await refreshAlunoToken();
        }
      } else {
        // Se não há token de acesso, tenta renovar com refresh token
        console.log("[AlunoContext] Nenhum token de acesso encontrado. Tentando renovar com refresh token...");
        await refreshAlunoToken();
      }
      setLastValidationTime(Date.now());
    } finally {
      setIsLoadingAluno(false);
      console.log("[AlunoContext] initialCheckAlunoSession: Verificação inicial concluída.");
    }
  }, [setAlunoFromToken]); // Minimal dependencies

  useEffect(() => {
    console.log("[AlunoContext] useEffect (montagem inicial): Chamando initialCheckAlunoSession().");
    initialCheckAlunoSession();
  }, [initialCheckAlunoSession]);

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
        // MELHORIA: Usar função utilitária para verificar se precisa renovar
        if (shouldRefreshToken('aluno', 2)) { // Renovar quando restam menos de 2 minutos
          console.log("[AlunoContext] Intervalo de refresh: Renovando token proativamente...");
          refreshAlunoToken();
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