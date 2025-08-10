// client/src/pages/alunos/index.new.tsx - New enhanced Alunos menu with proper token integration
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Plus, Search, UserX, Mail, MoreVertical, Users, UserPlus, Filter, RefreshCw } from "lucide-react";
import { fetchWithAuth } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { ModalConfirmacao } from "@/components/ui/modal-confirmacao";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import { Aluno } from "@/types/aluno";
import AlunoViewModal from "@/components/dialogs/AlunoViewModal";
import GerarConviteAlunoModal from "@/components/dialogs/GerarConviteAlunoModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StudentLimitIndicator } from "@/components/StudentLimitIndicator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TokenInfoDisplay } from "@/components/TokenInfoDisplay";
import { useTokenInfo } from "@/hooks/useTokenInfo";

interface AlunosStats {
    totalAlunos: number;
    alunosAtivos: number;
    alunosInativos: number;
    novosEsseMes: number;
}

// Enhanced Student Card Component with Token Integration
const StudentCard = ({ 
    student, 
    onView, 
    onEdit, 
    onDelete, 
    onTokenRefresh 
}: { 
    student: Aluno, 
    onView: (s: Aluno) => void, 
    onEdit: (s: Aluno) => void,
    onDelete: (s: Aluno) => void,
    onTokenRefresh: (studentId: string) => void
}) => {
    const { tokenInfo, isLoading: tokenLoading, refetch: refetchToken } = useTokenInfo(student._id);
    
    const getInitials = (nome: string) => {
        const partes = nome.split(' ').filter(Boolean);
        if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
        return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
    };

    const handleTokenRefresh = () => {
        refetchToken();
        onTokenRefresh(student._id);
    };

    return (
        <div className="group relative flex flex-col p-4 md:p-5 border rounded-lg
                       hover:bg-gradient-to-r hover:from-blue-50/80 hover:via-indigo-50/40 hover:to-purple-50/80 
                       dark:hover:from-blue-900/20 dark:hover:via-indigo-900/10 dark:hover:to-purple-900/20 
                       transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1">
            
            {/* Student Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="ring-2 ring-blue-100 dark:ring-blue-900/30 
                                     group-hover:ring-blue-200 dark:group-hover:ring-blue-800/50
                                     group-hover:scale-110 transition-all duration-300 
                                     shadow-lg group-hover:shadow-xl">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 
                                                 text-white font-semibold text-xs md:text-sm">
                            {getInitials(student.nome)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 min-w-0">
                        <h4 className="font-semibold text-sm md:text-base text-gray-800 dark:text-gray-100 
                                      group-hover:text-blue-700 dark:group-hover:text-blue-300 
                                      transition-colors duration-300 truncate">
                            {student.nome}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                            {student.email}
                        </p>
                        {student.phone && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {student.phone}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Badge variant={student.status === "active" ? "default" : "destructive"} 
                           className={`px-3 py-1 text-xs font-semibold rounded-full
                                     ${student.status === "active" 
                                       ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' 
                                       : 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                                     }`}>
                        {student.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                </div>
            </div>

            {/* Token Information Section */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400">Token Associado</h5>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleTokenRefresh}
                        className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        title="Atualizar token"
                    >
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                </div>
                <div className="text-xs">
                    <TokenInfoDisplay 
                        tokenInfo={tokenInfo} 
                        isLoading={tokenLoading}
                        showTitle={false}
                    />
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onView(student)}
                        className="h-8 px-2 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                    </Button>
                    
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onEdit(student)}
                        className="h-8 px-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                    >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                    </Button>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                            onClick={() => onDelete(student)}
                            className="text-red-600 dark:text-red-400"
                        >
                            <UserX className="mr-2 h-4 w-4" /> 
                            Remover
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};

// Enhanced Stats Card Component
const StatsCard = ({ title, value, icon: Icon, description, className = "" }: {
    title: string;
    value: string | number;
    icon: any;
    description?: string;
    className?: string;
}) => {
    return (
        <Card className={`border-0 shadow-md hover:shadow-lg transition-all duration-300 ${className}`}>
            <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Main Enhanced Students Index Component
export default function EnhancedAlunosIndex() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();
    const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog, confirm: confirmAction } = useConfirmDialog();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

    // Enhanced page visibility handler with comprehensive cache invalidation
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log('[EnhancedAlunosIndex] Page became visible, refreshing all data');
                // Comprehensive data refresh
                queryClient.invalidateQueries({ queryKey: ['studentLimitStatus'] });
                queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
                queryClient.invalidateQueries({ queryKey: ['aluno'] }); // Individual student data
                queryClient.invalidateQueries({ queryKey: ['tokens'] }); // Token data
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [queryClient]);

    // Enhanced students data fetching with error handling
    console.log("Fetching students data...");
    const { data: students = [], isLoading, isError, error, refetch } = useQuery<Aluno[], Error>({
        queryKey: ['/api/aluno/gerenciar'],
        queryFn: () => {
            console.log("Executing fetchWithAuth for /api/aluno/gerenciar");
            return fetchWithAuth<Aluno[]>("/api/aluno/gerenciar");
        },
        retry: (failureCount, error) => {
            console.log(`Query retry attempt ${failureCount + 1} for students`, error);
            return failureCount < 2; // Retry up to 2 times
        },
        staleTime: 2 * 60 * 1000, // 2 minutes (shorter for better token sync)
        refetchOnWindowFocus: true,
        refetchInterval: 30000, // Refresh every 30 seconds for token updates
    });

    console.log("Students data:", students);
    console.log("Is Loading:", isLoading);
    console.log("Is Error:", isError);
    if (isError) {
        console.error("Error fetching students:", error);
    }

    // Calculate enhanced stats
    const stats: AlunosStats = {
        totalAlunos: students.length,
        alunosAtivos: students.filter(s => s.status === 'active').length,
        alunosInativos: students.filter(s => s.status === 'inactive').length,
        novosEsseMes: students.filter(s => {
            const now = new Date();
            const studentStart = new Date(s.startDate);
            return studentStart.getMonth() === now.getMonth() && 
                   studentStart.getFullYear() === now.getFullYear();
        }).length
    };

    // Enhanced delete mutation with comprehensive cache invalidation
    const deleteStudentMutation = useMutation<any, Error, string>({
        mutationFn: (alunoId: string) => {
            console.log("Deleting student with ID:", alunoId);
            return fetchWithAuth(`/api/aluno/gerenciar/${alunoId}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            console.log("Student deleted successfully.");
            toast({ title: "Aluno Removido", description: `O aluno foi removido com sucesso.` });
            
            // Comprehensive cache invalidation
            queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
            queryClient.invalidateQueries({ queryKey: ['studentLimitStatus'] });
            queryClient.invalidateQueries({ queryKey: ['tokens'] });
            
            // Force refresh student limit indicator
            localStorage.setItem('studentLimitRefresh', Date.now().toString());
        },
        onError: (error) => {
            console.error("Error deleting student:", error);
            toast({ variant: "destructive", title: "Erro ao Remover", description: error.message || "Não foi possível remover o aluno." });
        },
        onSettled: () => closeConfirmDialog(),
    });

    // Enhanced filtering
    const filteredStudents = students.filter((student) => {
        const matchesSearch = (student.nome || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (student.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                             (student.phone || "").toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || student.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    console.log("Filtered students:", filteredStudents);

    // Enhanced event handlers
    const handleDeleteClick = (aluno: Aluno) => {
        console.log("Handle delete click for student:", aluno.nome);
        openConfirmDialog({
            titulo: "Remover Aluno",
            mensagem: `Tem certeza que deseja remover o aluno ${aluno.nome}? Esta ação não pode ser desfeita.`,
            onConfirm: () => deleteStudentMutation.mutate(aluno._id),
        });
    };

    const handleViewClick = (student: Aluno) => {
        console.log("Handle view click for student:", student.nome);
        setSelectedStudent(student);
        setIsViewModalOpen(true);
    };

    const handleEditClick = (student: Aluno) => {
        console.log("Handle edit click for student:", student.nome);
        // Use proper SPA navigation with Wouter
        setLocation(`/alunos/editar/${student._id}`);
    };

    const handleRefresh = () => {
        console.log('[EnhancedAlunosIndex] Manual refresh triggered');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['studentLimitStatus'] });
        queryClient.invalidateQueries({ queryKey: ['tokens'] });
        toast({ title: "Atualizado", description: "Lista de alunos e tokens atualizados." });
    };

    const handleTokenRefresh = useCallback((studentId: string) => {
        console.log(`[EnhancedAlunosIndex] Token refresh requested for student ${studentId}`);
        // Invalidate specific student token queries
        queryClient.invalidateQueries({ queryKey: ['tokens', 'student', studentId] });
        queryClient.invalidateQueries({ queryKey: ['aluno', studentId] });
    }, [queryClient]);

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen 
                       bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 
                       dark:from-slate-900 dark:via-slate-800/95 dark:to-indigo-900/80">
            
            {/* Enhanced Header Section */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                                     dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 
                                     bg-clip-text text-transparent">
                            Gerenciar Alunos
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Visualize e gerencie todos os seus alunos com integração completa de tokens.
                        </p>
                    </div>
                    <div className="flex gap-2 mt-4 sm:mt-0">
                        <div className="flex rounded-lg border">
                            <Button 
                                variant={viewMode === 'cards' ? 'default' : 'ghost'} 
                                size="sm"
                                onClick={() => setViewMode('cards')}
                                className="rounded-r-none"
                            >
                                Cards
                            </Button>
                            <Button 
                                variant={viewMode === 'table' ? 'default' : 'ghost'} 
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="rounded-l-none"
                            >
                                Tabela
                            </Button>
                        </div>
                        <Button variant="outline" onClick={handleRefresh} size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                    </div>
                </div>

                {/* Student Limit Indicator */}
                <div className="mb-4">
                    <StudentLimitIndicator variant="compact" showProgress={true} />
                </div>

                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        title="Total de Alunos"
                        value={stats.totalAlunos}
                        icon={Users}
                        className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
                    />
                    <StatsCard
                        title="Alunos Ativos"
                        value={stats.alunosAtivos}
                        icon={UserPlus}
                        className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
                    />
                    <StatsCard
                        title="Alunos Inativos"
                        value={stats.alunosInativos}
                        icon={UserX}
                        className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
                    />
                    <StatsCard
                        title="Novos Este Mês"
                        value={stats.novosEsseMes}
                        icon={Plus}
                        className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
                    />
                </div>
            </div>

            {/* Main Content Card */}
            <Card className="relative overflow-hidden border-0 shadow-2xl hover:shadow-3xl 
                           bg-white/90 dark:bg-slate-800/90 backdrop-blur-md 
                           transition-all duration-500 rounded-xl">
                
                <CardHeader className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between 
                                     px-6 py-6 md:px-8 md:py-8 border-b border-gray-100 dark:border-slate-700/50 
                                     bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <div className="relative flex-1 sm:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input type="search" 
                                       placeholder="Pesquisar alunos..." 
                                       className="pl-10 w-full h-11" 
                                       value={searchQuery} 
                                       onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            
                            <div className="flex gap-2">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-11">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="active">Ativos</SelectItem>
                                        <SelectItem value="inactive">Inativos</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button variant="outline" 
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="min-h-[44px] px-4 py-2">
                                <Mail className="h-4 w-4 mr-2" /> 
                                Convidar
                            </Button>
                            
                            <Link href="/alunos/novo">
                                <Button className="min-h-[44px] px-4 py-2 font-semibold">
                                    <Plus className="h-4 w-4 mr-2" /> 
                                    <span className="hidden sm:inline">Adicionar</span> Aluno
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="relative p-0">
                    {/* Cards View */}
                    {viewMode === 'cards' && (
                        <div className="p-6">
                            {isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={`skeleton-${i}`} className="p-4 border rounded-lg">
                                            <Skeleton className="h-32 w-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : isError ? (
                                <ErrorMessage title="Erro ao Carregar" message={error.message} />
                            ) : filteredStudents.length === 0 ? (
                                <div className="text-center py-16">
                                    <p className="text-gray-500">Nenhum aluno encontrado</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredStudents.map((student, index) => (
                                        <div key={student._id} 
                                             className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                                             style={{ animationDelay: `${index * 100}ms` }}>
                                            <StudentCard 
                                                student={student} 
                                                onView={handleViewClick} 
                                                onEdit={handleEditClick}
                                                onDelete={handleDeleteClick}
                                                onTokenRefresh={handleTokenRefresh}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Table View (Enhanced) */}
                    {viewMode === 'table' && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Aluno</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Token</TableHead>
                                        <TableHead className="text-right pr-6">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        [...Array(5)].map((_, i) => (
                                            <TableRow key={`skeleton-table-${i}`}>
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-10 w-10 rounded-full" />
                                                        <Skeleton className="h-5 w-32" />
                                                    </div>
                                                </TableCell>
                                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-1">
                                                        <Skeleton className="h-9 w-9" />
                                                        <Skeleton className="h-9 w-9" />
                                                        <Skeleton className="h-9 w-9" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : isError ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-12">
                                                <ErrorMessage title="Erro ao Carregar" message={error.message} />
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredStudents.map((student, index) => (
                                            <StudentTableRow 
                                                key={student._id}
                                                student={student}
                                                index={index}
                                                onView={handleViewClick}
                                                onEdit={handleEditClick}
                                                onDelete={handleDeleteClick}
                                                onTokenRefresh={handleTokenRefresh}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !isError && filteredStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="text-center space-y-4 max-w-md">
                                <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                    <Search className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                    {students.length > 0 ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {students.length > 0 
                                        ? "Tente ajustar sua busca ou filtros para encontrar o aluno desejado."
                                        : "Comece adicionando seus primeiros alunos para gerenciar seus treinos."
                                    }
                                </p>
                                {students.length === 0 && (
                                    <Link href="/alunos/novo" className="inline-block mt-4">
                                        <Button>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Adicionar Primeiro Aluno
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <AlunoViewModal aluno={selectedStudent} open={isViewModalOpen} onOpenChange={setIsViewModalOpen} />
            <ModalConfirmacao 
                isOpen={isConfirmOpen} 
                onClose={closeConfirmDialog} 
                onConfirm={confirmAction} 
                titulo={confirmOptions.titulo} 
                mensagem={confirmOptions.mensagem} 
                isLoadingConfirm={deleteStudentMutation.isPending}
            />
            <GerarConviteAlunoModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
        </div>
    );
}

// Enhanced Table Row Component with Token Info
const StudentTableRow = ({ 
    student, 
    index, 
    onView, 
    onEdit, 
    onDelete, 
    onTokenRefresh 
}: {
    student: Aluno;
    index: number;
    onView: (s: Aluno) => void;
    onEdit: (s: Aluno) => void;
    onDelete: (s: Aluno) => void;
    onTokenRefresh: (studentId: string) => void;
}) => {
    const { tokenInfo, isLoading: tokenLoading, refetch: refetchToken } = useTokenInfo(student._id);

    const handleTokenRefresh = () => {
        refetchToken();
        onTokenRefresh(student._id);
    };

    return (
        <TableRow className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 
                           transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 50}ms` }}>
            <TableCell className="pl-6 py-5">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white font-semibold text-sm">
                            {student.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                        {student.nome}
                    </span>
                </div>
            </TableCell>
            <TableCell className="py-5 text-gray-600 dark:text-gray-400">
                {student.email}
            </TableCell>
            <TableCell className="py-5 text-gray-600 dark:text-gray-400">
                {student.phone || '-'}
            </TableCell>
            <TableCell className="py-5">
                <Badge variant={student.status === "active" ? "default" : "destructive"}>
                    {student.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
            </TableCell>
            <TableCell className="py-5">
                <div className="flex items-center gap-2">
                    <div className="text-xs max-w-[120px]">
                        {tokenLoading ? (
                            <Skeleton className="h-4 w-16" />
                        ) : tokenInfo ? (
                            <Badge variant="outline" className="text-xs">
                                {tokenInfo.tipo}: {tokenInfo.status}
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="text-xs">
                                Sem token
                            </Badge>
                        )}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleTokenRefresh}
                        className="h-6 w-6 p-0"
                        title="Atualizar token"
                    >
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                </div>
            </TableCell>
            <TableCell className="pr-6 py-5 text-right">
                <div className="flex justify-end items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onView(student)} title="Visualizar">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(student)} title="Editar">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(student)} title="Remover">
                        <UserX className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
};