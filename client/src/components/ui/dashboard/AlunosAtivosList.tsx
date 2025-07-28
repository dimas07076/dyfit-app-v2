// client/src/components/ui/dashboard/AlunosAtivosList.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Search, MoreVertical, UserPlus } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import AlunoViewModal from "@/components/dialogs/AlunoViewModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLogger } from "@/lib/logger";
import ErrorBoundary from "@/components/ErrorBoundary";

// Componente de Card para um único aluno (similar ao que já existia)
const AlunoAtivoCard = ({ student, onView }: { student: Aluno, onView: (s: Aluno) => void }) => {
    const logger = useLogger('AlunoAtivoCard');
    
    const getInitials = (nome: string) => {
        try {
            logger.debug('Getting initials for name', { nome });
            const partes = nome.split(' ').filter(Boolean);
            if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
            return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
        } catch (error) {
            logger.error('Error getting initials', error as Error, { nome });
            return '?';
        }
    };

    const handleViewClick = () => {
        try {
            logger.userAction('view-student-clicked', { studentId: student._id, studentName: student.nome });
            onView(student);
        } catch (error) {
            logger.error('Error handling view click', error as Error, { studentId: student._id });
        }
    };

    if (!student) {
        logger.warn('Student prop is null/undefined');
        return null;
    }

    return (
        <ErrorBoundary componentName="AlunoAtivoCard" fallback={
            <div className="p-4 border-b bg-red-50 text-red-700 text-sm">
                Erro ao carregar dados do aluno
            </div>
        }>
            <div className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors duration-150">
                <div className="flex items-center gap-4">
                    <Avatar className="ring-2 ring-blue-100 dark:ring-blue-900/30">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                            {getInitials(student.nome || 'Aluno')}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{student.nome || 'Nome não disponível'}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.email || "Email não disponível"}</p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-slate-600">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50">
                        <DropdownMenuItem onClick={handleViewClick} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <Eye className="mr-2 h-4 w-4" /> Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/alunos/editar/${student._id}`} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                <Pencil className="mr-2 h-4 w-4" /> Editar Aluno
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </ErrorBoundary>
    );
};

// Componente principal da lista
export function AlunosAtivosList({ trainerId }: { trainerId: string }) {
    const logger = useLogger('AlunosAtivosList');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [queryTimeout, setQueryTimeout] = useState<NodeJS.Timeout | null>(null);

    // Log component mount
    useEffect(() => {
        logger.mounted({ trainerId });
        
        if (!trainerId) {
            logger.error('Component mounted without trainerId');
        }

        return () => {
            logger.unmounted();
            if (queryTimeout) {
                clearTimeout(queryTimeout);
            }
        };
    }, [trainerId]);

    // Performance timing
    useEffect(() => {
        logger.time('component-render');
        return () => logger.timeEnd('component-render');
    });

    const { data: students = [], isLoading, isError, error, isFetching } = useQuery<Aluno[], Error>({
        queryKey: ['alunosAtivos', trainerId],
        queryFn: async () => {
            try {
                logger.queryStarted('alunosAtivos');
                logger.time('fetch-alunos-ativos');
                
                const result = await fetchWithAuth<Aluno[]>(`/api/aluno/gerenciar?status=active&trainerId=${trainerId}`);
                
                logger.timeEnd('fetch-alunos-ativos');
                logger.querySuccess('alunosAtivos', result);
                
                return result;
            } catch (error) {
                logger.timeEnd('fetch-alunos-ativos');
                logger.queryError('alunosAtivos', error as Error);
                throw error;
            }
        },
        retry: (failureCount, error) => {
            const shouldRetry = failureCount < 3;
            logger.warn(`Query failed, retry ${failureCount}/3`, { shouldRetry, error: error.message });
            return shouldRetry;
        },
        enabled: !!trainerId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: 'always',
    });

    // Add timeout for loading state
    useEffect(() => {
        if (isLoading && !queryTimeout) {
            const timeout = setTimeout(() => {
                logger.warn('Query timeout reached - still loading after 30 seconds', {
                    trainerId,
                    isFetching,
                    isLoading,
                });
            }, 30000); // 30 seconds
            
            setQueryTimeout(timeout);
        } else if (!isLoading && queryTimeout) {
            clearTimeout(queryTimeout);
            setQueryTimeout(null);
        }
    }, [isLoading, isFetching]);

    // Log data changes
    useEffect(() => {
        if (students) {
            logger.info('Students data updated', { 
                count: students.length,
                studentIds: students.map(s => s._id),
            });
        }
    }, [students]);

    // Log error changes
    useEffect(() => {
        if (error) {
            logger.error('Query error state changed', error);
        }
    }, [error]);

    const filteredStudents = students.filter(student => {
        if (!student || !student.nome) {
            logger.warn('Invalid student data found', { student });
            return false;
        }
        return student.nome.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleViewClick = (student: Aluno) => {
        try {
            logger.userAction('open-student-modal', { studentId: student._id, studentName: student.nome });
            setSelectedStudent(student);
            setIsViewModalOpen(true);
        } catch (error) {
            logger.error('Error opening student modal', error as Error, { studentId: student._id });
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value;
        logger.userAction('search-students', { query: newQuery, resultsCount: filteredStudents.length });
        setSearchQuery(newQuery);
    };

    // Log render information
    logger.debug('Component rendering', {
        trainerId,
        isLoading,
        isError,
        isFetching,
        studentsCount: students.length,
        filteredCount: filteredStudents.length,
        searchQuery,
        hasError: !!error,
        errorMessage: error?.message,
    });
    
    return (
        <ErrorBoundary 
            componentName="AlunosAtivosList"
            onError={(error, errorInfo) => {
                logger.error('ErrorBoundary caught error in AlunosAtivosList', error, { errorInfo, trainerId });
            }}
        >
            <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-xl">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Alunos Ativos</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">Seus alunos com planos de treino em andamento.</CardDescription>
                        </div>
                        <Link href="/alunos/novo">
                            <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                                <UserPlus className="h-4 w-4 mr-2" /> Adicionar Aluno
                            </Button>
                        </Link>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                            type="search" 
                            placeholder="Buscar aluno ativo..." 
                            className="pl-9 w-full bg-white/90 dark:bg-slate-800/90 border border-gray-200/50 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500/20" 
                            value={searchQuery} 
                            onChange={handleSearchChange} 
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading && (
                        <div className="p-4 space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="flex-grow space-y-2">
                                        <Skeleton className="h-4 w-3/5" />
                                        <Skeleton className="h-3 w-2/5" />
                                    </div>
                                </div>
                            ))}
                            {isFetching && (
                                <p className="text-center text-xs text-gray-500 mt-2">
                                    Carregando alunos... {queryTimeout ? '(Isto está demorando mais que o esperado)' : ''}
                                </p>
                            )}
                        </div>
                    )}
                    
                    {isError && (
                        <div className="p-4">
                            <ErrorMessage 
                                title="Erro ao carregar alunos" 
                                message={error?.message || 'Erro desconhecido ao carregar lista de alunos'} 
                            />
                            <div className="mt-2 text-xs text-gray-500">
                                Trainer ID: {trainerId} | Error ID: {Date.now()}
                            </div>
                        </div>
                    )}
                    
                    {!isLoading && !isError && filteredStudents.length > 0 && (
                        <div className="divide-y">
                            {filteredStudents.map(student => (
                                <AlunoAtivoCard key={student._id} student={student} onView={handleViewClick} />
                            ))}
                        </div>
                    )}

                    {!isLoading && !isError && filteredStudents.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-500">
                                {students.length > 0 ? "Nenhum aluno encontrado com essa busca." : "Nenhum aluno ativo encontrado."}
                            </p>
                            {students.length === 0 && (
                                <div className="mt-2 text-xs text-gray-400">
                                    Trainer ID: {trainerId} | Total alunos: {students.length}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ErrorBoundary 
                componentName="AlunoViewModal"
                fallback={
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-4 rounded-lg">
                            <p>Erro ao carregar modal do aluno</p>
                            <Button onClick={() => setIsViewModalOpen(false)}>Fechar</Button>
                        </div>
                    </div>
                }
            >
                <AlunoViewModal 
                    aluno={selectedStudent} 
                    open={isViewModalOpen} 
                    onOpenChange={(open) => {
                        logger.userAction('modal-state-change', { open, studentId: selectedStudent?._id });
                        setIsViewModalOpen(open);
                        if (!open) {
                            setSelectedStudent(null);
                        }
                    }} 
                />
            </ErrorBoundary>
        </ErrorBoundary>
    );
}