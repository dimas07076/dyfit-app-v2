// client/src/context/AlunoContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

export interface AlunoLogado {
  id: string;
  nome: string;
  role: 'aluno';
  email: string;
  personalId?: string;
  exp?: number;
  iat?: number;
}

interface AlunoRefreshResponse {
  message: string;
  token: string;
  aluno: AlunoLogado;
}

interface AlunoContextType {
  aluno: AlunoLogado | null;
  tokenAluno: string | null;
  isLoadingAluno: boolean;
  loginAluno: (token: string, refreshToken: string) => void;
  logoutAluno: (options?: { redirect?: boolean }) => void;
  checkAlunoSession: () => void;
}

export const AlunoContext = createContext<AlunoContextType | undefined>(undefined);

export const AlunoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aluno, setAluno] = useState<AlunoLogado | null>(null);
  const [tokenAluno, setTokenAluno] = useState<string | null>(null);
  const [isLoadingAluno, setIsLoadingAluno] = useState<boolean>(true);
  const [, setLocationWouter] = useLocation();

  const ALUNO_TOKEN_KEY = 'alunoAuthToken';
  const ALUNO_REFRESH_TOKEN_KEY = 'alunoRefreshToken';

  const isPublicInviteRoute = useCallback((pathname?: string) => {
    const currentPath = pathname || window.location.pathname;
    return currentPath.includes('/convite/aluno/') || 
           currentPath.includes('/cadastrar-aluno/convite/') ||
           currentPath.includes('/cadastrar-personal/convite/');
  }, []);

  const setAlunoFromToken = useCallback((token: string): AlunoLogado | null => {
    try {
      const decodedToken = jwtDecode<AlunoLogado>(token);
      if (decodedToken.exp && decodedToken.exp * 1000 <= Date.now()) {
        return null;
      }
      if (decodedToken.id && decodedToken.role === 'aluno' && decodedToken.nome && decodedToken.email) {
        setAluno(decodedToken);
        setTokenAluno(token);
        localStorage.setItem(ALUNO_TOKEN_KEY, token);
        return decodedToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const logoutAluno = useCallback((options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect ?? true;
    console.log("[AlunoContext] Iniciando logout do aluno...");

    setAluno(null);
    setTokenAluno(null);
    localStorage.removeItem(ALUNO_TOKEN_KEY);
    localStorage.removeItem(ALUNO_REFRESH_TOKEN_KEY);
    localStorage.removeItem('alunoData');
    
    // <<< CORREÇÃO PRINCIPAL AQUI >>>
    // Só redireciona se um Personal/Admin NÃO estiver logado.
    // Isso impede que o logout do Aluno (em background) expulse um Personal logado.
    const personalToken = localStorage.getItem('authToken');
    if (shouldRedirect && !personalToken) {
        console.log("[AlunoContext] Nenhum Personal logado. Redirecionando para /login.");
        setLocationWouter("/login");
    } else if (personalToken) {
        console.log("[AlunoContext] Personal está logado. Logout do aluno efetuado sem redirecionamento.");
    }
  }, [setLocationWouter]);

  const refreshAlunoToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(ALUNO_REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await apiRequest('POST', '/api/auth/aluno/refresh', { refreshToken }, 'aluno') as AlunoRefreshResponse;
      if (response.token && response.aluno) {
        setAlunoFromToken(response.token);
        return true;
      }
      logoutAluno({ redirect: false }); // Não redireciona se falhar
      return false;
    } catch (error) {
      logoutAluno({ redirect: false }); // Não redireciona se falhar
      return false;
    }
  }, [setAlunoFromToken, logoutAluno]);

  const loginAluno = useCallback((token: string, refreshToken: string) => {
    setAlunoFromToken(token);
    localStorage.setItem(ALUNO_REFRESH_TOKEN_KEY, refreshToken);
  }, [setAlunoFromToken]);

  const checkAlunoSession = useCallback(async () => {
    setIsLoadingAluno(true);
    // <<< CORREÇÃO: Não fazer nada se estiver em rotas públicas de convite >>>
    if (isPublicInviteRoute()) {
        setIsLoadingAluno(false);
        return;
    }

    const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);

    if (storedToken) {
        try {
            const decodedToken = jwtDecode<AlunoLogado>(storedToken);
            if (decodedToken.exp && decodedToken.exp * 1000 > Date.now()) {
                setAlunoFromToken(storedToken);
            } else {
                const refreshed = await refreshAlunoToken();
                if (!refreshed) logoutAluno({ redirect: false }); // Não redireciona
            }
        } catch {
            logoutAluno({ redirect: false }); // Não redireciona
        }
    } else {
        const refreshed = await refreshAlunoToken();
        if (!refreshed) {
             // Só limpa o estado se não houver token, sem forçar logout/redirect
             setAluno(null);
             setTokenAluno(null);
        }
    }
    setIsLoadingAluno(false);
  }, [setAlunoFromToken, refreshAlunoToken, logoutAluno, isPublicInviteRoute]);

  useEffect(() => {
    checkAlunoSession();
  }, [checkAlunoSession]);
  
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