// client/src/components/ui/dashboard/AlunosAtivosList.tsx
import { useState } from "react";
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

// Componente de Card para um único aluno (similar ao que já existia)
const AlunoAtivoCard = ({ student, onView }: { student: Aluno, onView: (s: Aluno) => void }) => {
    const getInitials = (nome: string) => {
        const partes = nome.split(' ').filter(Boolean);
        if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
        return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
    };

    return (
        <div className="flex items-center justify-between p-4 border-b last:border-b-0">
            <div className="flex items-center gap-4">
                <Avatar>
                    <AvatarFallback>{getInitials(student.nome)}</AvatarFallback>
                </Avatar>
                <div>
                    <span className="font-semibold text-sm text-gray-800">{student.nome}</span>
                    {/* <<< CORREÇÃO: Trocado 'student.objetivo' por 'student.email' >>> */}
                    <p className="text-xs text-gray-500">{student.email || "Email não disponível"}</p>
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(student)}><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/alunos/editar/${student._id}`}><Pencil className="mr-2 h-4 w-4" /> Editar Aluno</Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

// Componente principal da lista
export function AlunosAtivosList({ trainerId }: { trainerId: string }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Aluno | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const { data: students = [], isLoading, isError, error } = useQuery<Aluno[], Error>({
        queryKey: ['alunosAtivos', trainerId],
        queryFn: () => fetchWithAuth<Aluno[]>(`/api/aluno/gerenciar?status=active&trainerId=${trainerId}`),
        retry: 1,
        enabled: !!trainerId,
    });

    const filteredStudents = students.filter(student => 
        student.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleViewClick = (student: Aluno) => {
        setSelectedStudent(student);
        setIsViewModalOpen(true);
    };
    
    return (
        <>
            <Card className="bg-white dark:bg-slate-800 shadow-md">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle>Alunos Ativos</CardTitle>
                            <CardDescription>Seus alunos com planos de treino em andamento.</CardDescription>
                        </div>
                        <Link href="/alunos/novo">
                            <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Adicionar Aluno</Button>
                        </Link>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input type="search" placeholder="Buscar aluno ativo..." className="pl-9 w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                        </div>
                    )}
                    {isError && <div className="p-4"><ErrorMessage title="Erro ao carregar alunos" message={error.message} /></div>}
                    
                    {!isLoading && !isError && filteredStudents.length > 0 && (
                        <div className="divide-y">
                            {filteredStudents.map(student => (
                                <AlunoAtivoCard key={student._id} student={student} onView={handleViewClick} />
                            ))}
                        </div>
                    )}

                    {!isLoading && !isError && filteredStudents.length === 0 && (
                        <p className="text-center text-sm text-gray-500 py-8">
                            {students.length > 0 ? "Nenhum aluno encontrado com essa busca." : "Nenhum aluno ativo encontrado."}
                        </p>
                    )}
                </CardContent>
            </Card>

            <AlunoViewModal aluno={selectedStudent} open={isViewModalOpen} onOpenChange={setIsViewModalOpen} />
        </>
    );
}