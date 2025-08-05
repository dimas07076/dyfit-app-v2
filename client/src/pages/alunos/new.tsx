// client/src/pages/alunos/new.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm, StudentFormDataProcessed } from "@/forms/student-form";
import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/apiClient";
import { Aluno } from "@/types/aluno";
import { StudentLimitIndicator } from "@/components/StudentLimitIndicator";
import useStudentLimit from "@/hooks/useStudentLimit";

export default function NewStudent() {
    const [, navigate] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { status, isLoading: isLimitLoading, canActivateStudents, refreshStatus } = useStudentLimit();

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
            // Refresh student limit status after successful creation
            refreshStatus();
            navigate("/alunos");
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Cadastrar", description: error.message || "Não foi possível adicionar o aluno." });
        },
    });

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Link href="/alunos" className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary/90">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
            </Link>

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Adicionar Novo Aluno</CardTitle>
                    <CardDescription>Insira os dados do novo aluno para começar.</CardDescription>
                    {/* Student Limit Status */}
                    <div className="mt-4">
                        <StudentLimitIndicator 
                            variant="detailed" 
                            showProgress={true} 
                            showRecommendations={!canActivateStudents(1)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <StudentForm
                        onSubmit={(formData) => mutation.mutate(formData)}
                        isLoading={mutation.isPending}
                        isEditing={false}
                        disabled={!canActivateStudents(1) && !isLimitLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
}