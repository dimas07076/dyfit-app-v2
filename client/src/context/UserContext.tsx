// client/src/context/UserContext.tsx
import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react"; // 'React' foi removido daqui
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
    if (shouldRedirect) {
      // Check if route restoration is in progress
      const restaurandoRota = localStorage.getItem("restaurandoRota");
      if (restaurandoRota) {
        console.log("[UserContext] Route restoration in progress, delaying logout redirect");
        // Wait longer for route restoration to complete before redirecting
        setTimeout(() => {
          if (!localStorage.getItem("restaurandoRota")) {
            console.log("[UserContext] Redirecionando para /login (hub) após logout do Personal/Admin.");
            setLocationWouter("/login");
          } else {
            console.log("[UserContext] Route restoration still active, skipping logout redirect");
          }
        }, 2000); // Increased delay to 2 seconds
      } else {
        console.log("[UserContext] Redirecionando para /login (hub) após logout do Personal/Admin.");
        setLocationWouter("/login");
      }
    }
  }, [setLocationWouter]);

  useEffect(() => {
    const handleAuthFailed = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log("[UserContext] Evento 'auth-failed' recebido:", customEvent.detail);
      
      // CORREÇÃO: Só processa eventos destinados ao Personal/Admin e se há usuário logado
      if (customEvent.detail && customEvent.detail.status === 401) {
        if (customEvent.detail.forPersonalAdmin && user) {
          console.warn("[UserContext] Falha de autenticação (401) para Personal/Admin detectada. Fazendo logout...");
          logout();
        } else if (!customEvent.detail.forPersonalAdmin) {
          console.log("[UserContext] Evento auth-failed não é para Personal/Admin, ignorando.");
        } else if (!user) {
          console.log("[UserContext] Evento auth-failed recebido, mas nenhum usuário Personal/Admin logado. Ignorando.");
        }
      }
    };

    window.addEventListener('auth-failed', handleAuthFailed);
    console.log("[UserContext] Event listener para 'auth-failed' adicionado.");

    return () => {
      window.removeEventListener('auth-failed', handleAuthFailed);
      console.log("[UserContext] Event listener para 'auth-failed' removido.");
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