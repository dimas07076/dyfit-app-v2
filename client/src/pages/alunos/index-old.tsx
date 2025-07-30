// client/src/pages/alunos/index.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Pencil, Plus, Search, UserX, Mail, MoreVertical } from "lucide-react";
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

const AlunoCard = ({ student, onView, onDelete }: { student: Aluno, onView: (s: Aluno) => void, onDelete: (s: Aluno) => void }) => {
    console.log("Rendering AlunoCard for student:", student.nome);
    const getInitials = (nome: string) => {
        const partes = nome.split(' ').filter(Boolean);
        if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
        return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
    };

    return (
        <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarFallback>{getInitials(student.nome)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">{student.nome}</span>
                    <span className="text-xs text-muted-foreground">{student.email}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={student.status === "active" ? "success" : "destructive"} className="hidden sm:inline-flex">
                    {student.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(student)}>
                            <Eye className="mr-2 h-4 w-4" /> Visualizar
                        </DropdownMenuItem>
                        {/* CORREÇÃO: Removido asChild do DropdownMenuItem e aplicado estilos diretamente ao Link */}
                        <Link href={`/alunos/editar/${student._id}`} className="flex items-center px-2 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Link>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(student)}>
                            <UserX className="mr-2 h-4 w-4" /> Remover
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
        setSelectedStudent(student);
        setIsViewModalOpen(true);
    };

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Card className="border shadow-sm overflow-hidden bg-white dark:bg-gray-900">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b">
                    <CardTitle className="text-xl font-semibold">Alunos</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input type="search" placeholder="Pesquisar..." className="pl-9 w-full sm:w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <Button variant="outline" onClick={() => setIsInviteModalOpen(true)}>
                            <Mail className="h-4 w-4 mr-2" /> Convidar Aluno
                        </Button>
                        <Link href="/alunos/novo">
                            <Button><Plus className="h-4 w-4 mr-2" /> Adicionar Aluno</Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="hidden md:block overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                                <TableRow>
                                    <TableHead className="pl-6">Aluno</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y">
                                {isLoading ? (
                                    // Skeleton loader for desktop table
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={`skeleton-table-${i}`}>
                                            <TableCell className="pl-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell className="text-right pr-6"><Skeleton className="h-8 w-24" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : isError ? (
                                    // Error message for desktop table
                                    <TableRow><TableCell colSpan={4}><ErrorMessage title="Erro ao Carregar" message={error.message} /></TableCell></TableRow>
                                ) : (
                                    // Actual data for desktop table
                                    filteredStudents.map((student) => (
                                        <TableRow key={student._id} className="hover:bg-gray-50/50">
                                            <TableCell className="pl-6 font-medium">{student.nome}</TableCell>
                                            <TableCell className="text-muted-foreground">{student.email}</TableCell>
                                            <TableCell>
                                                <Badge variant={student.status === "active" ? "success" : "destructive"}>
                                                    {student.status === "active" ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <div className="flex justify-end items-center space-x-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleViewClick(student)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                                                    
                                                    {/* CORREÇÃO DE ANINHAMENTO DE LINK: Removido asChild do Button e aplicado estilos diretamente ao Link */}
                                                    <Link href={`/alunos/editar/${student._id}`} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9 p-0 hover:bg-accent hover:text-accent-foreground" title="Editar">
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>

                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(student)} title="Remover"><UserX className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="md:hidden">
                        {isLoading ? (
                            // Skeleton loader for mobile cards
                            [...Array(5)].map((_, i) => (
                                <div key={`skeleton-card-${i}`} className="flex items-center justify-between p-4 border-b">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex flex-col gap-2">
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-3 w-36" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            ))
                        ) : isError ? (
                            // Error message for mobile cards
                            <ErrorMessage title="Erro ao Carregar" message={error.message} />
                        ) : (
                            // Actual data for mobile cards
                            filteredStudents.map((student) => (
                                <AlunoCard key={student._id} student={student} onView={handleViewClick} onDelete={handleDeleteClick} />
                            ))
                        )}
                    </div>

                </CardContent>
            </Card>

            <AlunoViewModal aluno={selectedStudent} open={isViewModalOpen} onOpenChange={setIsViewModalOpen} />
            <ModalConfirmacao isOpen={isConfirmOpen} onClose={closeConfirmDialog} onConfirm={confirmAction} titulo={confirmOptions.titulo} mensagem={confirmOptions.mensagem} isLoadingConfirm={deleteStudentMutation.isPending}/>
            
            <GerarConviteAlunoModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
        </div>
    );
}
