// client/src/pages/public/LandingLoginPage.tsx
import { Link } from 'wouter';
import { Shield, User, Download, Dumbbell, TrendingUp, Users } from 'lucide-react';
import { usePWAInstall } from '@/context/PWAInstallContext';

const ProfileButton = ({ href, text, icon: Icon, description }: { 
  href: string; 
  text: string; 
  icon: React.ElementType; 
  description: string;
}) => (
  <Link 
    href={href}
    className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground rounded-xl p-6 min-h-[80px] transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-1 interactive touch-target block"
  >
    <div className="flex items-center gap-4">
      <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors flex-shrink-0">
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 text-left">
        <h3 className="font-semibold text-lg leading-tight">{text}</h3>
        <p className="text-primary-foreground/80 text-sm mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
  </Link>
);

const ActionButton = ({ onClick, text, icon: Icon, className }: { 
  onClick: () => void; 
  text: string; 
  icon: React.ElementType; 
  className: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center gap-3 w-full font-semibold py-4 px-6 min-h-[56px] rounded-xl text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 interactive touch-target ${className}`}
  >
    <Icon className="h-5 w-5" />
    <span>{text}</span>
  </button>
);


export default function LandingLoginPage() {
    const { canInstall, triggerInstallPrompt } = usePWAInstall();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white antialiased">
            {/* LAYOUT DESKTOP */}
            <div className="hidden lg:flex min-h-screen flex-col items-center justify-center px-4 py-8">
                <main className="w-full max-w-6xl mx-auto grid grid-cols-2 gap-12 items-center">
                    {/* Left Side - Hero Content */}
                    <div className="space-y-8 animate-fade-in">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <img 
                                    src="/logodyfit.png" 
                                    alt="DyFit Logo" 
                                    className="h-12 w-auto object-contain"
                                />
                            </div>
                            
                            <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                                Sua jornada fitness,{' '}
                                <span className="text-gradient">simplificada</span>
                            </h1>
                            
                            <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                                A plataforma completa que conecta personal trainers e alunos. 
                                Gerencie treinos, acompanhe progressos e alcance seus objetivos.
                            </p>
                        </div>

                        {/* Feature highlights */}
                        <div className="grid grid-cols-2 gap-4 pt-6">
                            <div className="flex items-center gap-3 text-slate-300">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <span className="text-sm">Acompanhamento em tempo real</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <Users className="h-5 w-5 text-primary" />
                                <span className="text-sm">Comunicação direta</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Action Cards */}
                    <div className="space-y-6 animate-slide-up">
                        <div className="bg-card/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-glass">
                            <h2 className="text-2xl font-semibold mb-6 text-center">Escolha seu perfil</h2>
                            <div className="space-y-4">
                                <ProfileButton 
                                    href="/login/personal" 
                                    text="Personal Trainer" 
                                    icon={Shield} 
                                    description="Gerencie seus alunos e treinos"
                                />
                                <ProfileButton 
                                    href="/login/aluno" 
                                    text="Aluno" 
                                    icon={User} 
                                    description="Acesse seus treinos e progresso"
                                />
                                {canInstall && (
                                    <ActionButton 
                                        onClick={triggerInstallPrompt} 
                                        text="Instalar Aplicativo" 
                                        icon={Download} 
                                        className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success text-success-foreground" 
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="w-full pt-8 text-center text-sm text-slate-400">
                    <p>© {new Date().getFullYear()} DyFit. Todos os direitos reservados.</p>
                </footer>
            </div>

            {/* LAYOUT MOBILE */}
            <div className="lg:hidden min-h-screen flex flex-col relative p-6">
                <main className="flex-grow flex flex-col justify-center items-center text-center space-y-8 px-4">
                    <div className="animate-fade-in space-y-6">
                        <div className="flex items-center justify-center mb-8">
                            <img 
                                src="/logodyfit.png" 
                                alt="DyFit Logo" 
                                className="h-16 w-auto object-contain"
                            />
                        </div>
                        
                        <h1 className="text-4xl font-bold leading-tight px-4">
                            Seu treino{' '}
                            <span className="text-gradient">começa aqui</span>
                        </h1>
                        
                        <p className="text-lg text-slate-300 max-w-xs mx-auto leading-relaxed">
                            Escolha como deseja entrar na plataforma
                        </p>
                    </div>

                    <div className="w-full max-w-sm space-y-4 animate-slide-up">
                        <ProfileButton 
                            href="/login/personal" 
                            text="Personal Trainer" 
                            icon={Shield} 
                            description="Gerencie seus alunos"
                        />
                        <ProfileButton 
                            href="/login/aluno" 
                            text="Aluno" 
                            icon={User} 
                            description="Acesse seus treinos"
                        />
                        {canInstall && (
                            <ActionButton 
                                onClick={triggerInstallPrompt} 
                                text="Instalar App" 
                                icon={Download} 
                                className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success text-success-foreground" 
                            />
                        )}
                    </div>
                </main>
                
                <footer className="w-full pt-6 text-center text-sm text-slate-400">
                    <p>© {new Date().getFullYear()} DyFit. Todos os direitos reservados.</p>
                </footer>
            </div>
        </div>
    );
}