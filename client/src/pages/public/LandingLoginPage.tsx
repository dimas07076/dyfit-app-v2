// client/src/pages/public/LandingLoginPage.tsx
import { Link } from 'wouter';
import { User, Shield } from 'lucide-react';
// <<< CORREÇÃO: Removidas as importações não utilizadas de Card >>>
import { Card, CardContent } from '@/components/ui/card';

// Componente reutilizável para os cards de seleção de perfil
const ProfileSelectionCard = ({ href, icon: Icon, title, description }: { href: string, icon: React.ElementType, title: string, description: string }) => (
    <Link href={href}>
        <a className="block group">
            <Card className="hover:border-primary hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
                <CardContent className="p-6 text-center flex flex-col items-center">
                    <div className="mb-4 p-4 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </CardContent>
            </Card>
        </a>
    </Link>
);


export default function LandingLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <img src="/logodyfit.png" alt="Logo DyFit" className="h-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Bem-vindo(a) ao DyFit!</h1>
                    <p className="mt-2 text-md text-muted-foreground">Selecione seu perfil para continuar.</p>
                </div>

                <div className="space-y-4">
                    <ProfileSelectionCard 
                        href="/login/personal"
                        icon={Shield}
                        title="Sou Personal Trainer"
                        description="Acesse seu painel para gerenciar alunos e rotinas."
                    />
                    <ProfileSelectionCard 
                        href="/login/aluno"
                        icon={User}
                        title="Sou Aluno"
                        description="Entre para ver seus treinos e acompanhar seu progresso."
                    />
                </div>

                <div className="text-center text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} DyFit. Todos os direitos reservados.</p>
                </div>
            </div>
        </div>
    );
}