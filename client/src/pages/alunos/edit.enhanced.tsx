// client/src/pages/alunos/edit.enhanced.tsx - Enhanced edit page with robust token functionality
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EnhancedStudentForm, StudentFormDataProcessed } from '@/forms/student-form.enhanced';
import { ChevronLeft, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchWithAuth } from '@/lib/apiClient';
import { Aluno } from '@/types/aluno';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';

interface TokenAssignmentStatus {
    isProcessing: boolean;
    lastStatusChange: {
        from: 'active' | 'inactive';
        to: 'active' | 'inactive';
        timestamp: Date;
    } | null;
    pendingTokenAssignment: boolean;
}

const EnhancedEditStudentPage: React.FC = () => {
    const params = useParams<{ id: string }>();
    const studentId = params.id;
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    // Enhanced state management for token operations
    const [tokenAssignmentStatus, setTokenAssignmentStatus] = useState<TokenAssignmentStatus>({
        isProcessing: false,
        lastStatusChange: null,
        pendingTokenAssignment: false
    });
    
    // Ref to trigger token info refresh from the StudentForm
    const tokenRefreshRef = useRef<{ refetch: () => void; forceRefresh: () => Promise<void> } | null>(null);

    // Debug logging
    console.log("EnhancedEditStudentPage - params:", params);
    console.log("EnhancedEditStudentPage - studentId:", studentId);
    
    // Enhanced student data fetching
    const { data: studentData, isLoading, isError, error, refetch: refetchStudent } = useQuery<Aluno, Error>({
        queryKey: ['aluno', studentId],
        queryFn: () => {
            console.log(`[EnhancedEditStudentPage] Fetching student data for ID: ${studentId}`);
            return fetchWithAuth<Aluno>(`/api/aluno/gerenciar/${studentId}`);
        },
        enabled: !!studentId,
        retry: 2,
        staleTime: 1 * 60 * 1000, // 1 minute
    });

    // Enhanced mutation with comprehensive token handling
    const mutation = useMutation<Aluno, Error, StudentFormDataProcessed>({
        mutationFn: async (updatedData) => {
            console.log(`[EnhancedEditStudentPage] Updating student ${studentId} with data:`, updatedData);
            
            // Set processing state
            setTokenAssignmentStatus(prev => ({
                ...prev,
                isProcessing: true,
                pendingTokenAssignment: studentData?.status !== updatedData.status && updatedData.status === 'active'
            }));

            return fetchWithAuth<Aluno>(`/api/aluno/gerenciar/${studentId}`, {
                method: 'PUT',
                body: JSON.stringify(updatedData),
            });
        },
        onSuccess: async (updatedStudent, variables) => {
            const statusChanged = studentData?.status !== variables.status;
            
            console.log(`[EnhancedEditStudentPage] ✅ Student updated successfully:`, {
                studentId: updatedStudent._id,
                newStatus: updatedStudent.status,
                statusChanged,
                wasActivated: statusChanged && variables.status === 'active',
                wasDeactivated: statusChanged && variables.status === 'inactive'
            });

            toast({ 
                title: "Sucesso!", 
                description: `${updatedStudent.nome} atualizado com sucesso.`,
                duration: 3000
            });

            // Update token assignment status
            if (statusChanged) {
                setTokenAssignmentStatus(prev => ({
                    ...prev,
                    lastStatusChange: {
                        from: studentData?.status || 'inactive',
                        to: variables.status,
                        timestamp: new Date()
                    }
                }));
            }

            // Comprehensive cache invalidation
            queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
            queryClient.invalidateQueries({ queryKey: ['aluno', studentId] });
            queryClient.invalidateQueries({ queryKey: ['studentLimitStatus'] });

            // Enhanced token refresh handling based on status change
            if (statusChanged && tokenRefreshRef.current) {
                console.log(`[EnhancedEditStudentPage] 🔄 Status changed from ${studentData?.status} to ${variables.status}`);
                
                if (variables.status === 'active' && studentData?.status === 'inactive') {
                    // Student activated - may need new token assignment
                    console.log(`[EnhancedEditStudentPage] 🚨 Student activated - triggering comprehensive token refresh`);
                    
                    // Multiple refresh attempts with increasing delays for token assignment
                    const attemptTokenRefresh = async (attempt: number = 1, maxAttempts: number = 5) => {
                        try {
                            console.log(`[EnhancedEditStudentPage] Token refresh attempt ${attempt}/${maxAttempts}`);
                            await tokenRefreshRef.current?.forceRefresh();
                            
                            // Wait a bit longer for each attempt to allow server processing
                            if (attempt < maxAttempts) {
                                setTimeout(() => attemptTokenRefresh(attempt + 1, maxAttempts), attempt * 1000);
                            } else {
                                setTokenAssignmentStatus(prev => ({ ...prev, isProcessing: false }));
                                console.log(`[EnhancedEditStudentPage] ✅ Token refresh sequence completed`);
                            }
                        } catch (error) {
                            console.error(`[EnhancedEditStudentPage] Token refresh attempt ${attempt} failed:`, error);
                            if (attempt < maxAttempts) {
                                setTimeout(() => attemptTokenRefresh(attempt + 1, maxAttempts), attempt * 1500);
                            } else {
                                setTokenAssignmentStatus(prev => ({ ...prev, isProcessing: false }));
                            }
                        }
                    };

                    // Start token refresh sequence
                    setTimeout(() => attemptTokenRefresh(), 1000);
                    
                } else if (variables.status === 'inactive' && studentData?.status === 'active') {
                    // Student deactivated - token should be freed
                    console.log(`[EnhancedEditStudentPage] 🔄 Student deactivated - refreshing token status`);
                    setTimeout(async () => {
                        try {
                            await tokenRefreshRef.current?.forceRefresh();
                            setTokenAssignmentStatus(prev => ({ ...prev, isProcessing: false }));
                            console.log(`[EnhancedEditStudentPage] ✅ Token status refreshed after deactivation`);
                        } catch (error) {
                            console.error(`[EnhancedEditStudentPage] Token refresh failed after deactivation:`, error);
                            setTokenAssignmentStatus(prev => ({ ...prev, isProcessing: false }));
                        }
                    }, 500);
                } else {
                    // No status change or other change - regular refresh
                    setTimeout(() => {
                        tokenRefreshRef.current?.refetch();
                        setTokenAssignmentStatus(prev => ({ ...prev, isProcessing: false }));
                    }, 200);
                }
            } else {
                setTokenAssignmentStatus(prev => ({ ...prev, isProcessing: false }));
            }
            
            // Navigate back after a short delay to allow users to see success message
            setTimeout(() => {
                setLocation('/alunos');
            }, 1500);
        },
        onError: (error) => {
            console.error(`[EnhancedEditStudentPage] ❌ Error updating student:`, error);
            setTokenAssignmentStatus(prev => ({ ...prev, isProcessing: false, pendingTokenAssignment: false }));
            toast({ 
                variant: "destructive", 
                title: "Erro ao atualizar", 
                description: error.message || "Não foi possível atualizar o aluno."
            });
        },
    });

    // Enhanced status change handler
    const handleStatusChange = useCallback((newStatus: 'active' | 'inactive', oldStatus?: 'active' | 'inactive') => {
        console.log(`[EnhancedEditStudentPage] Status change detected: ${oldStatus} -> ${newStatus}`);
        
        // Update UI state immediately for responsive feedback
        if (oldStatus && oldStatus !== newStatus) {
            setTokenAssignmentStatus(prev => ({
                ...prev,
                pendingTokenAssignment: newStatus === 'active'
            }));
        }
    }, []);

    // Manual refresh handler
    const handleManualRefresh = useCallback(async () => {
        console.log(`[EnhancedEditStudentPage] Manual refresh triggered`);
        
        try {
            // Refresh both student data and token info
            await Promise.all([
                refetchStudent(),
                tokenRefreshRef.current?.forceRefresh()
            ]);
            
            toast({
                title: "Atualizado",
                description: "Dados do aluno e token atualizados.",
                duration: 2000
            });
        } catch (error) {
            console.error(`[EnhancedEditStudentPage] Manual refresh failed:`, error);
            toast({
                variant: "destructive",
                title: "Erro ao atualizar",
                description: "Não foi possível atualizar os dados."
            });
        }
    }, [refetchStudent]);

    // Handle missing studentId
    if (!studentId) {
        console.error("EnhancedEditStudentPage - No studentId found in params");
        return <ErrorMessage title="Erro ao carregar" message="ID do aluno não encontrado na URL." />;
    }

    if (isLoading) {
        console.log("EnhancedEditStudentPage - Loading student data for ID:", studentId);
        return <LoadingSpinner text="Carregando dados do aluno..." />;
    }
    
    if (isError) {
        console.error("EnhancedEditStudentPage - Error loading student:", error);
        return <ErrorMessage title="Erro ao carregar" message={error?.message || "Não foi possível encontrar o aluno."} />;
    }

    if (!studentData) {
        console.warn("EnhancedEditStudentPage - No student data received");
        return <ErrorMessage title="Erro ao carregar" message="Dados do aluno não encontrados." />;
    }

    console.log("EnhancedEditStudentPage - Student data loaded:", studentData);

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 dark:from-slate-900 dark:via-slate-800/95 dark:to-indigo-900/80">
            
            {/* Enhanced Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <Link href="/alunos" className="inline-flex items-center mb-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Alunos
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Editar Aluno: {studentData?.nome}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Atualize os dados e gerencie o token associado
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <Button variant="outline" onClick={handleManualRefresh} disabled={isLoading}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar Dados
                    </Button>
                </div>
            </div>

            {/* Token Processing Status Alert */}
            {tokenAssignmentStatus.isProcessing && (
                <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                        <div className="flex items-center justify-between">
                            <span>
                                {tokenAssignmentStatus.pendingTokenAssignment 
                                    ? "Processando ativação do aluno e atribuição de token..."
                                    : "Processando alterações no status do aluno..."
                                }
                            </span>
                            <div className="flex items-center ml-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Recent Status Change Info */}
            {tokenAssignmentStatus.lastStatusChange && !tokenAssignmentStatus.isProcessing && (
                <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                        Status alterado de "{tokenAssignmentStatus.lastStatusChange.from === 'active' ? 'Ativo' : 'Inativo'}" para "{tokenAssignmentStatus.lastStatusChange.to === 'active' ? 'Ativo' : 'Inativo'}" em {tokenAssignmentStatus.lastStatusChange.timestamp.toLocaleTimeString()}.
                        {tokenAssignmentStatus.lastStatusChange.to === 'active' && " Token foi atribuído automaticamente."}
                        {tokenAssignmentStatus.lastStatusChange.to === 'inactive' && " Token foi liberado."}
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Form Card */}
            <Card className="max-w-4xl mx-auto shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Dados do Aluno</CardTitle>
                            <CardDescription>
                                Edite as informações de {studentData?.nome} com controle completo de token.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={studentData?.status === 'active' ? 'default' : 'secondary'}>
                                {studentData?.status === 'active' ? 'Ativo' : 'Inativo'}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                    <EnhancedStudentForm
                        initialData={studentData}
                        isEditing={true}
                        onSubmit={(formData) => mutation.mutate(formData)}
                        isLoading={mutation.isPending || tokenAssignmentStatus.isProcessing}
                        tokenRefreshRef={tokenRefreshRef}
                        onStatusChange={handleStatusChange}
                    />
                </CardContent>
            </Card>

            {/* Debug Information (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
                <Card className="max-w-4xl mx-auto mt-6 border-dashed border-gray-300">
                    <CardHeader>
                        <CardTitle className="text-sm">Debug Information</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-gray-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <strong>Student ID:</strong> {studentId}<br/>
                                <strong>Current Status:</strong> {studentData?.status}<br/>
                                <strong>Mutation Loading:</strong> {mutation.isPending ? 'Yes' : 'No'}
                            </div>
                            <div>
                                <strong>Token Processing:</strong> {tokenAssignmentStatus.isProcessing ? 'Yes' : 'No'}<br/>
                                <strong>Pending Assignment:</strong> {tokenAssignmentStatus.pendingTokenAssignment ? 'Yes' : 'No'}<br/>
                                <strong>Last Change:</strong> {tokenAssignmentStatus.lastStatusChange?.timestamp.toLocaleString() || 'None'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default EnhancedEditStudentPage;