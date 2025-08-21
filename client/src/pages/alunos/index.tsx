// client/src/pages/alunos/index.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Plus, Search, Mail, MoreVertical, Trash2 } from "lucide-react";
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

// Interface para a verificação da renovação
interface RenewalRequestCheck {
    _id: string;
    status: string;
}

const AlunoCard = ({ student, onView, onDelete }: { student: Aluno, onView: (s: Aluno) => void, onDelete: (s: Aluno) => void }) => {
    const getInitials = (nome: string) => {
        const partes = nome.split(' ').filter(Boolean);
        if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
        return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
    };

    return (
        <div className="group relative flex items-center justify-between p-4 md:p-5 border-b last:border-b-0 
                       hover:bg-gradient-to-r hover:from-blue-50/80 hover:via-indigo-50/40 hover:to-purple-50/80 
                       dark:hover:from-blue-900/20 dark:hover:via-indigo-900/10 dark:hover:to-purple-900/20 
                       transition-all duration-300 ease-out cursor-pointer
                       hover:shadow-md hover:-translate-y-0.5 rounded-lg mx-2">
            
            {/* Background gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            
            <div className="relative flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <Avatar className="ring-2 ring-blue-100 dark:ring-blue-900/30 
                                 group-hover:ring-blue-200 dark:group-hover:ring-blue-800/50
                                 group-hover:scale-110 transition-all duration-300 
                                 shadow-lg group-hover:shadow-xl">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 
                                             text-white font-semibold text-xs md:text-sm
                                             group-hover:from-blue-600 group-hover:via-indigo-600 group-hover:to-purple-700">
                        {getInitials(student.nome)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0 space-y-1">
                    <h4 className="font-semibold text-sm md:text-base text-gray-800 dark:text-gray-100 
                                  group-hover:text-blue-700 dark:group-hover:text-blue-300 
                                  transition-colors duration-300 truncate">
                        {student.nome}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 
                                 group-hover:text-gray-600 dark:group-hover:text-gray-300 
                                 transition-colors duration-300 truncate">
                        {student.email}
                    </p>
                </div>
            </div>
            
            <div className="relative flex items-center gap-2">
                <Badge variant={student.status === "active" ? "default" : "destructive"} 
                       className={`hidden sm:inline-flex px-3 py-1 text-xs font-semibold rounded-full
                                 ${student.status === "active" 
                                   ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25' 
                                   : 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-500/25'
                                 }
                                 transition-all duration-300 group-hover:scale-105`}>
                    {student.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" 
                                size="icon" 
                                className="relative h-9 w-9 md:h-10 md:w-10 min-h-[44px] min-w-[44px] 
                                         hover:bg-white/80 dark:hover:bg-slate-700/80 
                                         hover:shadow-lg hover:scale-110 
                                         active:scale-95 transition-all duration-200 
                                         group-hover:bg-white/50 dark:group-hover:bg-slate-600/50
                                         backdrop-blur-sm border border-transparent
                                         hover:border-blue-200 dark:hover:border-blue-700 rounded-lg">
                            <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-300 
                                                   hover:text-blue-600 dark:hover:text-blue-400 
                                                   transition-colors duration-200" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" 
                                       className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md 
                                                border border-white/20 dark:border-slate-700/50 
                                                shadow-xl rounded-lg animate-in fade-in-0 zoom-in-95 
                                                slide-in-from-top-2 duration-200">
                        <DropdownMenuItem onClick={() => onView(student)}
                                        className="hover:bg-blue-50 dark:hover:bg-blue-900/30 
                                                 focus:bg-blue-50 dark:focus:bg-blue-900/30 
                                                 transition-colors duration-200 cursor-pointer">
                            <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> 
                            <span className="font-medium">Visualizar</span>
                        </DropdownMenuItem>
                        
                        <Link href={`/alunos/editar/${student._id}`} 
                              className="flex items-center px-2 py-1.5 text-sm rounded-md 
                                       hover:bg-indigo-50 dark:hover:bg-indigo-900/30 
                                       transition-colors duration-200 cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" /> 
                            <span className="font-medium">Editar</span>
                        </Link>
                        
                        <DropdownMenuItem className="text-red-600 dark:text-red-400 
                                                   hover:bg-red-50 dark:hover:bg-red-900/30 
                                                   focus:bg-red-50 dark:focus:bg-red-900/30
                                                   transition-colors duration-200" 
                                        onClick={() => onDelete(student)}>
                            <Trash2 className="mr-2 h-4 w-4" /> 
                            <span className="font-medium">Excluir</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
};


export default function StudentsIndex() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, navigate] = useLocation();
    const { isOpen: isConfirmOpen, options: confirmOptions, openConfirmDialog, closeConfirmDialog, confirm: confirmAction } = useConfirmDialog();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // --- INÍCIO DA NOVA LÓGICA DE BLOQUEIO ---
    const { data: pendingRenewal } = useQuery<RenewalRequestCheck[], Error>({
        queryKey: ['pendingRenewalCheck'],
        queryFn: () => fetchWithAuth("/api/personal/renewal-requests?status=approved,cycle_assignment_pending"),
    });

    const hasPendingRenewal = pendingRenewal && pendingRenewal.length > 0;

    const handleActionClick = (action: () => void) => {
        if (hasPendingRenewal) {
            toast({
                variant: "destructive",
                title: "Ação Necessária",
                description: "Finalize a renovação do seu plano para adicionar ou convidar novos alunos.",
            });
            navigate("/renovar-plano");
        } else {
            action();
        }
    };
    // --- FIM DA NOVA LÓGICA DE BLOQUEIO ---

    const { data: students = [], isLoading, isError, error } = useQuery<Aluno[], Error>({
        queryKey: ['/api/aluno/gerenciar'],
        queryFn: () => {
            return fetchWithAuth<Aluno[]>("/api/aluno/gerenciar");
        },
        retry: 1,
    });

    const deleteStudentMutation = useMutation<any, Error, string>({
        mutationFn: (alunoId: string) => {
            return fetchWithAuth(`/api/aluno/gerenciar/${alunoId}`, { method: 'DELETE' });
        },
        onSuccess: (data) => {
            toast({ title: "Aluno Excluído", description: data.message || `O aluno foi removido permanentemente.` });
            queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Erro ao Excluir", description: error.message || "Não foi possível excluir o aluno." });
        },
        onSettled: () => closeConfirmDialog(),
    });

    const filteredStudents = students.filter((student) => {
        return (student.nome || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
               (student.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleDeleteClick = (aluno: Aluno) => {
        openConfirmDialog({
            titulo: "Excluir Aluno",
            mensagem: `Tem certeza que deseja excluir ${aluno.nome}? Esta ação é permanente e removerá todos os dados do aluno, incluindo suas fichas de treino.`,
            textoConfirmar: "Sim, Excluir",
            onConfirm: () => deleteStudentMutation.mutate(aluno._id),
        });
    };

    const handleViewClick = (student: Aluno) => {
        setSelectedStudent(student);
        setIsViewModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen 
                       bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 
                       dark:from-slate-900 dark:via-slate-800/95 dark:to-indigo-900/80">
            <Card className="relative overflow-hidden border-0 shadow-2xl hover:shadow-3xl 
                           bg-white/90 dark:bg-slate-800/90 backdrop-blur-md 
                           transition-all duration-500 rounded-xl">
                
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 
                               dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10" />
                
                <CardHeader className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between 
                                     px-6 py-6 md:px-8 md:py-8 border-b border-gray-100 dark:border-slate-700/50 
                                     bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    <div className="space-y-2 mb-4 sm:mb-0">
                        <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                                           dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 
                                           bg-clip-text text-transparent">
                            Gerenciar Alunos
                        </CardTitle>
                        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                            Visualize e gerencie todos os seus alunos cadastrados.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input type="search" 
                                   placeholder="Pesquisar alunos..." 
                                   className="pl-10 w-full sm:w-64 md:w-72 h-11 
                                            bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
                                            border border-gray-200/60 dark:border-slate-700/60 
                                            rounded-lg shadow-sm hover:shadow-md
                                            focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30
                                            focus:border-blue-400 dark:focus:border-blue-500
                                            transition-all duration-300 ease-out
                                            hover:bg-white dark:hover:bg-slate-800" 
                                   value={searchQuery} 
                                   onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        
                        <Button variant="outline" 
                                onClick={() => handleActionClick(() => setIsInviteModalOpen(true))}
                                className="min-h-[44px] px-4 py-2 border-2 border-indigo-200 dark:border-indigo-700
                                         bg-gradient-to-r from-indigo-50 to-purple-50 
                                         dark:from-indigo-900/30 dark:to-purple-900/30 
                                         hover:from-indigo-100 hover:to-purple-100
                                         dark:hover:from-indigo-800/40 dark:hover:to-purple-800/40
                                         text-indigo-700 dark:text-indigo-400
                                         hover:border-indigo-300 dark:hover:border-indigo-600
                                         shadow-md hover:shadow-lg transition-all duration-300
                                         hover:scale-105 active:scale-95 rounded-lg">
                            <Mail className="h-4 w-4 mr-2" /> 
                            Convidar Aluno
                        </Button>
                        
                        <Button 
                            onClick={() => handleActionClick(() => navigate("/alunos/novo"))}
                            className="min-h-[44px] px-4 py-2 font-semibold
                                        bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 
                                        hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 
                                        text-white shadow-lg hover:shadow-xl 
                                        transition-all duration-300 ease-out
                                        hover:scale-105 active:scale-95 
                                        border-0 rounded-lg">
                            <Plus className="h-4 w-4 mr-2" /> 
                            <span className="hidden sm:inline">Adicionar</span> Aluno
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="relative p-0">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100 
                                                  dark:from-slate-800/50 dark:to-slate-700/50 
                                                  backdrop-blur-sm">
                                <TableRow className="border-b border-gray-200 dark:border-slate-700">
                                    <TableHead className="pl-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Aluno
                                    </TableHead>
                                    <TableHead className="py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Email
                                    </TableHead>
                                    <TableHead className="py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-right pr-6 py-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Ações
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {isLoading ? (
                                    // Enhanced skeleton loader for desktop table
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={`skeleton-table-${i}`} 
                                                className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                            <TableCell className="pl-6 py-6">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 
                                                                       dark:from-slate-600 dark:to-slate-700" />
                                                    <Skeleton className="h-5 w-32 bg-gradient-to-r from-gray-200 to-gray-300 
                                                                       dark:from-slate-600 dark:to-slate-700 rounded-full" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6">
                                                <Skeleton className="h-4 w-48 bg-gradient-to-r from-gray-200 to-gray-300 
                                                                   dark:from-slate-600 dark:to-slate-700 rounded-full" />
                                            </TableCell>
                                            <TableCell className="py-6">
                                                <Skeleton className="h-6 w-16 bg-gradient-to-r from-gray-200 to-gray-300 
                                                                   dark:from-slate-600 dark:to-slate-700 rounded-full" />
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-6">
                                                <div className="flex justify-end gap-1">
                                                    <Skeleton className="h-9 w-9 bg-gradient-to-br from-gray-200 to-gray-300 
                                                                       dark:from-slate-600 dark:to-slate-700 rounded-lg" />
                                                    <Skeleton className="h-9 w-9 bg-gradient-to-br from-gray-200 to-gray-300 
                                                                       dark:from-slate-600 dark:to-slate-700 rounded-lg" />
                                                    <Skeleton className="h-9 w-9 bg-gradient-to-br from-gray-200 to-gray-300 
                                                                       dark:from-slate-600 dark:to-slate-700 rounded-lg" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : isError ? (
                                    // Error message for desktop table
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-12">
                                            <ErrorMessage title="Erro ao Carregar" message={error.message} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    // Actual data for desktop table
                                    filteredStudents.map((student, index) => (
                                        <TableRow key={student._id} 
                                                className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 
                                                         dark:hover:from-blue-900/10 dark:hover:to-indigo-900/10 
                                                         transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
                                                style={{ animationDelay: `${index * 50}ms` }}>
                                            <TableCell className="pl-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="ring-2 ring-blue-100 dark:ring-blue-900/30 
                                                                     group-hover:ring-blue-200 dark:group-hover:ring-blue-800/50
                                                                     transition-all duration-300 shadow-sm group-hover:shadow-md">
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 
                                                                                 text-white font-semibold text-sm">
                                                            {student.nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-100 
                                                                   group-hover:text-blue-700 dark:group-hover:text-blue-300 
                                                                   transition-colors duration-300">
                                                        {student.nome}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 text-gray-600 dark:text-gray-400 
                                                               group-hover:text-gray-700 dark:group-hover:text-gray-300 
                                                               transition-colors duration-300">
                                                {student.email}
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <Badge variant={student.status === "active" ? "default" : "destructive"} 
                                                       className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300
                                                                 ${student.status === "active" 
                                                                   ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25' 
                                                                   : 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-500/25'
                                                                 }
                                                                 group-hover:scale-105`}>
                                                    {student.status === "active" ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6 py-5 text-right">
                                                <div className="flex justify-end items-center gap-1">
                                                    <Button variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleViewClick(student)} 
                                                            title="Visualizar"
                                                            className="h-9 w-9 hover:bg-blue-100 dark:hover:bg-blue-900/30 
                                                                     hover:text-blue-700 dark:hover:text-blue-400
                                                                     transition-all duration-200 rounded-lg
                                                                     hover:scale-110 active:scale-95">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    
                                                    <Link href={`/alunos/editar/${student._id}`} 
                                                          className="inline-flex items-center justify-center h-9 w-9 
                                                                   rounded-lg text-sm font-medium transition-all duration-200
                                                                   hover:bg-indigo-100 dark:hover:bg-indigo-900/30 
                                                                   hover:text-indigo-700 dark:hover:text-indigo-400
                                                                   hover:scale-110 active:scale-95" 
                                                          title="Editar">
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>

                                                    <Button variant="ghost" 
                                                            size="icon" 
                                                            className="h-9 w-9 hover:bg-red-100 dark:hover:bg-red-900/30 
                                                                     hover:text-red-700 dark:hover:text-red-400
                                                                     transition-all duration-200 rounded-lg
                                                                     hover:scale-110 active:scale-95" 
                                                            onClick={() => handleDeleteClick(student)} 
                                                            title="Excluir">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {isLoading ? (
                            // Enhanced skeleton loader for mobile cards
                            <div className="p-4 space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={`skeleton-card-${i}`} 
                                         className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-700/30 
                                                  rounded-lg animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 
                                                               dark:from-slate-600 dark:to-slate-700" />
                                            <div className="flex flex-col gap-2">
                                                <Skeleton className="h-4 w-28 bg-gradient-to-r from-gray-200 to-gray-300 
                                                                   dark:from-slate-600 dark:to-slate-700 rounded-full" />
                                                <Skeleton className="h-3 w-36 bg-gradient-to-r from-gray-200 to-gray-300 
                                                                   dark:from-slate-600 dark:to-slate-700 rounded-full" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 
                                                           dark:from-slate-600 dark:to-slate-700 rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        ) : isError ? (
                            // Error message for mobile cards
                            <div className="p-6">
                                <ErrorMessage title="Erro ao Carregar" message={error.message} />
                            </div>
                        ) : (
                            // Actual data for mobile cards
                            <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {filteredStudents.map((student, index) => (
                                    <div key={student._id} 
                                         className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                                         style={{ animationDelay: `${index * 100}ms` }}>
                                        <AlunoCard student={student} onView={handleViewClick} onDelete={handleDeleteClick} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Empty State */}
                    {!isLoading && !isError && filteredStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="text-center space-y-4 max-w-md">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 
                                               dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                                    <Search className="h-8 w-8 text-gray-400 dark:text-slate-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                    {students.length > 0 ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {students.length > 0 
                                        ? "Tente ajustar sua busca para encontrar o aluno desejado."
                                        : "Comece adicionando seus primeiros alunos para gerenciar seus treinos."
                                    }
                                </p>
                                {students.length === 0 && (
                                    <Button 
                                        onClick={() => handleActionClick(() => navigate("/alunos/novo"))}
                                        className="mt-4 min-h-[44px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 
                                                         hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 
                                                         text-white shadow-lg hover:shadow-xl 
                                                         transition-all duration-300 ease-out
                                                         hover:scale-105 active:scale-95 border-0 rounded-lg">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar Primeiro Aluno
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlunoViewModal aluno={selectedStudent} open={isViewModalOpen} onOpenChange={setIsViewModalOpen} />
            <ModalConfirmacao isOpen={isConfirmOpen} onClose={closeConfirmDialog} onConfirm={confirmAction} titulo={confirmOptions.titulo} mensagem={confirmOptions.mensagem} textoConfirmar={confirmOptions.textoConfirmar} isLoadingConfirm={deleteStudentMutation.isPending}/>
            
            <GerarConviteAlunoModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
        </div>
    );
}