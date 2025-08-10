// client/src/pages/alunos/edit.tsx
import React, { useRef } from 'react';
import { Link, useLocation, useParams } from 'wouter'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StudentForm, StudentFormDataProcessed } from '@/forms/student-form';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchWithAuth } from '@/lib/apiClient';
import { Aluno } from '@/types/aluno';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';

const EditStudentPage: React.FC = () => {
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    // Debug logging to check if studentId is extracted correctly
    console.log("EditStudentPage - params:", params);
    console.log("EditStudentPage - studentId:", studentId);
    
    // Ref to trigger token info refresh from the StudentForm
    const tokenRefreshRef = useRef<{ refetch: () => void; forceRefresh: () => Promise<void> } | null>(null);

    // <<< CORREÇÃO AQUI: Atualizado o caminho da API e a queryKey >>>
    const { data: studentData, isLoading, isError, error } = useQuery<Aluno, Error>({
        queryKey: ['aluno', studentId], // Chave mais específica
        queryFn: () => fetchWithAuth<Aluno>(`/api/aluno/gerenciar/${studentId}`),
        enabled: !!studentId,
    });

    // <<< CORREÇÃO AQUI: Atualizado o caminho da API >>>
    const mutation = useMutation<Aluno, Error, StudentFormDataProcessed>({
        mutationFn: (updatedData) => fetchWithAuth<Aluno>(`/api/aluno/gerenciar/${studentId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData),
        }),
        onSuccess: async (updatedStudent, variables) => {
            toast({ title: "Sucesso!", description: `${updatedStudent.nome} atualizado com sucesso.` });
            queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
            queryClient.invalidateQueries({ queryKey: ['aluno', studentId] });
            
            // ENHANCED: Check if status changed and trigger comprehensive token info refresh
            if (studentData?.status !== variables.status) {
                console.log(`[EditStudentPage] 🔄 ENHANCED: Status changed from ${studentData?.status} to ${variables.status}, triggering comprehensive token refresh`);
                
                // Use enhanced force refresh for status changes that might involve token assignment
                if (tokenRefreshRef.current) {
                    if (variables.status === 'active' && studentData?.status === 'inactive') {
                        console.log(`[EditStudentPage] 🚨 ENHANCED: Student activated - using multiple refresh attempts for token assignment`);
                        // Enhanced multi-attempt refresh for activations (might need new token assignment)
                        const attemptRefresh = async (attempt: number = 1, maxAttempts: number = 5) => {
                            try {
                                console.log(`[EditStudentPage] Token refresh attempt ${attempt}/${maxAttempts} for activation`);
                                await tokenRefreshRef.current?.forceRefresh();
                                console.log(`[EditStudentPage] ✅ Token refresh attempt ${attempt} completed successfully`);
                                
                                // Schedule additional attempts for better reliability
                                if (attempt < maxAttempts) {
                                    setTimeout(() => attemptRefresh(attempt + 1, maxAttempts), attempt * 1000);
                                }
                            } catch (error) {
                                console.error(`[EditStudentPage] Token refresh attempt ${attempt} failed:`, error);
                                // Retry with exponential backoff
                                if (attempt < maxAttempts) {
                                    setTimeout(() => attemptRefresh(attempt + 1, maxAttempts), attempt * 1500);
                                }
                            }
                        };
                        
                        // Start the refresh sequence after a short delay
                        setTimeout(() => attemptRefresh(), 1000);
                        
                    } else if (variables.status === 'inactive' && studentData?.status === 'active') {
                        console.log(`[EditStudentPage] 🔄 ENHANCED: Student deactivated - refreshing to show token liberation`);
                        // Refresh to show token has been freed
                        setTimeout(async () => {
                            try {
                                await tokenRefreshRef.current?.forceRefresh();
                                console.log(`[EditStudentPage] ✅ Token refresh completed for deactivation`);
                            } catch (error) {
                                console.error(`[EditStudentPage] Token refresh failed for deactivation:`, error);
                            }
                        }, 500);
                    } else {
                        console.log(`[EditStudentPage] 🔄 ENHANCED: Other status change - using standard refresh`);
                        // Regular refresh for other status changes
                        setTimeout(() => {
                            if (tokenRefreshRef.current) {
                                tokenRefreshRef.current.refetch();
                                console.log(`[EditStudentPage] ✅ Standard refresh completed`);
                            }
                        }, 500);
                    }
                }
            }
            
            setLocation('/alunos');
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
        },
    });

    // Handle missing studentId
    if (!studentId) {
        console.error("EditStudentPage - No studentId found in params");
        return <ErrorMessage title="Erro ao carregar" message="ID do aluno não encontrado na URL." />;
    }

    if (isLoading) {
        console.log("EditStudentPage - Loading student data for ID:", studentId);
        return <LoadingSpinner text="Carregando dados do aluno..." />;
    }
    
    if (isError) {
        console.error("EditStudentPage - Error loading student:", error);
        return <ErrorMessage title="Erro ao carregar" message={error?.message || "Não foi possível encontrar o aluno."} />;
    }

    if (!studentData) {
        console.warn("EditStudentPage - No student data received");
        return <ErrorMessage title="Erro ao carregar" message="Dados do aluno não encontrados." />;
    }

    console.log("EditStudentPage - Student data loaded:", studentData);

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Link href="/alunos" className="inline-flex items-center mb-4 text-sm text-primary hover:text-primary/90">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
            </Link>

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Editar Aluno</CardTitle>
                    <CardDescription>Atualize os dados de {studentData?.nome}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <StudentForm
                        initialData={studentData}
                        isEditing={true}
                        onSubmit={(formData) => mutation.mutate(formData)}
                        isLoading={mutation.isPending}
                        tokenRefreshRef={tokenRefreshRef}
                    />
                </CardContent>
            </Card>
        </div>
    );
}

export default EditStudentPage;