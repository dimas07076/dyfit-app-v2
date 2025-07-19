// client/src/pages/public/LandingLoginPage.tsx
import { Link } from 'wouter';
import { Shield, User } from 'lucide-react';

// CORREÇÃO: Removido o <a> aninhado. As classes são aplicadas diretamente no Link.
const ProfileButton = ({ href, text, icon: Icon, className }: { href: string, text: string, icon: React.ElementType, className: string }) => (
    <Link 
        href={href}
        className={`flex items-center justify-center gap-3 w-full text-white font-semibold py-3 px-6 rounded-lg text-center shadow-lg transform hover:scale-105 hover:shadow-xl transition-all duration-300 ease-in-out ${className}`}
    >
        <Icon className="h-5 w-5" />
        <span>{text}</span>
    </Link>
);

export default function LandingLoginPage() {
    return (
        <div className="min-h-screen text-white antialiased">
            {/* LAYOUT DESKTOP (lg e acima)
            */}
            <div className="hidden lg:flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-8">
                <main className="w-full max-w-4xl mx-auto grid grid-cols-2 gap-0 items-center bg-slate-800/20 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Imagem (Desktop) com animação */}
                    <div className="w-full h-full relative animate-in fade-in zoom-in-95 duration-700">
                        <img src="/images/illustration-fitness.jpg" alt="Personal trainer auxiliando aluna" className="w-full h-full object-cover" />
                        <div className="absolute bottom-6 right-6 flex items-center gap-4 z-10">
                            <a href="#" aria-label="Baixar na App Store"><img src="/images/app-store-badge.png" alt="Baixar na App Store" className="h-10 w-auto opacity-80 hover:opacity-100 transition-opacity" /></a>
                            <a href="#" aria-label="Disponível no Google Play"><img src="/images/GooglePlay.png" alt="Disponível no Google Play" className="h-12 w-auto opacity-80 hover:opacity-100 transition-opacity" /></a>
                        </div>
                    </div>
                    {/* Conteúdo (Desktop) com animação */}
                    <div className="p-12 flex flex-col items-start text-left animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <img src="/logodyfit.png" alt="Logo DyFit" className="h-16 mb-6" />
                        <h1 className="text-5xl font-extrabold tracking-tight text-white">Sua jornada fitness, <span className="text-blue-400">simplificada.</span></h1>
                        <p className="mt-4 text-lg text-slate-300 max-w-md">A plataforma completa para personal trainers e seus alunos. Escolha seu perfil para começar.</p>
                        <div className="w-full max-w-xs flex flex-col gap-4 mt-8">
                            <ProfileButton href="/login/personal" text="Sou Personal Trainer" icon={Shield} className="bg-blue-600 hover:bg-blue-500" />
                            <ProfileButton href="/login/aluno" text="Sou Aluno" icon={User} className="bg-indigo-500 hover:bg-indigo-400" />
                        </div>
                    </div>
                </main>
                <footer className="w-full pt-8 text-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} DyFit. Todos os direitos reservados.</p>
                </footer>
            </div>

            {/* LAYOUT MOBILE (abaixo de lg)
            */}
            <div className="lg:hidden min-h-screen flex flex-col bg-slate-900 relative p-6">
                <div className="absolute inset-0 z-0">
                    <img src="/images/illustration-fitness.jpg" alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"></div>
                </div>
                <main className="relative z-10 flex-grow flex flex-col justify-center items-center text-center">
                    {/* <<< ADIÇÃO: Container do conteúdo com as animações >>> */}
                    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <img src="/logodyfit.png" alt="Logo DyFit" className="h-16 mx-auto" />
                        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">Seu treino começa aqui</h1>
                        <p className="mt-6 mb-8 text-lg text-slate-300">Escolha como deseja entrar:</p>
                        <div className="w-full max-w-xs mx-auto flex flex-col gap-4">
                            <ProfileButton href="/login/personal" text="Sou Personal Trainer" icon={Shield} className="bg-blue-600 hover:bg-blue-500" />
                            <ProfileButton href="/login/aluno" text="Sou Aluno" icon={User} className="bg-indigo-500 hover:bg-indigo-400" />
                        </div>
                    </div>
                </main>
                <footer className="relative z-10 w-full pt-8 text-center text-sm text-gray-500">
                    <p>© {new Date().getFullYear()} DyFit. Todos os direitos reservados.</p>
                </footer>
            </div>
        </div>
    );
}