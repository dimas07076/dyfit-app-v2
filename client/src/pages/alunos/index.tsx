// client/src/pages/alunos/index.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Plus, Search, UserX, Mail, MoreVertical, Users, Loader2 } from "lucide-react";
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

const ModernLoadingState = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-12"
    >
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mb-4"
        >
            <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
        <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
        >
            Carregando seus alunos...
        </motion.h3>
        <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-500 dark:text-gray-400"
        >
            Por favor, aguarde um momento
        </motion.p>
    </motion.div>
);

const ModernEmptyState = () => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16"
    >
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6"
        >
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Users className="h-12 w-12 text-primary" />
            </div>
        </motion.div>
        <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2"
        >
            Nenhum aluno encontrado
        </motion.h3>
        <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-gray-500 dark:text-gray-400 text-center mb-6"
        >
            Comece adicionando seu primeiro aluno ou ajuste sua pesquisa
        </motion.p>
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
        >
            <Link href="/alunos/novo">
                <Button className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Aluno
                </Button>
            </Link>
        </motion.div>
    </motion.div>
);

const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-16" />
                </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
    </div>
);

const AlunoCard = ({ student, onView, onDelete }: { student: Aluno, onView: (s: Aluno) => void, onDelete: (s: Aluno) => void }) => {
    console.log("Rendering AlunoCard for student:", student.nome);
    const getInitials = (nome: string) => {
        const partes = nome.split(' ').filter(Boolean);
        if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
        return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-800 p-6 mb-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                            {getInitials(student.nome)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">{student.nome}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                        <Badge 
                            variant={student.status === "active" ? "success" : "destructive"} 
                            className="mt-2 w-fit text-xs"
                        >
                            {student.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => onView(student)} className="cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> Visualizar Detalhes
                            </DropdownMenuItem>
                            <Link href={`/alunos/editar/${student._id}`} className="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4" /> Editar Aluno
                            </Link>
                            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => onDelete(student)}>
                                <UserX className="mr-2 h-4 w-4" /> Remover Aluno
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </motion.div>
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

    console.log("Fetching students data...");
    const { data: students = [], isLoading, isError, error } = useQuery<Aluno[], Error>({
        queryKey: ['/api/aluno/gerenciar'],
        queryFn: () => {
            console.log("Executing fetchWithAuth for /api/aluno/gerenciar");
            return fetchWithAuth<Aluno[]>("/api/aluno/gerenciar");
        },
        retry: 1,
    });
    console.log("Students data:", students);
    console.log("Is Loading:", isLoading);
    console.log("Is Error:", isError);
    if (isError) {
        console.error("Error fetching students:", error);
    }

    const deleteStudentMutation = useMutation<any, Error, string>({
        mutationFn: (alunoId: string) => {
            console.log("Deleting student with ID:", alunoId);
            return fetchWithAuth(`/api/aluno/gerenciar/${alunoId}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            console.log("Student deleted successfully.");
            toast({ title: "Aluno Removido", description: `O aluno foi removido com sucesso.` });
            queryClient.invalidateQueries({ queryKey: ['/api/aluno/gerenciar'] });
        },
        onError: (error) => {
            console.error("Error deleting student:", error);
            toast({ variant: "destructive", title: "Erro ao Remover", description: error.message || "Não foi possível remover o aluno." });
        },
        onSettled: () => closeConfirmDialog(),
    });

    const filteredStudents = students.filter((student) => {
        return (student.nome || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
               (student.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    });
    console.log("Filtered students:", filteredStudents);

    const handleDeleteClick = (aluno: Aluno) => {
        console.log("Handle delete click for student:", aluno.nome);
        openConfirmDialog({
            titulo: "Remover Aluno",
            mensagem: `Tem certeza que deseja remover o aluno ${aluno.nome}?`,
            onConfirm: () => deleteStudentMutation.mutate(aluno._id),
        });
    };

    const handleViewClick = (student: Aluno) => {
        console.log("Handle view click for student:", student.nome);
        // Navigate to student details page instead of opening modal
        navigate(`/alunos/${student._id}`);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50/50 dark:bg-gray-950/50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-8 py-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
                        <div>
                            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                Gerenciar Alunos
                            </CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Visualize e gerencie todos os seus alunos
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input 
                                    type="search" 
                                    placeholder="Pesquisar por nome ou email..." 
                                    className="pl-10 w-full sm:w-80 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20" 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                />
                            </div>
                            <Button 
                                variant="outline" 
                                onClick={() => setIsInviteModalOpen(true)}
                                className="rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                <Mail className="h-4 w-4 mr-2" /> Convidar Aluno
                            </Button>
                            <Link href="/alunos/novo">
                                <Button className="rounded-xl">
                                    <Plus className="h-4 w-4 mr-2" /> Adicionar Aluno
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-50/50 dark:bg-gray-800/30">
                                    <TableRow className="border-gray-100 dark:border-gray-800">
                                        <TableHead className="pl-8 font-semibold text-gray-700 dark:text-gray-300">Aluno</TableHead>
                                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Email</TableHead>
                                        <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                                        <TableHead className="text-right pr-8 font-semibold text-gray-700 dark:text-gray-300">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {isLoading ? (
                                        // Skeleton loader for desktop table
                                        [...Array(5)].map((_, i) => (
                                            <TableRow key={`skeleton-table-${i}`} className="border-gray-100 dark:border-gray-800">
                                                <TableCell className="pl-8 py-6"><Skeleton className="h-4 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                                <TableCell className="text-right pr-8"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : isError ? (
                                        // Error message for desktop table
                                        <TableRow><TableCell colSpan={4} className="py-8"><ErrorMessage title="Erro ao Carregar" message={error.message} /></TableCell></TableRow>
                                    ) : filteredStudents.length === 0 ? (
                                        // Empty state for desktop table
                                        <TableRow><TableCell colSpan={4} className="py-8"><ModernEmptyState /></TableCell></TableRow>
                                    ) : (
                                        // Actual data for desktop table
                                        filteredStudents.map((student, index) => (
                                            <motion.tr
                                                key={student._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                                className="border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-200"
                                            >
                                                <TableCell className="pl-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                                                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                                                                {student.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-semibold text-gray-900 dark:text-gray-100">{student.nome}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-600 dark:text-gray-400">{student.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={student.status === "active" ? "success" : "destructive"} className="rounded-full">
                                                        {student.status === "active" ? "Ativo" : "Inativo"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="pr-8 text-right">
                                                    <div className="flex justify-end items-center space-x-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleViewClick(student)} title="Visualizar" className="h-9 w-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        
                                                        {/* CORREÇÃO DE ANINHAMENTO DE LINK: Removido asChild do Button e aplicado estilos diretamente ao Link */}
                                                        <Link href={`/alunos/editar/${student._id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-800" title="Editar">
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>

                                                        <Button variant="ghost" size="icon" className="text-destructive h-9 w-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteClick(student)} title="Remover">
                                                            <UserX className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="md:hidden p-6">
                            {isLoading ? (
                                // Modern loading state for mobile
                                <ModernLoadingState />
                            ) : isError ? (
                                // Error message for mobile cards
                                <ErrorMessage title="Erro ao Carregar" message={error.message} />
                            ) : filteredStudents.length === 0 ? (
                                // Empty state for mobile cards
                                <ModernEmptyState />
                            ) : (
                                // Actual data for mobile cards
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {filteredStudents.map((student, index) => (
                                        <motion.div
                                            key={student._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.1 }}
                                        >
                                            <AlunoCard student={student} onView={handleViewClick} onDelete={handleDeleteClick} />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                    </CardContent>
                </Card>
            </motion.div>

            <AlunoViewModal aluno={selectedStudent} open={isViewModalOpen} onOpenChange={setIsViewModalOpen} />
            <ModalConfirmacao isOpen={isConfirmOpen} onClose={closeConfirmDialog} onConfirm={confirmAction} titulo={confirmOptions.titulo} mensagem={confirmOptions.mensagem} isLoadingConfirm={deleteStudentMutation.isPending}/>
            
            <GerarConviteAlunoModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
        </div>
    );
}
