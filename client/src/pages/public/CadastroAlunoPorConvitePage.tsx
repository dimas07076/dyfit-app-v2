// client/src/pages/public/CadastroAlunoPorConvitePage.tsx
import React, { useState } from 'react'; // 'useEffect' removido daqui
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';

const formSchema = z.object({
  email: z.string().email("Por favor, insira um e-mail válido.").optional(),
  nome: z.string().min(3, "Nome completo é obrigatório."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória."),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  goal: z.string().min(1, "Objetivo é obrigatório."),
  weight: z.string().min(1, "Peso é obrigatório.").refine(val => !isNaN(parseFloat(val.replace(',', '.'))), "Deve ser um número."),
  height: z.string().min(1, "Altura é obrigatória.").refine(val => /^\d+$/.test(val), "Deve ser um número inteiro."),
  startDate: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
}).refine(data => {
    // Torna o e-mail obrigatório apenas se não for fornecido pela API
    if (!data.email) return false;
    return true;
}, {
    message: "O e-mail é obrigatório.",
    path: ["email"],
});

type FormValues = z.infer<typeof formSchema>;

const CadastroAlunoPorConvitePage: React.FC = () => {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [emailConvidado, setEmailConvidado] = useState<string | null>(null);
  const [personalName, setPersonalName] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "", nome: "", password: "", confirmPassword: "", phone: "", birthDate: "",
      goal: "", weight: "", height: "", startDate: new Date().toISOString().split('T')[0]
    },
  });

  const { isLoading: isValidating, isError, error: validationError } = useQuery({
    queryKey: ['validateAlunoInvite', token],
    queryFn: async () => {
      const data = await apiRequest<{ email?: string; personalName: string }>('GET', `/api/public/convite-aluno/${token}`);
      if (data.email) {
        setEmailConvidado(data.email);
        form.setValue('email', data.email); // Pré-popula o formulário com o e-mail
      }
      setPersonalName(data.personalName);
      return data;
    },
    enabled: !!token,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: (data: FormValues) => {
        const { confirmPassword, ...payload } = data;
        return apiRequest('POST', '/api/public/convite-aluno/registrar', {
          token,
          ...payload,
          weight: parseFloat(payload.weight.replace(',', '.')),
          height: parseInt(payload.height, 10),
        })
    },
    onSuccess: () => {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você já pode fazer login com seu e-mail e senha.",
      });
      setLocation('/aluno/login');
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro no Cadastro", description: error.message });
    },
  });

  const onSubmit = (data: FormValues) => registerMutation.mutate(data);
  
  if (isValidating) return <LoadingSpinner text="Validando convite..." />;
  if (isError) return <ErrorMessage title="Convite Inválido" message={validationError?.message || "O link de convite que você usou é inválido ou já expirou."} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-lg bg-white text-gray-800 shadow-lg">
        <CardHeader className="text-center pb-4">
          <img src="/logodyfit.png" alt="DyFit Logo" className="mx-auto mb-4 h-12 w-auto" />
          <CardTitle className="text-2xl font-bold text-primary">Bem-vindo(a) ao DyFit!</CardTitle>
          {personalName && (
            <CardDescription className="text-lg text-gray-600 mt-2">
              Seu personal, <span className="font-semibold text-primary">{personalName}</span>, te convidou.
            </CardDescription>
          )}
          <CardDescription className="text-gray-600">Complete seus dados para acessar a plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emailConvidado ? (
                  <FormItem>
                    <FormLabel className="text-gray-700">Email</FormLabel>
                    <FormControl><Input value={emailConvidado} disabled className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                  </FormItem>
                ) : (
                  <FormField control={form.control} name="email" render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Email*</FormLabel>
                      <FormControl><Input placeholder="seu.email@exemplo.com" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} />
                )}
                <FormField control={form.control} name="nome" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Nome Completo*</FormLabel>
                    <FormControl><Input placeholder="Seu nome completo" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                {/* ... outros campos do formulário permanecem iguais ... */}
                <FormField control={form.control} name="password" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Crie uma Senha*</FormLabel>
                    <FormControl><Input type="password" placeholder="Mínimo de 6 caracteres" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Confirme sua Senha*</FormLabel>
                    <FormControl><Input type="password" placeholder="Repita a senha" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Telefone</FormLabel>
                    <FormControl><Input placeholder="(00) 00000-0000" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="birthDate" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Data de Nascimento*</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="gender" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Gênero*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white text-gray-800 border-gray-300">
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="goal" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Objetivo Principal*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white text-gray-800 border-gray-300">
                        <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                        <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="weight" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Peso (kg)*</FormLabel>
                    <FormControl><Input placeholder="Ex: 75.5" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="height" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Altura (cm)*</FormLabel>
                    <FormControl><Input placeholder="Ex: 178" {...field} className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel className="text-gray-700">Data de Início</FormLabel>
                    <FormControl><Input type="date" {...field} disabled className="bg-gray-50 border-gray-300 text-gray-800" /></FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
              </div>
              <Button type="submit" className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90" disabled={registerMutation.isPending}>
                {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finalizar Cadastro
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroAlunoPorConvitePage;