// Caminho: ./client/src/components/layout/main-layout.tsx
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
  
  // Fundo do container PAI
  const backgroundClass = aluno ? "bg-gradient-to-br from-indigo-600 to-blue-400" : "bg-blue-50 dark:bg-slate-900";
  // Fundo do container do CONTEÚDO (transparente para aluno, padrão para personal)
  const contentContainerClass = aluno ? "bg-transparent" : "";


  useEffect(() => {
    const mainEl = mainScrollRef.current;
    if (!mainEl) return;
    const handleScroll = () => { setIsScrolled(mainEl.scrollTop > 0); };
    mainEl.addEventListener('scroll', handleScroll);
    return () => { mainEl.removeEventListener('scroll', handleScroll); };
  }, []);


  return (
    // O container pai agora SÓ tem a cor de fundo gradiente/azul
    <div className={cn("flex h-screen", backgroundClass)}>
      {DesktopSpecificSidebar && (
        <div className="hidden md:flex md:flex-shrink-0">
          {/* Sidebar tem seu próprio fundo, então não é afetado */}
          <div className="flex flex-col w-64 lg:w-72 bg-card text-card-foreground">
            <DesktopSpecificSidebar />
          </div>
        </div>
      )}

      {/* Container do conteúdo agora tem a classe dinâmica e o overflow-hidden */}
      <div className={cn("flex flex-col flex-1 w-0 text-foreground overflow-hidden", contentContainerClass)}>
        <Header isScrolled={isScrolled} isAluno={!!aluno} />

        <main ref={mainScrollRef} className="flex-1 relative overflow-y-auto focus:outline-none">
          {/* O padding foi movido para um div interno para o scroll funcionar corretamente */}
          <div className="p-4 md:p-6 pb-16 md:pb-6">
            {children}
          </div>
        </main>

        {(user || aluno) && <MobileNav />}
      </div>
    </div>
  );
}
