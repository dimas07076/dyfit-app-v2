// client/src/context/UserContext.tsx
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: (options?: { redirect?: boolean }) => void;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => { console.warn("setUser called outside UserProvider"); },
  logout: () => { console.warn("logout called outside UserProvider"); },
  isLoading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocationWouter] = useLocation();

  useEffect(() => {
    try {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        const parsedUser: User = JSON.parse(storedUserData);
         if (parsedUser && parsedUser.id) {
            setUserState(parsedUser);
         } else {
            console.warn("Dados do usuário no localStorage inválidos.");
            localStorage.removeItem('userData');
         }
      }
    } catch (error) {
      console.error("Erro ao carregar usuário do localStorage:", error);
      localStorage.removeItem('userData');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('userData', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('userData');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const logout = useCallback((options?: { redirect?: boolean }) => {
    const shouldRedirect = options?.redirect ?? true;
    console.log(`[UserContext] logout chamado. Limpando dados do Personal/Admin. Redirecionar: ${shouldRedirect}`);
    handleSetUser(null);

    // <<< CORREÇÃO PRINCIPAL AQUI >>>
    // Só redireciona se um Aluno NÃO estiver logado.
    // Isso impede que o logout do Personal (em background) expulse um Aluno logado.
    const alunoToken = localStorage.getItem('alunoAuthToken');
    if (shouldRedirect && !alunoToken) {
      console.log("[UserContext] Nenhum Aluno logado. Redirecionando para /login.");
      setLocationWouter("/login");
    } else if (alunoToken) {
      console.log("[UserContext] Aluno está logado. Logout do Personal efetuado sem redirecionamento.");
    }
  }, [setLocationWouter]);

  useEffect(() => {
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.status === 401) {
        if (customEvent.detail.forPersonalAdmin && user) {
          console.warn("[UserContext] Falha de autenticação (401) para Personal/Admin detectada. Fazendo logout...");
          logout();
        }
      }
    };

    window.addEventListener('auth-failed', handleAuthFailed as EventListener);
    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed as EventListener);
    };
  }, [user, logout]);

  const value: UserContextType = {
      user,
      setUser: handleSetUser,
      logout,
      isLoading
    };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}