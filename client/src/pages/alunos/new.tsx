// client/src/pages/alunos/new.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm, StudentFormDataProcessed } from "@/forms/student-form";
import { Link, useLocation } from "wouter";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/apiClient";
import { Aluno } from "@/types/aluno";
import { useSlotAvailability } from "@/hooks/use-slot-management";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function NewStudent() {
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    // Check slot availability before allowing student creation
    const { data: slotCheck, isLoading: isCheckingSlots, error: slotError } = useSlotAvailability(1);

    // <<< CORREÇÃO AQUI: Atualizado o caminho da API >>>
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
            queryClient.invalidateQueries({ queryKey: ["slot-availability"] });
            queryClient.invalidateQueries({ queryKey: ["plan-status"] });
            navigate("/alunos");
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Cadastrar", description: error.message || "Não foi possível adicionar o aluno." });
        },
    });

    if (isCheckingSlots) {
        return <LoadingSpinner text="Verificando disponibilidade de slots..." />;
    }

    const canCreateStudent = slotCheck?.podeAtivar === true;

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
                    {!canCreateStudent && (
                        <Alert className="mb-6">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-2">
                                    <p><strong>Limite de alunos atingido!</strong></p>
                                    <p>{slotCheck?.message || 'Você atingiu o limite de alunos do seu plano atual.'}</p>
                                    {slotCheck?.details && (
                                        <div className="text-sm mt-2">
                                            {slotCheck.details.plano && (
                                                <p>
                                                    Plano {slotCheck.details.plano.tipo}: {slotCheck.details.plano.utilizados}/{slotCheck.details.plano.limite} alunos
                                                </p>
                                            )}
                                            {slotCheck.details.tokens && slotCheck.details.tokens.disponiveis > 0 && (
                                                <p>Tokens disponíveis: {slotCheck.details.tokens.disponiveis}</p>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        <Button variant="outline" size="sm" onClick={() => navigate("/admin/planos")}>
                                            Gerenciar Planos
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                                            Verificar Novamente
                                        </Button>
                                    </div>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    <StudentForm
                        onSubmit={(formData) => mutation.mutate(formData)}
                        isLoading={mutation.isPending}
                        isEditing={false}
                        disabled={!canCreateStudent}
                    />
                </CardContent>
            </Card>
        </div>
    );
}