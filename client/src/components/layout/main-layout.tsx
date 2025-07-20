// Caminho: ./client/src/components/layout/main-layout.tsx
// <<< CORREÇÃO: Adicionado 'useRef' de volta à lista de importações >>>
import { ReactNode, useContext, useState, useRef, useEffect } from "react";
import Sidebar from "./sidebar";
import AlunoSidebar from "./AlunoSidebar";
import Header from "./header";
import MobileNav from "./mobile-nav";
import { UserContext } from "@/context/UserContext";
import { useAluno } from "@/context/AlunoContext";
import { cn } from "@/lib/utils";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user } = useContext(UserContext);
  const { aluno } = useAluno();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const DesktopSpecificSidebar = aluno && !user ? AlunoSidebar : (user ? Sidebar : null);
  const backgroundClass = aluno ? "bg-gradient-to-br from-indigo-600 to-blue-400" : "bg-blue-50 dark:bg-slate-900";

  useEffect(() => {
    const mainEl = mainScrollRef.current;
    if (!mainEl) return;

    const handleScroll = () => {
      setIsScrolled(mainEl.scrollTop > 10);
    };

    mainEl.addEventListener('scroll', handleScroll);
    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
  }, []);


  return (
    <div className={cn("flex h-screen text-foreground", backgroundClass)}>
      {DesktopSpecificSidebar && (
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 lg:w-72">
            <DesktopSpecificSidebar />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Header isScrolled={isScrolled} isAluno={!!aluno} />

        <main ref={mainScrollRef} className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="p-4 md:p-6 pb-16 md:pb-6">
            {children}
          </div>
        </main>

        {(user || aluno) && <MobileNav />}
      </div>
    </div>
  );
}