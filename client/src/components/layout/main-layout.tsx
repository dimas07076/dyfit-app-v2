// Caminho: ./client/src/components/layout/main-layout.tsx
import { ReactNode, useContext, useState, useRef, useEffect } from "react";
import Sidebar from "./sidebar";
import AlunoSidebar from "./AlunoSidebar";
import Header from "./header";
import MobileNav from "./mobile-nav";
import { UserContext } from "@/context/UserContext";
import { useAluno } from "@/context/AlunoContext";
import { cn } from "@/lib/utils";
import WorkoutMiniPlayer from "@/components/WorkoutMiniPlayer";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user } = useContext(UserContext);
  const { aluno } = useAluno();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const DesktopSpecificSidebar = aluno && !user ? AlunoSidebar : (user ? Sidebar : null);
  
  // Modern gradient backgrounds for different user types
  const backgroundClass = aluno 
    ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" 
    : user?.role?.toLowerCase() === 'admin'
    ? "bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900"
    : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900";
  
  // Content container styling
  const contentContainerClass = aluno 
    ? "bg-transparent" 
    : "bg-background/95 backdrop-blur-sm";

  useEffect(() => {
    const mainEl = mainScrollRef.current;
    if (!mainEl) return;
    const handleScroll = () => { setIsScrolled(mainEl.scrollTop > 0); };
    mainEl.addEventListener('scroll', handleScroll);
    return () => { mainEl.removeEventListener('scroll', handleScroll); };
  }, []);

  return (
    <div className={cn("flex h-screen transition-all duration-500", backgroundClass)}>
      {DesktopSpecificSidebar && (
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 lg:w-72 bg-card/95 backdrop-blur-md text-card-foreground border-r border-border shadow-xl">
            <DesktopSpecificSidebar />
          </div>
        </div>
      )}

      <div className={cn("flex flex-col flex-1 w-0 text-foreground overflow-hidden", contentContainerClass)}>
        <Header isScrolled={isScrolled} isAluno={!!aluno} />

        <main ref={mainScrollRef} className="flex-1 relative overflow-y-auto focus:outline-none scrollbar-hide">
          <div className="p-4 md:p-6 pb-16 md:pb-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {(user || aluno) && <MobileNav />}
      
      {/* Show mini-player only for students/alunos */}
      {aluno && <WorkoutMiniPlayer />}
    </div>
  );
}
