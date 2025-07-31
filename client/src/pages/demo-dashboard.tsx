// Temporary demo page to showcase UI improvements without authentication
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/dashboard/stats-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, LayoutDashboard, Zap, UserPlus, Search, Eye, Pencil, MoreVertical, Mail } from "lucide-react";

// Mock data for demonstration
const mockStudents = [
  { _id: "1", nome: "João Silva", email: "joao@exemplo.com", status: "active" },
  { _id: "2", nome: "Maria Santos", email: "maria@exemplo.com", status: "active" },
  { _id: "3", nome: "Pedro Oliveira", email: "pedro@exemplo.com", status: "inactive" },
];

// Mock AlunosAtivosList component with the new styling
const DemoAlunosAtivosList = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const filteredStudents = mockStudents.filter(student => 
    student.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (nome: string) => {
    const partes = nome.split(' ').filter(Boolean);
    if (partes.length > 1) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    return partes[0] ? partes[0].substring(0, 2).toUpperCase() : '?';
  };

  const AlunoAtivoCard = ({ student }: { student: any }) => (
    <div className="group relative flex items-center justify-between p-4 md:p-5 border-b last:border-b-0 
                    hover:bg-gradient-to-r hover:from-blue-50/80 hover:via-indigo-50/40 hover:to-purple-50/80 
                    dark:hover:from-blue-900/20 dark:hover:via-indigo-900/10 dark:hover:to-purple-900/20 
                    transition-all duration-300 ease-out cursor-pointer
                    hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01]
                    active:scale-[0.99] active:transition-transform active:duration-75">
      
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
            {student.email}
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
                                    shadow-xl rounded-lg">
          <DropdownMenuItem className="hover:bg-blue-50 dark:hover:bg-blue-900/30">
            <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> 
            <span className="font-medium">Visualizar</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
            <Pencil className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" /> 
            <span className="font-medium">Editar Aluno</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <Card className="relative overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-md 
                   border border-white/30 dark:border-slate-700/50 shadow-2xl 
                   hover:shadow-3xl transition-all duration-500 hover:-translate-y-1">
      
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
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-md">
                Gerencie seus alunos com planos de treino em andamento.
              </p>
            </div>
            <Button size="sm" 
                    className="min-h-[44px] px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-semibold
                             bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 
                             hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 
                             text-white shadow-lg hover:shadow-xl 
                             transition-all duration-300 ease-out
                             hover:scale-105 hover:-translate-y-0.5
                             border-0 rounded-lg">
              <UserPlus className="h-4 w-4 mr-2" /> 
              <span className="hidden sm:inline">Adicionar</span> Aluno
            </Button>
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
                         hover:bg-white dark:hover:bg-slate-800" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative p-0">
        <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
          {filteredStudents.map((student, index) => (
            <div key={student._id} 
                 className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
                 style={{ animationDelay: `${index * 100}ms` }}>
              <AlunoAtivoCard student={student} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function DemoDashboard() {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 
                   bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-purple-50/80 
                   dark:from-slate-900 dark:via-slate-800/95 dark:to-indigo-900/80 
                   min-h-screen">
      
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight
                       bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
                       dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 
                       bg-clip-text text-transparent
                       animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
            Bem-vindo(a) de volta, Personal! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed max-w-2xl
                      animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-150">
            Aqui está um resumo da sua atividade e administração de alunos.
          </p>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-8 md:space-y-10">
        <TabsList className="grid w-full grid-cols-2 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md 
                           border border-white/30 dark:border-slate-700/50 shadow-lg rounded-xl p-1
                           animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300">
          <TabsTrigger value="overview" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 
                               data-[state=active]:shadow-md data-[state=active]:text-blue-700 
                               dark:data-[state=active]:text-blue-400
                               transition-all duration-300 rounded-lg py-3 px-4 
                               font-semibold text-sm md:text-base">
            <LayoutDashboard className="w-4 h-4 mr-2 sm:mr-3"/> 
            <span className="hidden xs:inline">Visão Geral</span>
            <span className="xs:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="actions" 
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 
                               data-[state=active]:shadow-md data-[state=active]:text-purple-700 
                               dark:data-[state=active]:text-purple-400
                               transition-all duration-300 rounded-lg py-3 px-4 
                               font-semibold text-sm md:text-base">
            <Zap className="w-4 h-4 mr-2 sm:mr-3"/> 
            <span className="hidden xs:inline">Ações Rápidas</span>
            <span className="xs:hidden">Ações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 md:space-y-10">
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
              <StatsCard title="Total de Alunos" value="12" icon="students" />
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
              <StatsCard title="Alunos Ativos" value="8" icon="activity" />
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
              <StatsCard title="Fichas Modelo" value="15" icon="workouts" />
            </div>
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-400">
              <StatsCard title="Feedbacks Hoje" value="3" icon="sessions" />
            </div>
          </div>
          
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-500">
            <DemoAlunosAtivosList />
          </div>
        </TabsContent>

        <TabsContent value="actions" className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <Card className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md 
                         border border-white/30 dark:border-slate-700/50 shadow-2xl 
                         hover:shadow-3xl transition-all duration-500 rounded-xl overflow-hidden">
            
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/20 to-purple-50/30 
                           dark:from-blue-900/10 dark:via-indigo-900/5 dark:to-purple-900/10" />
            
            <CardHeader className="relative pb-6">
              <CardTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 
                                 dark:from-purple-400 dark:via-blue-400 dark:to-indigo-400 
                                 bg-clip-text text-transparent">
                O que você gostaria de fazer agora?
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">
                Acesse rapidamente as principais funcionalidades do sistema.
              </p>
            </CardHeader>
            
            <CardContent className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 p-6">
              <Button variant="outline" 
                      className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                               bg-gradient-to-br from-blue-50 to-indigo-50 
                               dark:from-blue-900/30 dark:to-indigo-900/30 
                               hover:from-blue-100 hover:to-indigo-100
                               border-2 border-blue-200 dark:border-blue-700
                               text-blue-700 dark:text-blue-400
                               shadow-lg hover:shadow-xl
                               transition-all duration-300 ease-out
                               hover:scale-105 hover:-translate-y-1
                               rounded-xl group">
                <div className="flex items-center justify-center">
                  <div className="font-bold">Adicionar Aluno +</div>
                </div>
              </Button>
              
              <Button variant="outline" 
                      className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                               bg-gradient-to-br from-indigo-50 to-purple-50 
                               dark:from-indigo-900/30 dark:to-purple-900/30 
                               hover:from-indigo-100 hover:to-purple-100
                               border-2 border-indigo-200 dark:border-indigo-700
                               text-indigo-700 dark:text-indigo-400
                               shadow-lg hover:shadow-xl
                               transition-all duration-300 ease-out
                               hover:scale-105 hover:-translate-y-1
                               rounded-xl group">
                <div className="flex items-center justify-center">
                  <div className="font-bold">Criar Ficha Modelo +</div>
                </div>
              </Button>
              
              <Button variant="outline" 
                      className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                               bg-gradient-to-br from-purple-50 to-pink-50 
                               dark:from-purple-900/30 dark:to-pink-900/30 
                               hover:from-purple-100 hover:to-pink-100
                               border-2 border-purple-200 dark:border-purple-700
                               text-purple-700 dark:text-purple-400
                               shadow-lg hover:shadow-xl
                               transition-all duration-300 ease-out
                               hover:scale-105 hover:-translate-y-1
                               rounded-xl group">
                <div className="flex items-center justify-center">
                  <div className="font-bold">Novo Exercício +</div>
                </div>
              </Button>
              
              <Button variant="outline" 
                      disabled
                      className="w-full min-h-[60px] md:min-h-[70px] text-base md:text-lg font-semibold p-4 md:p-6
                               bg-gradient-to-br from-gray-50 to-gray-100 
                               dark:from-gray-800/50 dark:to-gray-700/50 
                               border-2 border-gray-200 dark:border-gray-600
                               text-gray-500 dark:text-gray-400
                               cursor-not-allowed opacity-60
                               rounded-xl">
                <div className="flex items-center justify-center">
                  <div className="font-bold">Nova Avaliação +</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}