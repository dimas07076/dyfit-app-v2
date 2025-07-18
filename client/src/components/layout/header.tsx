// Caminho: ./client/src/components/layout/Header.tsx
import { useState, useContext } from "react";
import { Menu, X, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./sidebar";
import AlunoSidebar from "./AlunoSidebar";
import { UserContext } from "@/context/UserContext";
import { useAluno } from "@/context/AlunoContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Link as WouterLink } from "wouter";

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, logout: logoutUser } = useContext(UserContext);
  const { aluno, logoutAluno } = useAluno();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // <<< CORREÇÃO DE TIPO: Usando as propriedades que existem nos tipos >>>
  const getInitials = (currentUser: { firstName?: string, lastName?: string, nome?: string } | null): string => {
    if (!currentUser) return '?';
    // Prioriza 'firstName' e 'lastName' (do tipo User), mas mantém 'nome' como fallback (para o tipo Aluno)
    const first = currentUser.firstName?.[0] || currentUser.nome?.split(' ')[0][0] || '';
    const last = currentUser.lastName?.[0] || (currentUser.nome?.includes(' ') ? currentUser.nome.split(' ').pop()?.[0] : '') || '';
    const initials = `${first}${last}`.toUpperCase();
    return initials.length > 0 ? initials : (currentUser.nome?.[0]?.toUpperCase() || '?');
  };

  // <<< CORREÇÃO DE TIPO: Usando as propriedades que existem nos tipos >>>
  const getFullName = (currentUser: { firstName?: string, lastName?: string, nome?: string, email?: string } | null): string => {
    if (!currentUser) return 'Usuário';
    // Prioriza 'firstName' e 'lastName', mas mantém 'nome' como fallback
    return `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.nome || currentUser.email || 'Usuário';
  };
  
  const activeMobileLogoutFunction = () => {
    if (aluno) logoutAluno();
    else if (user) logoutUser();
    closeMobileMenu(); 
  };

  const MobileHeader = () => (
     <header className="md:hidden flex items-center justify-between h-16 px-4 border-b border-border bg-card text-card-foreground sticky top-0 z-20">
      <div className="flex items-center">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-card border-r dark:border-border/50">
            {aluno ? <AlunoSidebar onNavigate={closeMobileMenu} /> : 
             (user ? <Sidebar onNavigate={closeMobileMenu} /> : null)}
          </SheetContent>
        </Sheet>
        <img src="/logodyfit.png" alt="Logo DyFit" className="ml-4 h-8 w-auto" />
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
         {(aluno || user) && (
            <Button variant="ghost" size="icon" onClick={activeMobileLogoutFunction} className="text-destructive hover:text-destructive/80" title="Sair">
                <LogOut size={20} />
            </Button>
         )}
      </div>
      {isSearchOpen && (
         <div className="absolute inset-0 bg-background z-30 p-4 flex items-center">
          <div className="relative flex-1">
            <UserIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Pesquisar..." className="pl-8 w-full" autoFocus />
          </div>
          <button type="button" className="ml-2" onClick={() => setIsSearchOpen(false)}> <X size={24} /> </button>
        </div>
      )}
    </header>
  );

  const displayUserForDesktopHeader = aluno && !user ? aluno : user;
  const logoutForDesktopHeader = () => {
    if (aluno && !user) logoutAluno();
    else if (user) logoutUser();
  };

  return (
    <>
      <div className="hidden md:block">
        <header className="flex items-center justify-end h-16 px-6 border-b border-border bg-card text-card-foreground sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            {displayUserForDesktopHeader && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 py-1 h-auto rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(displayUserForDesktopHeader)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden lg:inline">
                      {getFullName(displayUserForDesktopHeader).split(' ')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {getFullName(displayUserForDesktopHeader)}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {displayUserForDesktopHeader.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <WouterLink href="/perfil/editar">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Editar Perfil</span>
                    </WouterLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logoutForDesktopHeader} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/80 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
      </div>
      <div className="md:hidden">
        <MobileHeader />
      </div>
    </>
  );
}