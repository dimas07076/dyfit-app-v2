// client/src/pages/login.tsx
import React, { useState, useContext } from 'react';
import { useLocation, Link } from 'wouter';
import { UserContext, User } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // <<< CORREÇÃO: Apóstrofo extra removido
import { fetchWithAuth } from '@/lib/apiClient';
// <<< CORREÇÃO: Importação 'Label' removida pois não estava sendo usada no JSX >>>
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginApiResponse {
    message: string;
    token: string;
    user: { id: string; username: string; firstName: string; lastName: string; email: string; role: string; };
}

// O componente LoginForm foi removido para simplificar e garantir que a lógica esteja em um só lugar
export default function LoginPage() {
    const [, setLocation] = useLocation();
    const userContext = useContext(UserContext);
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const loginData = await fetchWithAuth<LoginApiResponse>('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email.toLowerCase(), password }),
            });
            localStorage.setItem('authToken', loginData.token);
            const loggedInUser: User = { ...loginData.user, role: loginData.user.role || 'Personal Trainer' };
            localStorage.setItem("userData", JSON.stringify(loggedInUser));
            userContext?.setUser(loggedInUser);
            toast({ title: "Login bem-sucedido!", description: `Bem-vindo(a) de volta, ${loggedInUser.firstName}!` });
            setLocation("/");
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
            toast({ title: "Erro no Login", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Lado do Formulário (Comum para mobile e desktop) */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 
                           bg-gradient-to-br from-blue-500 to-indigo-600 lg:bg-none">
                
                <div className="w-full max-w-sm space-y-8">
                     {/* Logo (Apenas no Mobile) */}
                    <div className="lg:hidden text-center">
                        <img src="/images/logo-branco.png" alt="Logo DyFit" className="h-24 mx-auto" />
                    </div>

                    <Card className="w-full animate-in fade-in-50 slide-in-from-bottom-10 duration-500 lg:border-none lg:shadow-none lg:bg-transparent">
                        <CardHeader className="text-center">
                            {/* Logo (Apenas no Desktop) */}
                            <img src="/logodyfit.png" alt="Logo DyFit" className="h-14 mx-auto hidden lg:block" />
                            <CardTitle className="text-3xl font-bold lg:text-gray-900 lg:dark:text-white">Entrar como Personal</CardTitle>
                            <CardDescription className="lg:text-gray-600 lg:dark:text-gray-400">Gerencie seus alunos e rotinas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogin} className="grid gap-4">
                                {error && ( <p className="text-red-500 text-sm text-center -mt-2 mb-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-md">{error}</p> )}
                                <div className="grid gap-2 relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <Input id="email-login" type="email" placeholder="seu.email@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} autoComplete="email" className="pl-10 h-12 text-base bg-white/80 dark:bg-slate-800/80 lg:bg-background" />
                                </div>
                                <div className="grid gap-2 relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <Input id="password-login" type="password" placeholder="Sua senha" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} autoComplete="current-password" className="pl-10 h-12 text-base bg-white/80 dark:bg-slate-800/80 lg:bg-background" />
                                </div>
                                <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Entrar
                                </Button>
                            </form>
                            <div className="mt-6 text-center text-sm">
                                <Link href="/login" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    Voltar para seleção de perfil
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Lado da Imagem (Apenas no Desktop) */}
            <div className="hidden bg-muted lg:block">
                <img src="/images/login-personal.png" alt="Imagem de um personal trainer" className="h-full w-full object-cover dark:brightness-[0.7]" />
            </div>
        </div>
    );
}