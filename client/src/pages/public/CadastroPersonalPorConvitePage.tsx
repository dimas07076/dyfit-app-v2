// Localização: client/src/pages/public/CadastroPersonalPorConvitePage.tsx
import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ShieldCheck, Users, BarChart, User, Mail, KeyRound } from 'lucide-react';

const formSchema = z.object({
  nome: z.string().min(3, { message: "O nome completo é obrigatório." }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;
type ValidacaoTokenResponse = { emailConvidado?: string };

const CadastroPersonalPorConvitePage: React.FC = () => {
  const params = useParams<{ tokenDeConvite?: string }>();
  const tokenDeConvite = params.tokenDeConvite;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [emailConvidado, setEmailConvidado] = useState<string | undefined>();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: '', email: '', password: '', confirmPassword: '' },
  });

  const validationQuery = useQuery({
    queryKey: ['validatePersonalInvite', tokenDeConvite],
    queryFn: async () => {
      const data = await apiRequest<ValidacaoTokenResponse>('GET', `/api/public/convites/validar/${tokenDeConvite}`);
      if (data.emailConvidado) {
        setEmailConvidado(data.emailConvidado);
        form.setValue('email', data.emailConvidado);
      }
      return data;
    },
    enabled: !!tokenDeConvite,
    retry: false,
  });

  const registrationMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const { confirmPassword, ...payload } = data;
      return apiRequest('POST', `/api/public/convites/registrar/${tokenDeConvite}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Cadastro Realizado com Sucesso!",
        description: "Sua conta foi criada. Você já pode fazer o login.",
      });
      setRegistrationSuccess(true);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error.message || "Não foi possível completar o cadastro.",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    registrationMutation.mutate(data);
  };

  if (validationQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-slate-700">Validando seu convite...</p>
      </div>
    );
  }

  if (validationQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground bg-destructive/10 p-3 rounded-md">{validationQuery.error.message || "O link é inválido, expirou ou já foi utilizado."}</p>
            <p className="mt-4 text-sm text-slate-600">Por favor, solicite um novo link ao administrador da plataforma.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">Cadastro Concluído!</CardTitle>
            <CardDescription className="text-base pt-2">Sua jornada no DyFit começa agora!</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">Sua conta foi criada com sucesso e está pronta para uso.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setLocation('/login')} className="w-full">
              Ir para a tela de Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center bg-white shadow-2xl rounded-xl overflow-hidden">
        {/* Coluna Esquerda: Visual */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-gray-900 to-gray-800 h-full text-primary-foreground">
          <img src="/logodyfit.png" alt="Logo DyFit" className="w-28 h-auto mb-8" />
          <h1 className="text-4xl font-bold leading-tight">Dê um upgrade na sua carreira.</h1>
          <p className="mt-4 text-lg text-primary-foreground/90">Junte-se a uma comunidade de personais que estão transformando a maneira de treinar.</p>
          <ul className="mt-8 space-y-4 text-base">
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-green-300" />
              <span>Gestão completa e segura de alunos.</span>
            </li>
            <li className="flex items-center gap-3">
              <Users className="h-6 w-6 text-green-300" />
              <span>Crie e personalize treinos com facilidade.</span>
            </li>
            <li className="flex items-center gap-3">
              <BarChart className="h-6 w-6 text-green-300" />
              <span>Acompanhe o progresso com relatórios visuais.</span>
            </li>
          </ul>
        </div>

        {/* Coluna Direita: Formulário */}
        <div className="p-8 lg:p-12">
          <div className="lg:hidden text-center mb-8">
             <img src="/logodyfit.png" alt="Logo DyFit" className="w-20 h-auto mx-auto mb-4" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Bem-vindo(a) ao DyFit!</h2>
          <p className="text-slate-600 mt-2">Parabéns por se juntar à mais completa ferramenta de gestão para Personal Trainers. Crie sua conta para começar.</p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input placeholder="Seu nome completo" {...field} className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                       <Input placeholder="seu.email@exemplo.com" {...field} disabled={!!emailConvidado} className="pl-10 disabled:opacity-70 disabled:cursor-not-allowed" />
                    </div>
                  </FormControl>
                  {emailConvidado && <p className="text-xs text-muted-foreground mt-1">Este e-mail foi pré-definido pelo convite.</p>}
                  <FormMessage />
                </FormItem>
              )}/>

              <div className="grid sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crie sua Senha</FormLabel>
                    <FormControl>
                       <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input type="password" placeholder="Mín. 6 caracteres" {...field} className="pl-10" />
                       </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme a Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input type="password" placeholder="Repita a senha" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <Button type="submit" className="w-full text-lg font-semibold py-6" disabled={registrationMutation.isPending}>
                {registrationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Minha Conta
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default CadastroPersonalPorConvitePage;