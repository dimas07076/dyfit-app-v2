// Localização: client/src/pages/public/AlunoLoginPage.tsx
import React, { useState, useContext, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { AlunoContext } from '@/context/AlunoContext';
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

interface AlunoLoginApiResponse {
    message: string;
    token: string;
    aluno: { id: string; nome: string; email: string; role: 'Aluno'; personalId: string; };
}

// Componente para o formulário de login do Aluno, para reutilização
const AlunoLoginForm = () => {
    const alunoContext = useContext(AlunoContext);
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const { loginAluno } = alunoContext || {};

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
            loginAluno?.(response.token);
            toast({ title: "Login bem-sucedido!", description: `Bem-vindo(a) de volta, ${response.aluno.nome || 'Aluno'}!` });
        } catch (err: any) {
            setError(err.message || 'Credenciais inválidas ou erro no servidor.');
            toast({ title: "Erro no Login", description: err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Card className="w-full max-w-sm border-none shadow-xl animate-in fade-in-50 slide-in-from-bottom-10 duration-500">
            <CardHeader className="text-center space-y-2 pt-8">
                <CardTitle className="text-3xl font-bold">Entrar como Aluno</CardTitle>
                <CardDescription>Acesse seus treinos e acompanhe seu progresso.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
                <form onSubmit={handleLoginAluno} className="grid gap-4">
                    {error && ( <p className="text-red-500 text-sm text-center -mt-2 mb-2">{error}</p> )}
                    <div className="grid gap-2 relative mt-4">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input id="email-aluno" type="email" placeholder="seu.email@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} autoComplete="email" className="pl-10 h-12 text-base" />
                    </div>
                    <div className="grid gap-2 relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input id="password-aluno" type="password" placeholder="Sua senha" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} autoComplete="current-password" className="pl-10 h-12 text-base" />
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
}


export default function AlunoLoginPage() {
    const [, navigate] = useLocation();
    const alunoContext = useContext(AlunoContext);
    const { aluno: alunoLogado, isLoadingAluno } = alunoContext || {};

    useEffect(() => {
        if (!isLoadingAluno && alunoLogado) {
            navigate("/aluno/dashboard", { replace: true }); 
        }
    }, [alunoLogado, isLoadingAluno, navigate]);

    if (isLoadingAluno) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /> <span className="ml-2">Verificando sessão...</span></div>;
    }

    return (
        <div className="min-h-screen w-full">
            {/* 
                ============================================================
                LAYOUT DESKTOP (Visível em 'lg' e acima)
                ============================================================
            */}
            <div className="hidden lg:grid lg:grid-cols-2 min-h-screen">
                <div className="flex items-center justify-center py-12 px-4">
                    <AlunoLoginForm />
                </div>
                <div className="hidden bg-muted lg:block">
                    <img src="/images/login-aluno.png" alt="Imagem de um aluno treinando" className="h-full w-full object-cover dark:brightness-[0.8]" />
                </div>
            </div>

            {/* 
                ============================================================
                LAYOUT MOBILE (Visível abaixo de 'lg')
                ============================================================
            */}
            <div className="lg:hidden min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-sky-500 to-blue-700 p-4 relative">
                <div className="absolute top-8 sm:top-12">
                    <img src="/images/logo-branco.png" alt="Logo DyFit" className="h-24 sm:h-28" />
                </div>
                <AlunoLoginForm />
            </div>
        </div>
    );
}