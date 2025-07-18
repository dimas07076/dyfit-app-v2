// client/src/components/dialogs/AlunoViewModal.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/apiClient';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Aluno } from "@/types/aluno";
import { Dumbbell, Edit, History, Mail, Phone, User, Weight, Ruler, Cake, Target, CalendarDays, BarChart, CheckCircle2, Sigma, FileText, View, PlusCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import ErrorMessage from '../ErrorMessage';

// <<< NOVO TIPO: Para as rotinas que serão buscadas >>>
interface AlunoRotina {
    _id: string;
    titulo: string;
    descricao?: string;
    atualizadoEm: string;
}

interface AlunoViewModalProps {
  aluno: Aluno | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Componente para a aba de Rotinas
const RotinasTab = ({ alunoId }: { alunoId: string }) => {
    const { data: rotinas, isLoading, isError, error } = useQuery<AlunoRotina[]>({
        queryKey: ['alunoRotinas', alunoId],
        queryFn: () => fetchWithAuth(`/api/aluno/${alunoId}/rotinas`),
        enabled: !!alunoId, // Só executa a query se o alunoId existir
    });

    if (isLoading) {
        return (
            <div className="space-y-3 mt-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        );
    }

    if (isError) {
        return <ErrorMessage title="Erro ao buscar rotinas" message={error.message} />;
    }

    if (!rotinas || rotinas.length === 0) {
        return (
            <div className="text-center text-muted-foreground pt-10">
                <Dumbbell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                <p className="mt-2">Nenhuma rotina associada a este aluno.</p>
                <Button variant="outline" size="sm" className="mt-4">
                    <PlusCircle className="mr-2 h-4 w-4" /> Associar Rotina
                </Button>
            </div>
        );
    }

    return (
        <div className="mt-4 pr-2 h-[250px] overflow-y-auto space-y-2">
            {rotinas.map(rotina => (
                <div key={rotina._id} className="flex items-center justify-between p-3 rounded-md border bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-semibold text-sm">{rotina.titulo}</p>
                            <p className="text-xs text-muted-foreground">
                                Atualizada em: {new Date(rotina.atualizadoEm).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon">
                        <View className="h-4 w-4" />
                    </Button>
                </div>
            ))}
        </div>
    );
};


// Componente auxiliar para um item de informação
const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => (
    <div className="flex items-start text-sm py-2 border-b border-slate-100 dark:border-slate-800">
        <Icon className="h-4 w-4 mr-3 mt-0.5 text-slate-500" />
        <span className="font-medium text-slate-600 dark:text-slate-400 w-32">{label}:</span>
        <span className="text-slate-900 dark:text-slate-100">{value || <span className="italic text-slate-400">Não informado</span>}</span>
    </div>
);

// Componente auxiliar para um KPI card
const KpiCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</CardTitle>
            <Icon className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</div>
        </CardContent>
    </Card>
);

const AlunoViewModal: React.FC<AlunoViewModalProps> = ({ aluno, open, onOpenChange }) => {
  if (!aluno) return null;

  const getInitials = (nome: string) => 
    nome?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const formatDateBR = (dateStr?: string) =>
    dateStr ? new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr)) : 'N/A';

  const frequenciaSemanal = 3;
  const progressoFicha = 66;
  const pseMedio = 7.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <div className="flex">
            <div className="w-1/3 bg-slate-50 dark:bg-slate-900/50 p-6 border-r dark:border-slate-800 hidden md:flex flex-col">
                <div className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4 border-4 border-primary/50">
                        <AvatarFallback className="text-3xl bg-slate-200 dark:bg-slate-700 text-primary">
                            {getInitials(aluno.nome)}
                        </AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{aluno.nome}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{aluno.email}</p>
                    <Badge variant={aluno.status === "active" ? "success" : "destructive"} className="mt-3">
                        {aluno.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                </div>
                <div className="mt-8 space-y-4">
                    <InfoItem icon={Mail} label="Email" value={aluno.email} />
                    <InfoItem icon={Phone} label="Telefone" value={aluno.phone} />
                </div>
            </div>

            <div className="w-full md:w-2/3 p-6 flex flex-col">
                <DialogHeader className="md:hidden mb-4 text-center">
                    <DialogTitle>{aluno.nome}</DialogTitle>
                    <DialogDescription>{aluno.email}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <KpiCard title="Frequência" value={`${frequenciaSemanal}/sem`} icon={BarChart} />
                    <KpiCard title="PSE Médio" value={pseMedio.toFixed(1)} icon={Sigma} />
                    <KpiCard title="Progresso" value={`${progressoFicha}%`} icon={CheckCircle2} />
                </div>
                {progressoFicha > 0 && <Progress value={progressoFicha} className="w-full h-2 mb-6" />}
                
                <Tabs defaultValue="detalhes" className="w-full flex-grow">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                        {/* <<< ALTERAÇÃO: Renomeado de "fichas" para "rotinas" >>> */}
                        <TabsTrigger value="rotinas">Rotinas</TabsTrigger>
                        <TabsTrigger value="historico">Histórico</TabsTrigger>
                    </TabsList>

                    <TabsContent value="detalhes" className="mt-4 pr-2 h-[250px] overflow-y-auto">
                        <div className="space-y-1">
                            <InfoItem icon={Target} label="Objetivo" value={aluno.goal} />
                            <InfoItem icon={Cake} label="Nascimento" value={formatDateBR(aluno.birthDate)} />
                            <InfoItem icon={Weight} label="Peso" value={`${aluno.weight} kg`} />
                            <InfoItem icon={Ruler} label="Altura" value={`${aluno.height} cm`} />
                            <InfoItem icon={User} label="Gênero" value={aluno.gender} />
                            <InfoItem icon={CalendarDays} label="Início" value={formatDateBR(aluno.startDate)} />
                        </div>
                    </TabsContent>

                    {/* <<< ALTERAÇÃO: Conteúdo da aba agora chama o componente RotinasTab >>> */}
                    <TabsContent value="rotinas">
                        <RotinasTab alunoId={aluno._id} />
                    </TabsContent>
                    
                     <TabsContent value="historico" className="mt-4">
                        <div className="text-center text-muted-foreground pt-10">
                            <History className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
                             <p className="mt-2">Histórico de treinos em breve.</p>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter className="mt-auto pt-6">
                    <Button variant="outline"> <Edit className="mr-2 h-4 w-4" /> Editar Aluno</Button>
                </DialogFooter>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlunoViewModal;