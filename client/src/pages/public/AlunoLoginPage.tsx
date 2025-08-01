// Localização: client/src/pages/public/AlunoLoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAluno } from '@/context/AlunoContext';
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
    const { loginAluno, aluno: alunoLogado, isLoadingAluno } = useAluno();
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

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
            localStorage.setItem('alunoRefreshToken', response.refreshToken);
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
            <div className="flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
                                <GraduationCap className="h-12 w-12 text-white" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            Portal do Aluno
                        </h1>
                        <p className="text-purple-100">
                            Acesse sua área de treinos e acompanhe seu progresso
                        </p>
                    </div>

                    {/* Login Form */}
                    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
                        <CardContent className="p-8">
                            <form onSubmit={handleLoginAluno} className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                            <Input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="seu-email@exemplo.com"
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                            Senha
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                            <Input
                                                id="password"
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Digite sua senha"
                                                className="pl-10 h-12"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                            Entrando...
                                        </div>
                                    ) : (
                                        "Entrar"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Back to Home */}
                    <div className="text-center">
                        <Link href="/" className="inline-flex items-center text-white/80 hover:text-white transition-colors">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar ao início
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Hero Image/Content */}
            <div className="hidden lg:flex items-center justify-center bg-white/10 backdrop-blur-sm">
                <div className="text-center text-white p-12">
                    <User className="h-32 w-32 mx-auto mb-8 opacity-80" />
                    <h2 className="text-4xl font-bold mb-4">
                        Seu Treino Personalizado
                    </h2>
                    <p className="text-xl text-purple-100 leading-relaxed">
                        Acesse suas fichas de treino, acompanhe seu progresso e mantenha-se motivado em sua jornada fitness.
                    </p>
                </div>
            </div>
        </div>
    );
}