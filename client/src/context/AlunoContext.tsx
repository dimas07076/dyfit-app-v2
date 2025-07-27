// client/src/context/AlunoContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter';

export interface AlunoLogado {
  id: string;
  nome: string;
  role: 'aluno';
  email: string;
  personalId?: string;
  exp?: number;
  iat?: number;
}

interface AlunoContextType {
  aluno: AlunoLogado | null;
  tokenAluno: string | null;
  isLoadingAluno: boolean;
  loginAluno: (token: string) => void;
  logoutAluno: (options?: { redirect?: boolean }) => void;
  checkAlunoSession: () => void;
}

export const AlunoContext = createContext<AlunoContextType | undefined>(undefined);

export const AlunoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aluno, setAluno] = useState<AlunoLogado | null>(null);
  const [tokenAluno, setTokenAluno] = useState<string | null>(null);
  const [isLoadingAluno, setIsLoadingAluno] = useState<boolean>(true);
  const [lastValidationTime, setLastValidationTime] = useState<number>(0);
  const [, setLocationWouter] = useLocation();

  const ALUNO_TOKEN_KEY = 'alunoAuthToken';
  const ALUNO_DATA_KEY = 'alunoData';
  const VALIDATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  const logoutAluno = useCallback((options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect ?? true;
    setAluno(null);
    setTokenAluno(null);
    localStorage.removeItem(ALUNO_TOKEN_KEY);
    localStorage.removeItem(ALUNO_DATA_KEY);
    localStorage.removeItem('alunoRefreshToken');
    console.log("Contexto Aluno: Aluno deslogado.");
    if (shouldRedirect) {
        console.log("[AlunoContext] Redirecionando para /login (hub) após logout do Aluno.");
        setLocationWouter("/login");
    }
  }, [setLocationWouter]);

  const setAlunoFromToken = useCallback((token: string): AlunoLogado | null => {
    try {
      const decodedToken = jwtDecode<AlunoLogado>(token);
      if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
        console.warn("Contexto Aluno: Token de aluno expirado ao tentar decodificar.");
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
        // O log original foi removido para não poluir o console a cada verificação
        return alunoData;
      } else {
        console.error("Contexto Aluno: Payload do token de aluno inválido:", decodedToken);
        logoutAluno({ redirect: false });
        return null;
      }
    } catch (error) {
      console.error("Contexto Aluno: Erro ao decodificar token de aluno:", error);
      logoutAluno({ redirect: false });
      return null;
    }
  }, [logoutAluno]);
  
  const loginAluno = useCallback((token: string) => {
    setIsLoadingAluno(true);
    setAlunoFromToken(token);
    setIsLoadingAluno(false);
  }, [setAlunoFromToken]);

  const checkAlunoSession = useCallback(() => {
    setIsLoadingAluno(true);
    const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
    if (storedToken) {
      setAlunoFromToken(storedToken);
    }
    setLastValidationTime(Date.now());
    setIsLoadingAluno(false);
  }, [setAlunoFromToken]);

  useEffect(() => {
    checkAlunoSession();
    // O log de "Verificando sessão" foi movido para dentro de checkAlunoSession para ser mais preciso
  }, [checkAlunoSession]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ALUNO_TOKEN_KEY && event.newValue === null) {
        logoutAluno();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [logoutAluno]);
  
  useEffect(() => {
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.status === 401) {
        if (customEvent.detail.forAluno && aluno) {
          logoutAluno();
        }
      }
    };
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed);
    };
  }, [aluno, logoutAluno]);

  // --- INÍCIO DA ETAPA 3: VALIDAÇÃO PROATIVA COM CACHE INTELIGENTE ---
  useEffect(() => {
    // Esta função será chamada sempre que o estado de visibilidade da página mudar.
    const handleVisibilityChange = () => {
      // Verificamos o estado apenas quando a página se torna visível.
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastValidation = now - lastValidationTime;
        
        // Só revalida se passou do tempo de cache ou se nunca foi validado
        if (timeSinceLastValidation > VALIDATION_CACHE_DURATION || lastValidationTime === 0) {
          console.log("[AlunoContext] App tornou-se visível. Revalidando a sessão do aluno... (cache expirado)");
          checkAlunoSession();
        } else {
          console.log("[AlunoContext] App tornou-se visível. Cache ainda válido, pulando revalidação.");
        }
      }
    };

    // Adiciona o event listener ao documento.
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Retorna uma função de limpeza para remover o listener quando o componente for desmontado.
    // Isso evita vazamentos de memória.
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAlunoSession, lastValidationTime]); // A dependência garante que a função mais recente seja usada.
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