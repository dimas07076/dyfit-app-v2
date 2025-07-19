// client/src/pages/login.tsx
import React, { useState, useContext } from 'react';
import { useLocation, Link } from 'wouter';
import { UserContext, User } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from '@/lib/apiClient';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginApiResponse {
    message: string;
    token: string;
    user: {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
}

const LoginForm = () => {
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
        <Card className="w-full max-w-sm border-none shadow-xl animate-in fade-in-50 slide-in-from-bottom-10 duration-500">
            <CardHeader className="text-center space-y-2 pt-8">
                <CardTitle className="text-3xl font-bold">Entrar como Personal</CardTitle>
                <CardDescription>Gerencie seus alunos e rotinas de treino com eficiência.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                <form onSubmit={handleLogin} className="grid gap-4">
                    {error && ( <p className="text-red-500 text-sm text-center -mt-2 mb-2">{error}</p> )}
                    <div className="grid gap-2 relative mt-4">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input id="email-login" type="email" placeholder="seu.email@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} autoComplete="email" className="pl-10 h-12 text-base" />
                    </div>
                    <div className="grid gap-2 relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input id="password-login" type="password" placeholder="Sua senha" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} autoComplete="current-password" className="pl-10 h-12 text-base" />
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
    );
};

export default function LoginPage() {
    return (
        <div className="min-h-screen w-full">
            <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
                <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto grid w-[350px] gap-6">
                        <div className="grid gap-2 text-center">
                            <img src="/logodyfit.png" alt="Logo DyFit" className="h-14 mx-auto" />
                            <h1 className="text-3xl font-bold">Acesso do Personal</h1>
                            <p className="text-balance text-muted-foreground">Gerencie seus alunos e rotinas de forma eficiente.</p>
                        </div>
                        <form className="grid gap-4">
                            <div className="grid gap-2"><Label htmlFor="email-login-desktop">Email</Label><Input id="email-login-desktop" type="email" placeholder="seu.email@exemplo.com" readOnly /></div>
                            <div className="grid gap-2"><Label htmlFor="password-login-desktop">Senha</Label><Input id="password-login-desktop" type="password" placeholder="Sua senha" readOnly /></div>
                            <Button type="submit" className="w-full">Entrar</Button>
                        </form>
                        <div className="mt-4 text-center text-sm">
                            <Link href="/login" className="underline underline-offset-4 hover:text-primary transition-colors">
                                <ArrowLeft className="inline-block mr-1 h-4 w-4" />
                                Voltar para a seleção de perfil
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="hidden bg-muted lg:block">
                    <img src="/images/login-personal.png" alt="Imagem de um personal trainer" className="h-full w-full object-cover dark:brightness-[0.7]" />
                </div>
            </div>

            <div className="lg:hidden min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4 relative">
                <div className="absolute top-8 sm:top-12">
                    {/* <<< CORREÇÃO: Tamanho da logo aumentado >>> */}
                    <img src="/images/logo-branco.png" alt="Logo DyFit" className="h-24 sm:h-28" />
                </div>
                <LoginForm />
            </div>
        </div>
    );
}