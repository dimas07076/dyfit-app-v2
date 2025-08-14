// client/src/pages/alunos/new.tsx
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm, StudentFormDataProcessed } from "@/forms/student-form";
import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/apiClient";
import { Aluno } from "@/types/aluno";

export default function NewStudent() {
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Estado que controla se já checamos o limite de vagas
    const [loadingCheck, setLoadingCheck] = useState(true);

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
            }
        }
        checkSlots();
        // desabilita warning do eslint caso esteja usando
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    // Enquanto verifica o limite, mostra uma mensagem simples
    if (loadingCheck) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                <p className="text-sm text-muted-foreground">Verificando disponibilidade de vagas...</p>
            </div>
        );
    }

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
