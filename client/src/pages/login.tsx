// client/src/pages/login.tsx
import React, { useState, useContext } from 'react';
import { useLocation, Link } from 'wouter'; // Adicionado Link
import { UserContext, User } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react"; // Adicionado ArrowLeft
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from '@/lib/apiClient';
import { Label } from '@/components/ui/label'; // Adicionado Label

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
            const loggedInUser: User = {
                id: loginData.user.id,
                username: loginData.user.username,
                firstName: loginData.user.firstName,
                lastName: loginData.user.lastName,
                email: loginData.user.email,
                role: loginData.user.role || 'Personal Trainer'
            };
            localStorage.setItem("userData", JSON.stringify(loggedInUser));

            if (userContext) {
                userContext.setUser(loggedInUser);
            } else {
                console.error("UserContext não encontrado!");
                window.location.reload();
            }

            toast({
                title: "Login bem-sucedido!",
                description: `Bem-vindo(a) de volta, ${loggedInUser.firstName}!`,
            });

            setLocation("/");

        } catch (err: any) {
            console.error("Erro no login:", err);
            const errorMessage = err.message || 'Ocorreu um erro inesperado.';
            setError(errorMessage);
            toast({
                title: "Erro no Login",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto grid w-[350px] gap-6">
                    <div className="grid gap-2 text-center">
                        <img src="/logodyfit.png" alt="Logo DyFit" className="h-14 mx-auto" />
                        <h1 className="text-3xl font-bold">Acesso Restrito</h1>
                        <p className="text-balance text-muted-foreground">
                            Faça login com suas credenciais de Personal Trainer.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="grid gap-4">
                        {error && (
                            <p className="text-red-500 text-sm text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                                {error}
                            </p>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="email-login">Email</Label>
                            <Input
                                id="email-login"
                                type="email"
                                placeholder="seu.email@exemplo.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password-login">Senha</Label>
                            <Input 
                                id="password-login" 
                                type="password" 
                                placeholder="Sua senha"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? 'Entrando...' : 'Entrar'}
                        </Button>
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
                <img
                    src="/images/login-personal.png"
                    alt="Imagem de um personal trainer"
                    width="1920"
                    height="1080"
                    className="h-full w-full object-cover dark:brightness-[0.7]"
                />
            </div>
        </div>
    );
}