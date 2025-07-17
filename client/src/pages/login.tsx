// client/src/pages/login.tsx
import React, { useState, useContext } from 'react';
import { useLocation } from 'wouter';
import { UserContext, User } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from '@/lib/apiClient'; // <<< IMPORTA NOSSA FUNÇÃO CENTRAL

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
            // <<< LÓGICA DE FETCH TOTALMENTE SUBSTITUÍDA >>>
            const loginData = await fetchWithAuth<LoginApiResponse>('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email.toLowerCase(), password }),
            });
            // Nossa função fetchWithAuth já lida com erros de rede e status não-ok.

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

    // O JSX do return permanece EXATAMENTE o mesmo, não precisa copiar esta parte se não quiser.
    return (
        <div className="min-h-screen flex bg-gray-100 dark:bg-gray-950">
            {/* Lado esquerdo */}
            <div
                className="hidden md:flex w-1/2 bg-cover bg-center relative"
                style={{ backgroundImage: "url('/images/login-personal.png')" }}
            >
                 <div className="absolute inset-0 bg-black opacity-30"></div>
                 <div className="absolute bottom-10 left-10 text-white z-10">
                    <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">DyFit</h1>
                    <p className="text-lg text-gray-200 drop-shadow-md">Sua jornada fitness, simplificada e potencializada.</p>
                </div>
                <div className="absolute bottom-10 right-10 flex items-center gap-4 z-10">
                     <a href="#" aria-label="Baixar na App Store"><img src="/images/app-store-badge.png" alt="Baixar na App Store" className="h-10 w-auto" /></a>
                     <a href="#" aria-label="Disponível no Google Play"><img src="/images/GooglePlay.png" alt="Disponível no Google Play" className="h-12 w-auto" /></a>
                </div>
            </div>

            {/* Lado direito (formulário) */}
            <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
                <form
                    onSubmit={handleLogin}
                    className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700"
                >
                     <img src="/logodyfit.png" alt="Logo DyFit" className="h-14 mx-auto mb-6" />
                     <h2 className="text-2xl font-semibold mb-2 text-center text-gray-800 dark:text-white">Acesso Restrito</h2>
                    <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-8">Faça login com suas credenciais de Personal Trainer.</p>

                    {error && (
                        <p className="text-red-500 dark:text-red-400 mb-4 text-sm text-center p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                            {error}
                        </p>
                    )}

                    <div className="mb-5">
                        <label htmlFor="email-login" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <Input
                           type="email"
                           id="email-login"
                           className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 transition duration-150"
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           placeholder="seu.email@exemplo.com"
                           required
                           autoComplete="email"
                           disabled={isLoading}
                        />
                    </div>

                    <div className="mb-8">
                        <label htmlFor="password-login" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                        <Input
                            type="password"
                            id="password-login"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 transition duration-150"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Sua senha"
                            required
                            autoComplete="current-password"
                            disabled={isLoading}
                        />
                    </div>

                    <Button
                        type="submit"
                        className={`
                            w-full flex items-center justify-center
                            bg-indigo-600 hover:bg-indigo-700
                            dark:bg-indigo-600 dark:hover:bg-indigo-700
                            text-white font-semibold text-md
                            py-3 px-6 rounded-lg shadow-sm hover:shadow-md
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                            dark:focus:ring-offset-gray-900
                            transition-all duration-150 ease-in-out
                            ${isLoading ? 'opacity-60 cursor-not-allowed' : 'active:bg-indigo-800 dark:active:bg-indigo-800'}
                        `}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Entrando...
                            </>
                        ) : (
                            'Entrar'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}