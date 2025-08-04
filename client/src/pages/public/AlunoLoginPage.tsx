// Localização: client/src/pages/public/AlunoLoginPage.tsx
import React, { useState, useContext, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { AlunoContext } from '@/context/AlunoContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Lock, User, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

interface AlunoLoginApiResponse {
    message: string;
    token: string;
    refreshToken: string;
    aluno: { id: string; nome: string; email: string; role: 'Aluno'; personalId: string; };
    code?: string;
}

export default function AlunoLoginPage() {
    const [, navigate] = useLocation();
    const alunoContext = useContext(AlunoContext);
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const { loginAluno, aluno: alunoLogado, isLoadingAluno } = alunoContext || {};

    useEffect(() => {
        if (!isLoadingAluno && alunoLogado) {
            navigate("/aluno/dashboard", { replace: true }); 
        }
    }, [alunoLogado, isLoadingAluno, navigate]);

    const handleLoginAluno = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const response = await apiRequest<AlunoLoginApiResponse>(
                'POST',
                '/api/auth/aluno/login', 
                { email: email.toLowerCase().trim(), password }
            );
            loginAluno?.(response.token, response.refreshToken);
            toast({ title: "Login bem-sucedido!", description: `Bem-vindo(a) de volta, ${response.aluno.nome || 'Aluno'}!` });
        } catch (err: any) {
            const errorMessage = err.message || 'Credenciais inválidas ou erro no servidor.';
            const errorCode = err.code;

            if (errorCode === 'ACCOUNT_INACTIVE') {
                setError('Sua conta está inativa. Por favor, entre em contato com seu personal trainer para reativá-la.');
            } else {
                setError(errorMessage);
            }
            toast({ title: "Erro no Login", description: errorMessage, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isLoadingAluno) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
                <div className="text-white text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto" />
                    <span className="text-lg">Verificando sessão...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 lg:grid lg:grid-cols-2">
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
                            <h1 className="text-3xl font-bold text-white">Entrar como Aluno</h1>
                            <p className="text-white/80 mt-2">Acesse seus treinos e acompanhe seu progresso</p>
                        </div>
                    </div>

                    {/* Login Form Card */}
                    <Card className="glass border-white/20 shadow-glass animate-slide-up">
                        <CardContent className="p-6">
                            <form onSubmit={handleLoginAluno} className="space-y-6">
                                {error && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm animate-slide-down">
                                        {error}
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input 
                                            id="email-aluno" 
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
                                            id="password-aluno" 
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
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700" 
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
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-white/10 to-white/5 glass border border-white/10 flex items-center justify-center animate-scale-in">
                    <div className="text-center text-white space-y-6">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-r from-white/20 to-white/10 rounded-full flex items-center justify-center mb-8 shadow-glass border border-white/20">
                            <GraduationCap className="h-16 w-16" />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold">Sua jornada fitness continua!</h2>
                            <p className="text-white/80 max-w-sm">
                                Acesse seus treinos personalizados e acompanhe sua evolução
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}