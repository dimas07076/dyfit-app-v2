// client/src/pages/alunos/new.tsx
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm, StudentFormDataProcessed } from "@/forms/student-form";
import { Link, useLocation } from "wouter";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/apiClient";
import { Aluno } from "@/types/aluno";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Interface para a verificação da renovação
interface RenewalRequestCheck {
  _id: string;
  status: string;
}

export default function NewStudent() {
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [loadingCheck, setLoadingCheck] = useState(true);

    // --- INÍCIO DA NOVA LÓGICA DE BLOQUEIO ---
    const { data: pendingRenewal, isLoading: isLoadingRenewal } = useQuery<RenewalRequestCheck[], Error>({
        queryKey: ['pendingRenewalCheck'],
        queryFn: () => fetchWithAuth("/api/personal/renewal-requests?status=approved,cycle_assignment_pending"),
        staleTime: 5 * 60 * 1000, // Cache de 5 minutos
    });

    const hasPendingRenewal = pendingRenewal && pendingRenewal.length > 0;

    useEffect(() => {
        if (!isLoadingRenewal && hasPendingRenewal) {
            toast({
                variant: "destructive",
                title: "Ação Necessária",
                description: "Você precisa finalizar o ciclo do seu novo plano antes de adicionar mais alunos.",
            });
            // Redireciona o usuário para a página correta
            setTimeout(() => navigate("/renovar-plano"), 100);
        }
    }, [isLoadingRenewal, hasPendingRenewal, navigate, toast]);
    // --- FIM DA NOVA LÓGICA DE BLOQUEIO ---

    useEffect(() => {
        // Verifica se o personal tem vagas disponíveis antes de mostrar o formulário
        async function checkSlots() {
            try {
                const res: any = await fetchWithAuth("/api/personal/can-activate/1");
                if (!res?.canActivate) {
                    toast({
                        variant: "destructive",
                        title: "Limite de alunos atingido",
                        description: "Seu plano atual não permite adicionar mais alunos. Faça upgrade ou compre tokens avulsos."
                    });
                    // Redireciona para a lista de alunos
                    navigate("/alunos");
                } else {
                    setLoadingCheck(false);
                }
            } catch (error) {
                console.error("Erro ao verificar limite de alunos:", error);
                // Mesmo com erro, permite prosseguir, a validação final é no backend
                setLoadingCheck(false);
            }
        }
        // Só verifica as vagas se não houver uma renovação pendente
        if (!isLoadingRenewal && !hasPendingRenewal) {
            checkSlots();
        } else if (!isLoadingRenewal) {
            // Se tem renovação pendente, não precisa checar vagas, pois será bloqueado.
            setLoadingCheck(false);
        }
    }, [isLoadingRenewal, hasPendingRenewal, navigate, toast]);

    const mutation = useMutation<Aluno, Error, StudentFormDataProcessed>({
        mutationFn: (newStudentData: StudentFormDataProcessed) => {
            return fetchWithAuth<Aluno>("/api/aluno/gerenciar", {
                method: 'POST',
                body: JSON.stringify(newStudentData),
            });
        },
        onSuccess: (createdStudent) => {
            toast({ title: "Aluno Cadastrado!", description: `${createdStudent?.nome || 'Aluno'} adicionado com sucesso.` });
            queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
            navigate("/alunos");
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Cadastrar", description: error.message || "Não foi possível adicionar o aluno." });
        },
    });

    if (loadingCheck || isLoadingRenewal) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <LoadingSpinner text="Verificando seu plano e vagas disponíveis..." />
            </div>
        );
    }

    // --- RENDERIZAÇÃO DO BLOQUEIO ---
    if (hasPendingRenewal) {
        return (
            <div className="p-4 md:p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Finalização de Ciclo Pendente</AlertTitle>
                    <AlertDescription>
                        <p className="mb-4">
                            Para adicionar novos alunos, primeiro você precisa finalizar a configuração do seu novo plano, selecionando quais alunos continuarão ativos.
                        </p>
                        <Button onClick={() => navigate("/renovar-plano")}>
                            Finalizar Ciclo Agora
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    // --- FIM DA RENDERIZAÇÃO DO BLOQUEIO ---

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Link href="/alunos" className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary/90">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
            </Link>

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Adicionar Novo Aluno</CardTitle>
                    <CardDescription>Insira os dados do novo aluno para começar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <StudentForm
                        onSubmit={(formData) => mutation.mutate(formData)}
                        isLoading={mutation.isPending}
                        isEditing={false}
                    />
                </CardContent>
            </Card>
        </div>
    );
}