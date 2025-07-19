// client/src/context/AlunoContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useLocation } from 'wouter'; // <<< ADIÇÃO: Importa o hook de localização

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
  logoutAluno: (options?: { redirect?: boolean }) => void; // Adicionado options
  checkAlunoSession: () => void;
}

export const AlunoContext = createContext<AlunoContextType | undefined>(undefined);

export const AlunoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aluno, setAluno] = useState<AlunoLogado | null>(null);
  const [tokenAluno, setTokenAluno] = useState<string | null>(null);
  const [isLoadingAluno, setIsLoadingAluno] = useState<boolean>(true);
  const [, setLocationWouter] = useLocation(); // <<< ADIÇÃO: Hook para redirecionamento

  const ALUNO_TOKEN_KEY = 'alunoAuthToken';
  const ALUNO_DATA_KEY = 'alunoData';

  // <<< CORREÇÃO: Função de logout atualizada para redirecionar corretamente >>>
  const logoutAluno = useCallback((options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect ?? true;
    setAluno(null);
    setTokenAluno(null);
    localStorage.removeItem(ALUNO_TOKEN_KEY);
    localStorage.removeItem(ALUNO_DATA_KEY);
    console.log("Contexto Aluno: Aluno deslogado.");
    if (shouldRedirect) {
        console.log("[AlunoContext] Redirecionando para /login (hub) após logout do Aluno.");
        setLocationWouter("/login"); // Redireciona para a nova página hub
    }
  }, [setLocationWouter]);

  const setAlunoFromToken = useCallback((token: string): AlunoLogado | null => {
    try {
      const decodedToken = jwtDecode<AlunoLogado>(token);
      if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
        console.warn("Contexto Aluno: Token de aluno expirado ao tentar decodificar.");
        logoutAluno({ redirect: false }); // Evita redirecionamento em loop
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
        console.log("Contexto Aluno: Dados do aluno definidos a partir do token:", alunoData);
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
    console.log("Contexto Aluno: Verificando sessão do aluno...");
    setIsLoadingAluno(true);
    const storedToken = localStorage.getItem(ALUNO_TOKEN_KEY);
    if (storedToken) {
      setAlunoFromToken(storedToken);
    } else {
      console.log("Contexto Aluno: Nenhum token de aluno encontrado no localStorage.");
    }
    setIsLoadingAluno(false);
  }, [setAlunoFromToken]);

  useEffect(() => {
    checkAlunoSession();
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