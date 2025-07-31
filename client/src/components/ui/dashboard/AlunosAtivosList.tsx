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

// Componente de Card para um único aluno - Design moderno e responsivo
const AlunoAtivoCard = ({ student, onView }: { student: Aluno, onView: (s: Aluno) => void }) => {
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
                        hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]
                        active:scale-[0.99] active:transition-transform active:duration-75">
            
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 
                            opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            
            <div className="relative flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <Avatar className="ring-2 ring-blue-100 dark:ring-blue-900/30 
                                 group-hover:ring-blue-200 dark:group-hover:ring-blue-800/50
                                 group-hover:scale-110 transition-all duration-300 
                                 shadow-lg group-hover:shadow-xl">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 
                                             text-white font-semibold text-xs md:text-sm
                                             group-hover:from-blue-600 group-hover:via-indigo-600 group-hover:to-purple-700
                                             transition-all duration-300">
                        {getInitials(student.nome)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-semibold text-sm md:text-base text-gray-800 dark:text-gray-100 
                                   group-hover:text-blue-700 dark:group-hover:text-blue-300 
                                   transition-colors duration-300 truncate">
                        {student.nome}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 
                                  group-hover:text-gray-600 dark:group-hover:text-gray-300 
                                  transition-colors duration-300 truncate">
                        {student.email || "Email não disponível"}
                    </p>
                </div>
            </div>
            
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
                                     hover:border-blue-200 dark:hover:border-blue-700">
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
                    <DropdownMenuItem 
                        onClick={() => onView(student)} 
                        className="hover:bg-blue-50 dark:hover:bg-blue-900/30 
                                 focus:bg-blue-50 dark:focus:bg-blue-900/30 
                                 transition-colors duration-200 cursor-pointer">
                        <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> 
                        <span className="font-medium">Visualizar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href={`/alunos/editar/${student._id}`} 
                              className="flex items-center hover:bg-indigo-50 dark:hover:bg-indigo-900/30 
                                       focus:bg-indigo-50 dark:focus:bg-indigo-900/30 
                                       transition-colors duration-200 cursor-pointer
                                       px-2 py-1.5 text-sm rounded-sm">
                            <Pencil className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" /> 
                            <span className="font-medium">Editar Aluno</span>
                        </Link>
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
            <Card className="relative overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-md 
                           border border-white/30 dark:border-slate-700/50 shadow-2xl 
                           hover:shadow-3xl transition-all duration-500 hover:-translate-y-1">
                
                {/* Subtle gradient background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 
                               dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10" />
                
                <CardHeader className="relative pb-4">
                    <div className="flex flex-col gap-4 sm:gap-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                            <div className="space-y-2">
                                <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 
                                                   dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 
                                                   bg-clip-text text-transparent">
                                    Alunos Ativos
                                </CardTitle>
                                <CardDescription className="text-sm md:text-base text-gray-600 dark:text-gray-400 
                                                          leading-relaxed max-w-md">
                                    Gerencie seus alunos com planos de treino em andamento.
                                </CardDescription>
                            </div>
                            <Link href="/alunos/novo" className="shrink-0">
                                <Button size="sm" 
                                        className="min-h-[44px] px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-semibold
                                                 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 
                                                 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 
                                                 text-white shadow-lg hover:shadow-xl 
                                                 transition-all duration-300 ease-out
                                                 hover:scale-105 hover:-translate-y-0.5
                                                 active:scale-95 active:transition-transform active:duration-75
                                                 border-0 rounded-lg">
                                    <UserPlus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" /> 
                                    <span className="hidden sm:inline">Adicionar</span> Aluno
                                </Button>
                            </Link>
                        </div>
                        
                        <div className="relative">
                            <div className="relative group">
                                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 
                                                text-gray-400 dark:text-gray-500 h-4 w-4 md:h-5 md:w-5
                                                group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400
                                                transition-colors duration-300" />
                                <Input 
                                    type="search" 
                                    placeholder="Buscar aluno ativo..." 
                                    className="pl-10 md:pl-12 pr-4 py-3 md:py-4 w-full text-sm md:text-base
                                             bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
                                             border border-gray-200/60 dark:border-slate-700/60 
                                             rounded-lg shadow-sm hover:shadow-md
                                             focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30
                                             focus:border-blue-400 dark:focus:border-blue-500
                                             transition-all duration-300 ease-out
                                             hover:bg-white dark:hover:bg-slate-800
                                             placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                />
                                
                                {/* Search field glow effect on focus */}
                                <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 
                                               opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-sm" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="relative p-0">
                    {isLoading && (
                        <div className="p-4 md:p-6 space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 
                                                       bg-gray-50/50 dark:bg-slate-700/30 rounded-lg 
                                                       animate-pulse">
                                    <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-full 
                                                       bg-gradient-to-br from-gray-200 to-gray-300 
                                                       dark:from-slate-600 dark:to-slate-700" />
                                    <div className="flex-grow space-y-2">
                                        <Skeleton className="h-4 md:h-5 w-3/5 bg-gradient-to-r from-gray-200 to-gray-300 
                                                         dark:from-slate-600 dark:to-slate-700 rounded-full" />
                                        <Skeleton className="h-3 md:h-4 w-2/5 bg-gradient-to-r from-gray-200 to-gray-300 
                                                         dark:from-slate-600 dark:to-slate-700 rounded-full" />
                                    </div>
                                    <Skeleton className="h-8 w-8 md:h-10 md:w-10 rounded-lg 
                                                       bg-gradient-to-br from-gray-200 to-gray-300 
                                                       dark:from-slate-600 dark:to-slate-700" />
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {isError && (
                        <div className="p-4 md:p-6">
                            <ErrorMessage title="Erro ao carregar alunos" message={error.message} />
                        </div>
                    )}
                    
                    {!isLoading && !isError && filteredStudents.length > 0 && (
                        <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {filteredStudents.map((student, index) => (
                                <div key={student._id} 
                                     className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
                                     style={{ animationDelay: `${index * 100}ms` }}>
                                    <AlunoAtivoCard student={student} onView={handleViewClick} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && !isError && filteredStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
                            <div className="text-center space-y-3 max-w-sm">
                                <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-gray-100 to-gray-200 
                                               dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                                    <Search className="h-6 w-6 md:h-8 md:w-8 text-gray-400 dark:text-slate-500" />
                                </div>
                                <h3 className="text-base md:text-lg font-semibold text-gray-700 dark:text-gray-300">
                                    {students.length > 0 ? "Nenhum resultado encontrado" : "Nenhum aluno ativo"}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {students.length > 0 
                                        ? "Tente ajustar sua busca para encontrar o aluno desejado."
                                        : "Adicione seus primeiros alunos para começar a gerenciar seus treinos."
                                    }
                                </p>
                                {students.length === 0 && (
                                    <Link href="/alunos/novo" className="inline-block mt-2">
                                        <Button variant="outline" 
                                                className="min-h-[44px] bg-white dark:bg-slate-800 
                                                         hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
                                                         dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20
                                                         border-blue-200 dark:border-blue-800
                                                         text-blue-700 dark:text-blue-400
                                                         hover:border-blue-300 dark:hover:border-blue-700
                                                         transition-all duration-300">
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Adicionar Primeiro Aluno
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlunoViewModal aluno={selectedStudent} open={isViewModalOpen} onOpenChange={setIsViewModalOpen} />
        </>
    );
}