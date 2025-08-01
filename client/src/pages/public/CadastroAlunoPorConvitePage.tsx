import React, { useState, useEffect } from 'react';
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

// Schema corrigido sem conflitos de validação
const formSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório.").email("Por favor, insira um e-mail válido."),
  nome: z.string().min(3, "Nome completo é obrigatório."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória."),
  phone: z.string().optional(),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória."),
  gender: z.enum(['masculino', 'feminino', 'outro'], {
    errorMap: () => ({ message: "Por favor, selecione um gênero." })
  }),
  goal: z.string().min(1, "Objetivo é obrigatório."),
  weight: z.string().min(1, "Peso é obrigatório.").refine(val => !isNaN(parseFloat(val.replace(',', '.'))), "Deve ser um número válido."),
  height: z.string().min(1, "Altura é obrigatória.").refine(val => /^\d+$/.test(val), "Deve ser um número inteiro."),
  startDate: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
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
      email: "",
      nome: "",
      password: "",
      confirmPassword: "",
      phone: "",
      birthDate: "",
      gender: undefined,
      goal: "",
      weight: "",
      height: "",
      startDate: new Date().toISOString().split('T')[0]
    },
  });

  const { data: conviteData, isLoading: isValidating, isError, error: validationError } = useQuery({
    queryKey: ['validateAlunoInvite', token],
    queryFn: async () => {
      try {
        const data = await apiRequest<{ email?: string; personalName: string }>('GET', `/api/public/convite-aluno/${token}`);
        return data;
      } catch (error: any) {
        console.error('Erro ao validar convite:', error);
        throw error;
      }
    },
    enabled: !!token,
    retry: false,
  });

  // UseEffect para atualizar o formulário quando os dados do convite chegarem
  useEffect(() => {
    if (conviteData) {
      if (conviteData.email) {
        setEmailConvidado(conviteData.email);
        form.setValue('email', conviteData.email);
        // Força a revalidação do campo email
        form.trigger('email');
      }
      setPersonalName(conviteData.personalName);
    }
  }, [conviteData, form]);

  const registerMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      try {
        const { confirmPassword, ...payload } = data;
        const response = await apiRequest('POST', '/api/public/convite-aluno/registrar', {
          token,
          ...payload,
          weight: parseFloat(payload.weight.replace(',', '.')),
          height: parseInt(payload.height, 10),
        });
        return response;
      } catch (error: any) {
        console.error('Erro no registro:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você já pode fazer login com seu e-mail e senha.",
      });
      setLocation('/aluno/login');
    },
    onError: (error: any) => {
      console.error('Erro na mutation:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro no Cadastro", 
        description: error?.message || "Ocorreu um erro inesperado. Tente novamente." 
      });
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      console.log('Dados do formulário sendo enviados:', {
        ...data,
        password: '[HIDDEN]',
        confirmPassword: '[HIDDEN]'
      });
      
      // Validação adicional antes do envio
      if (!data.email) {
        toast({
          variant: "destructive",
          title: "Erro de Validação",
          description: "E-mail é obrigatório."
        });
        return;
      }

      if (data.password !== data.confirmPassword) {
        toast({
          variant: "destructive",
          title: "Erro de Validação",
          description: "As senhas não coincidem."
        });
        return;
      }

      registerMutation.mutate(data);
    } catch (error) {
      console.error('Erro no onSubmit:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente."
      });
    }
  };
  
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
                    <FormControl>
                      <Input 
                        value={emailConvidado} 
                        disabled 
                        className="bg-gray-100 border-gray-300 text-gray-800 cursor-not-allowed" 
                      />
                    </FormControl>
                  </FormItem>
                ) : (
                  <FormField 
                    control={form.control} 
                    name="email" 
                    render={({ field }) => ( 
                      <FormItem>
                        <FormLabel className="text-gray-700">Email*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="seu.email@exemplo.com" 
                            {...field} 
                            className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem> 
                    )} 
                  />
                )}
                
                <FormField 
                  control={form.control} 
                  name="nome" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Nome Completo*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Seu nome completo" 
                          {...field} 
                          className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="password" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Crie uma Senha*</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Mínimo de 6 caracteres" 
                          {...field} 
                          className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="confirmPassword" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Confirme sua Senha*</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Repita a senha" 
                          {...field} 
                          className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="phone" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(00) 00000-0000" 
                          {...field} 
                          className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="birthDate" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Data de Nascimento*</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="gender" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Gênero*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="goal" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Objetivo Principal*</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="weight" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Peso (kg)*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 75.5" 
                          {...field} 
                          className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="height" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Altura (cm)*</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: 178" 
                          {...field} 
                          className="bg-gray-50 border-gray-300 text-gray-800 focus:ring-primary" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
                
                <FormField 
                  control={form.control} 
                  name="startDate" 
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel className="text-gray-700">Data de Início</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          disabled 
                          className="bg-gray-100 border-gray-300 text-gray-800 cursor-not-allowed" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem> 
                  )} 
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90" 
                disabled={registerMutation.isPending}
              >
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