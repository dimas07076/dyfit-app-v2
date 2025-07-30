// client/src/pages/login.tsx
import React, { useState, useContext } from 'react';
import { useLocation, Link } from 'wouter';
import { UserContext, User } from '@/context/UserContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Lock, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginApiResponse {
    message: string;
    token: string;
    refreshToken: string;
    user: { id: string; username: string; firstName: string; lastName: string; email: string; role: string; };
}

// Função para validar e limpar dados corrompidos no localStorage
const validateAndCleanAuthData = (): void => {
    try {
        // Lista de chaves que precisam ser validadas
        const authKeys = ['authToken', 'refreshToken', 'userData'];
        
        authKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value === 'null' || value === 'undefined' || value === '') {
                console.warn(`[Login] Removendo valor corrompido para ${key}:`, value);
                localStorage.removeItem(key);
            }
        });
        
        // Validação específica para userData
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                if (!parsed || !parsed.id || !parsed.email) {
                    console.warn('[Login] userData malformado, removendo...');
                    localStorage.removeItem('userData');
                }
            } catch (e) {
                console.warn('[Login] userData com JSON inválido, removendo...');
                localStorage.removeItem('userData');
            }
        }
    } catch (error) {
        console.error('[Login] Erro ao validar localStorage:', error);
    }
};

export default function LoginPage() {
    const [, setLocation] = useLocation();
    const userContext = useContext(UserContext);
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Limpa dados corrompidos quando o componente é montado
    React.useEffect(() => {
        validateAndCleanAuthData();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        
        try {
            // Limpa dados corrompidos antes de tentar o login
            validateAndCleanAuthData();
            
            const loginData = await fetchWithAuth<LoginApiResponse>('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email.toLowerCase(), password }),
            });
            localStorage.setItem('authToken', loginData.token);
            localStorage.setItem('refreshToken', loginData.refreshToken);
            const loggedInUser: User = { ...loginData.user, role: loginData.user.role || 'Personal Trainer' };
            localStorage.setItem("userData", JSON.stringify(loggedInUser));
            userContext?.setUser(loggedInUser);
            toast({ title: "Login bem-sucedido!", description: `Bem-vindo(a) de volta, ${loggedInUser.firstName}!` });
            setLocation("/");
        } catch (err: any) {
            console.error('[Login] Erro durante o login:', err);
            
            // Tratamento específico de erros
            let errorMessage = 'Ocorreu um erro inesperado.';
            
            if (err.message) {
                if (err.message.includes('servidor')) {
                    errorMessage = 'Erro temporário no servidor. Tente novamente em alguns instantes.';
                } else if (err.message.includes('conexão') || err.message.includes('conectar')) {
                    errorMessage = 'Problemas de conexão. Verifique sua internet e tente novamente.';
                } else if (err.message.includes('Credenciais inválidas')) {
                    errorMessage = 'Email ou senha incorretos.';
                } else {
                    errorMessage = err.message;
                }
            }
            
            setError(errorMessage);
            toast({ 
                title: "Erro no Login", 
                description: errorMessage, 
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 lg:grid lg:grid-cols-2">
            {/* Left Side - Login Form */}
            <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo and Title Section */}
                    <div className="text-center space-y-6 animate-fade-in">
                        <div className="flex items-center justify-center">
                            <img 
                                src="/images/logo-branco.png" 
                                alt="DyFit Logo" 
                                className="h-16 w-auto object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Entrar como Personal</h1>
                            <p className="text-slate-300 mt-2">Gerencie seus alunos e rotinas com eficiência</p>
                        </div>
                    </div>

                    {/* Login Form Card */}
                    <Card className="glass border-white/20 shadow-glass animate-slide-up">
                        <CardContent className="p-6">
                            <form onSubmit={handleLogin} className="space-y-6">
                                {error && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm animate-slide-down">
                                        {error}
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input 
                                            id="email-login" 
                                            type="email" 
                                            placeholder="seu.email@exemplo.com" 
                                            required 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)} 
                                            disabled={isLoading} 
                                            autoComplete="email" 
                                            className="pl-12 h-12 text-base bg-background/95 backdrop-blur-sm" 
                                        />
                                    </div>
                                    
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input 
                                            id="password-login" 
                                            type="password" 
                                            placeholder="Sua senha" 
                                            required 
                                            value={password} 
                                            onChange={(e) => setPassword(e.target.value)} 
                                            disabled={isLoading} 
                                            autoComplete="current-password" 
                                            className="pl-12 h-12 text-base bg-background/95 backdrop-blur-sm" 
                                        />
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    size="lg"
                                    className="w-full" 
                                    disabled={isLoading}
                                    loading={isLoading}
                                >
                                    Entrar
                                </Button>
                            </form>
                            
                            <div className="mt-6 text-center">
                                <Link 
                                    href="/login" 
                                    className="inline-flex items-center text-muted-foreground hover:text-white transition-colors group"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                                    Voltar para seleção de perfil
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Right Side - Visual Element (Desktop only) */}
            <div className="hidden lg:flex items-center justify-center p-8">
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 glass border border-white/10 flex items-center justify-center animate-scale-in">
                    <div className="text-center text-white space-y-6">
                        <div className="w-32 h-32 mx-auto bg-gradient-primary rounded-full flex items-center justify-center mb-8 shadow-glass">
                            <Shield className="h-16 w-16" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold">Bem-vindo de volta!</h2>
                            <p className="text-slate-300 max-w-sm">
                                Acesse sua conta e continue transformando vidas através do fitness
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}