// Caminho: ./client/src/components/layout/AlunoSidebar.tsx
// <<< ALTERAÇÃO: 'React' foi removido da importação pois não é mais necessário >>>
import { Link, useLocation } from "wouter";
import { Home, ListChecks, History, LogOut } from "lucide-react"; 
import { useAluno, AlunoLogado } from "@/context/AlunoContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const AlunoSidebarLinks = [
  { href: "/aluno/dashboard", label: "Meu Painel", icon: Home },
  { href: "/aluno/meus-treinos", label: "Minhas Fichas", icon: ListChecks },
  { href: "/aluno/historico", label: "Meu Histórico", icon: History },
];

interface AlunoSidebarProps {
  onNavigate?: () => void;
}

const getAlunoDisplayName = (currentAluno: AlunoLogado | null): string => {
  if (!currentAluno) return "Aluno";
  return currentAluno.nome || currentAluno.email || "Aluno";
};

const getAlunoInitials = (currentAluno: AlunoLogado | null): string => {
  if (!currentAluno || !currentAluno.nome) return '?';
  const names = currentAluno.nome.split(' ');
  const firstInitial = names[0]?.[0] || '';
  const lastInitial = names.length > 1 ? names[names.length - 1]?.[0] || '' : '';
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();
  return initials.length > 0 ? initials : (currentAluno.email?.[0]?.toUpperCase() || '?');
};


export default function AlunoSidebar({ onNavigate }: AlunoSidebarProps) {
  const [location] = useLocation();
  const { aluno, logoutAluno } = useAluno();

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleLogoutClick = () => {
    logoutAluno();
    if (onNavigate) {
      onNavigate();
    }
  };
  
  const isActive = (path: string): boolean => {
    if (path === "/aluno/dashboard") {
      return location === path;
    }
    return location.startsWith(path);
  };

  const getLinkClasses = (path: string): string => {
    return `flex items-center px-3 py-2.5 rounded-lg transition-colors duration-150 text-sm w-full text-left ${
      isActive(path)
        ? "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
        : "text-foreground/70 hover:text-foreground hover:bg-muted/50 dark:text-foreground/60 dark:hover:text-foreground dark:hover:bg-muted/30"
    }`;
  };

  if (!aluno) {
    return null; 
  }

  return (
    <aside className="flex flex-col h-full bg-card text-card-foreground border-r dark:border-border/50">
      <div className="flex flex-col items-center justify-center h-auto px-6 py-4 border-b dark:border-border/50 shrink-0">
        <img
          src="/logodyfit.png"
          alt="Logo DyFit"
          className="h-12 w-auto object-contain mb-3"
        />
        <Avatar className="h-16 w-16 mb-2 border-2 border-primary">
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {getAlunoInitials(aluno)}
          </AvatarFallback>
        </Avatar>
        <p className="font-medium text-md truncate">
          {getAlunoDisplayName(aluno)}
        </p>
        <p className="text-xs text-muted-foreground">
          Aluno DyFit
        </p>
      </div>

      <div className="overflow-y-auto flex-1 py-4 px-3">
        <nav className="space-y-1.5">
          {AlunoSidebarLinks.map((link) => (
            <Link key={link.label} href={link.href} onClick={handleLinkClick} className={getLinkClasses(link.href)}>
              <link.icon className="w-5 h-5 mr-3 shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-3 border-t dark:border-border/50">
        <Button
          variant="ghost"
          onClick={handleLogoutClick}
          className="w-full justify-start text-foreground/70 hover:text-foreground hover:bg-muted/50 dark:text-foreground/60 dark:hover:text-foreground dark:hover:bg-muted/30"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </Button>
      </div>
    </aside>
  );
}