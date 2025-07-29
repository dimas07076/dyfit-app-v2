// Caminho: ./client/src/components/layout/mobile-nav.tsx
import { useState } from 'react';
import { Link as WouterLink, useLocation } from "wouter"; 
import { Home, Users, Dumbbell, Menu as MenuIcon, ListChecks, UserCog, List } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useAluno } from "@/context/AlunoContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./sidebar";
import AlunoSidebar from "./AlunoSidebar";
import WorkoutMiniPlayer from "@/components/WorkoutMiniPlayer";

export default function MobileNav() {
  const [location] = useLocation();
  const { user } = useUser();
  const { aluno } = useAluno();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const closeSheet = () => setIsSheetOpen(false);

  const isActive = (path: string): boolean => {
    if (path === "/aluno/dashboard" || path === "/" || path === "/admin") {
        return location === path;
    }
    return location.startsWith(path);
  };
  
  const getNavLinkClasses = (path: string): string => {
    return `flex flex-col items-center justify-center flex-1 py-2 text-xs
      ${isActive(path) ? "text-primary dark:text-primary" : "text-muted-foreground hover:text-foreground"
    }`;
  };
  
  const getButtonSheetClasses = (): string => {
      return `flex flex-col items-center justify-center flex-1 py-2 text-xs text-muted-foreground hover:text-foreground`;
  };


  if (aluno) {
    return (
      <nav className="md:hidden mobile-nav-fixed bg-card border-t border-border flex justify-around items-stretch h-16 z-20">
        <WouterLink href="/aluno/dashboard" className={getNavLinkClasses("/aluno/dashboard")}>
          <Home size={22} strokeWidth={isActive("/aluno/dashboard") ? 2.5 : 2} />
          <span className="mt-1">Início</span>
        </WouterLink>
        
        <WouterLink href="/aluno/meus-treinos" className={getNavLinkClasses("/aluno/meus-treinos")}>
          <ListChecks size={22} strokeWidth={isActive("/aluno/meus-treinos") ? 2.5 : 2} />
          <span className="mt-1">Fichas</span>
        </WouterLink>
        
        {/* Mini-player integration */}
        <WorkoutMiniPlayer />
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className={getButtonSheetClasses()}>
              <MenuIcon size={22} strokeWidth={2} />
              <span className="mt-1">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r dark:border-border/50">
            <AlunoSidebar onNavigate={closeSheet} />
          </SheetContent>
        </Sheet>
      </nav>
    );
  } else if (user && user.role?.toLowerCase() === 'admin') {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-stretch h-16 z-20">
        <WouterLink href="/admin" className={getNavLinkClasses("/admin")}>
          <Home size={22} strokeWidth={isActive("/admin") ? 2.5 : 2} />
          <span className="mt-1">Início</span>
        </WouterLink>
        {/* <<< INÍCIO DA ALTERAÇÃO >>> */}
        <WouterLink href="/admin/personais" className={getNavLinkClasses("/admin/personais")}>
          <UserCog size={22} strokeWidth={isActive("/admin/personais") ? 2.5 : 2} />
          <span className="mt-1">Personais</span>
        </WouterLink>
        <WouterLink href="/exercises" className={getNavLinkClasses("/exercises")}>
          <List size={22} strokeWidth={isActive("/exercises") ? 2.5 : 2} />
          <span className="mt-1">Exercícios</span>
        </WouterLink>
        {/* <<< FIM DA ALTERAÇÃO >>> */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className={getButtonSheetClasses()}>
              <MenuIcon size={22} strokeWidth={2} />
              <span className="mt-1">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r dark:border-border/50">
            <Sidebar onNavigate={closeSheet} /> 
          </SheetContent>
        </Sheet>
      </nav>
    );
  } else if (user) {
    return (
      <nav className="md:hidden mobile-nav-fixed bg-card border-t border-border flex justify-around items-stretch h-16 z-20">
        <WouterLink href="/" className={getNavLinkClasses("/")}>
          <Home size={22} strokeWidth={isActive("/") ? 2.5 : 2} />
          <span className="mt-1">Início</span>
        </WouterLink>
        <WouterLink href="/alunos" className={getNavLinkClasses("/alunos")}>
          <Users size={22} strokeWidth={isActive("/alunos") ? 2.5 : 2} />
          <span className="mt-1">Alunos</span>
        </WouterLink>
        <WouterLink href="/treinos" className={getNavLinkClasses("/treinos")}>
          <Dumbbell size={22} strokeWidth={isActive("/treinos") ? 2.5 : 2} />
          <span className="mt-1">Treinos</span>
        </WouterLink>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className={getButtonSheetClasses()}>
              <MenuIcon size={22} strokeWidth={2} />
              <span className="mt-1">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r dark:border-border/50">
            <Sidebar onNavigate={closeSheet} /> 
          </SheetContent>
        </Sheet>
      </nav>
    );
  }

  return null;
}