// client/src/pages/alunos/AlunoDashboardPage.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useAluno } from '../../context/AlunoContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Loader2, AlertTriangle, PlayCircle, Zap, History, Dumbbell, TrendingUp, ClipboardList, BookOpenCheck, Replace } from 'lucide-react'; // Adicionado ícone 'Replace'
import { useLocation } from 'wouter';
import { format, parseISO, isValid as isDateValidFn, nextDay, Day, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FrequenciaSemanal from '../../components/alunos/FrequenciaSemanal';

// --- Interfaces e Helpers (sem alterações) ---
interface ExercicioDetalhePopulado { _id: string; nome: string; grupoMuscular?: string; urlVideo?: string; descricao?: string; categoria?: string; tipo?: string; }
interface ExercicioEmDiaDeTreinoPopulado { _id: string; exercicioId: ExercicioDetalhePopulado | string; series?: string; repeticoes?: string; carga?: string; descanso?: string; observacoes?: string; ordemNoDia: number; concluido?: boolean; }
interface DiaDeTreinoPopulado { _id: string; identificadorDia: string; nomeSubFicha?: string; ordemNaRotina: number; exerciciosDoDia: ExercicioEmDiaDeTreinoPopulado[]; dataSugeridaFormatada?: string; concluidoNestaSemana?: boolean; }
interface RotinaDeTreinoAluno { _id: string; titulo: string; descricao?: string; tipo: "modelo" | "individual"; alunoId?: { _id: string; nome: string; email?: string; } | string | null; criadorId?: { _id: string; nome: string; email?: string; } | string; tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre'; diasDeTreino: DiaDeTreinoPopulado[]; pastaId?: { _id: string; nome: string; } | string | null; statusModelo?: "ativo" | "rascunho" | "arquivado"; ordemNaPasta?: number; dataValidade?: string | null; totalSessoesRotinaPlanejadas?: number | null; sessoesRotinaConcluidas: number; criadoEm: string; atualizadoEm?: string; }
interface SessaoConcluidaParaFrequencia { _id: string; sessionDate: string | Date; tipoCompromisso?: string; }

const weekDayMap: { [key: string]: Day } = { 'domingo': 0, 'segunda-feira': 1, 'terca-feira': 2, 'quarta-feira': 3, 'quinta-feira': 4, 'sexta-feira': 5, 'sabado': 6 };
const getNextDateForWeekday = (weekdayName: string): Date | null => {
    const lowerWeekdayName = weekdayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("-feira", "");
    const targetDayIndex = weekDayMap[lowerWeekdayName];
    if (targetDayIndex === undefined) { return null; }
    return nextDay(new Date(), targetDayIndex as Day);
};

const AlunoDashboardPage: React.FC = () => {
  const { aluno } = useAluno();
  const [, navigate] = useLocation();

  const [activeRotinaId, setActiveRotinaId] = useState<string | null>(() => {
    if (aluno) {
      return localStorage.getItem(`activeRotinaId_${aluno.id}`);
    }
    return null;
  });

  const {
    data: minhasRotinas, 
    isLoading: isLoadingRotinas, 
    error: errorRotinas, 
  } = useQuery<RotinaDeTreinoAluno[], Error>({ 
    queryKey: ['minhasRotinasAluno', aluno?.id], 
    queryFn: async () => { 
      if (!aluno?.id) throw new Error("Aluno não autenticado.");
      const rotinasDoAluno = await apiRequest<RotinaDeTreinoAluno[]>('GET', '/api/aluno/meus-treinos');
      return rotinasDoAluno.sort((a, b) => new Date(b.atualizadoEm || b.criadoEm).getTime() - new Date(a.atualizadoEm || a.criadoEm).getTime());
    },
    enabled: !!aluno,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!aluno) return; 

    const handleSyncActiveRotina = () => {
      if (minhasRotinas && minhasRotinas.length > 0) {
        const currentId = localStorage.getItem(`activeRotinaId_${aluno.id}`);
        const rotinaExiste = minhasRotinas.some(r => r._id === currentId);
        if (!currentId || !rotinaExiste) {
          const defaultActiveId = minhasRotinas[0]._id;
          localStorage.setItem(`activeRotinaId_${aluno.id}`, defaultActiveId);
          setActiveRotinaId(defaultActiveId);
        } else {
          setActiveRotinaId(currentId);
        }
      }
    };
    handleSyncActiveRotina();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `activeRotinaId_${aluno.id}`) {
        setActiveRotinaId(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [minhasRotinas, aluno]);

  const rotinaAtiva = useMemo(() => {
      if (!minhasRotinas || !activeRotinaId) return null;
      return minhasRotinas.find(r => r._id === activeRotinaId) || minhasRotinas[0] || null;
  }, [minhasRotinas, activeRotinaId]);
  
  const { data: sessoesConcluidasNaSemanaGeral, isLoading: isLoadingFrequencia } = useQuery<SessaoConcluidaParaFrequencia[], Error>({
    queryKey: ['frequenciaSemanalAluno', aluno?.id],
    queryFn: async () => { 
      if (!aluno?.id) throw new Error("Aluno não autenticado.");
      return apiRequest<SessaoConcluidaParaFrequencia[]>('GET', '/api/aluno/minhas-sessoes-concluidas-na-semana');
    },
    enabled: !!aluno,
    staleTime: 1000 * 60 * 1,
  });

  const { proximoDiaSugerido, alertaRotina } = useMemo(() => {
    if (!rotinaAtiva || !rotinaAtiva.diasDeTreino || rotinaAtiva.diasDeTreino.length === 0) {
        return { proximoDiaSugerido: null, alertaRotina: { tipo: 'warning', mensagem: 'Sua rotina ativa está vazia. Fale com seu personal ou escolha outra rotina.' } };
    }
    const diasDaRotinaComData = [...rotinaAtiva.diasDeTreino].map(dia => {
        let dataSugeridaFormatada;
        if (rotinaAtiva.tipoOrganizacaoRotina === 'diasDaSemana' && dia.identificadorDia) {
            const nextDate = getNextDateForWeekday(dia.identificadorDia);
            if (nextDate) { dataSugeridaFormatada = format(nextDate, "EEEE, dd/MM", { locale: ptBR }); }
        }
        return { ...dia, dataSugeridaFormatada };
    }).sort((a, b) => a.ordemNaRotina - b.ordemNaRotina);

    let alerta: { tipo: 'warning' | 'info'; mensagem: string } | null = null;
    if (rotinaAtiva.dataValidade) {
        const dataValidadeDate = parseISO(rotinaAtiva.dataValidade);
        const hoje = new Date();
        if (isDateValidFn(dataValidadeDate)) {
            const diasParaExpirar = differenceInDays(dataValidadeDate, hoje);
            if (diasParaExpirar < 0) {
                alerta = { tipo: 'warning', mensagem: 'Esta rotina expirou! Fale com seu personal para obter uma nova.' };
            } else if (diasParaExpirar <= 7) {
                alerta = { tipo: 'warning', mensagem: `Atenção: Sua rotina expira em ${diasParaExpirar + 1} dia(s)!` };
            }
        }
    }
    if (!alerta && rotinaAtiva.totalSessoesRotinaPlanejadas && rotinaAtiva.sessoesRotinaConcluidas >= rotinaAtiva.totalSessoesRotinaPlanejadas) {
      alerta = { tipo: 'info', mensagem: 'Parabéns, você concluiu esta rotina! Fale com seu personal para os próximos passos.' };
    }
    
    const proximoDia = diasDaRotinaComData[0] || null;
    
    return { proximoDiaSugerido: proximoDia, alertaRotina: alerta };
  }, [rotinaAtiva]);

  if (isLoadingRotinas || isLoadingFrequencia || !aluno) { 
    return ( <div className="flex h-screen w-full items-center justify-center bg-background"> <Loader2 className="h-10 w-10 animate-spin text-primary" /> <span className="ml-4 text-lg">Carregando seu painel...</span> </div> );
  }
  if (errorRotinas) { 
      return ( <div className="container mx-auto p-4 md:p-6"> <Alert variant="destructive"> <AlertTitle>Erro de Conexão</AlertTitle> <AlertDescription>Não foi possível carregar suas rotinas de treino. Por favor, tente novamente mais tarde.</AlertDescription> </Alert> </div> );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Olá, {aluno.nome?.split(' ')[0] || 'Aluno'}!</h1>
          <p className="text-md text-muted-foreground">Pronto para o seu próximo desafio?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="lg:col-span-2 flex flex-col shadow-lg border-primary/20 dark:border-primary/40">
          <CardHeader>
            <div className="flex items-center gap-3">
                <Dumbbell className="w-6 h-6 text-primary" />
                <CardTitle className="text-xl md:text-2xl">Seu Treino de Hoje</CardTitle>
            </div>
            <CardDescription>Sua rotina ativa é: <span className="font-semibold text-primary">{rotinaAtiva?.titulo || "Nenhuma"}</span></CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            {alertaRotina && (
                <Alert variant={alertaRotina.tipo === 'warning' ? 'destructive' : 'default'} className={alertaRotina.tipo === 'info' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700' : ''}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{alertaRotina.tipo === 'warning' ? 'Atenção!' : 'Aviso'}</AlertTitle>
                    <AlertDescription>{alertaRotina.mensagem}</AlertDescription>
                </Alert>
            )}

            {rotinaAtiva && proximoDiaSugerido && !alertaRotina?.mensagem.includes("expirou") && !alertaRotina?.mensagem.includes("concluiu") ? (
                <>
                    <div>
                        <p className="text-sm text-muted-foreground">Próximo treino sugerido:</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {proximoDiaSugerido.identificadorDia}
                            {proximoDiaSugerido.nomeSubFicha ? ` - ${proximoDiaSugerido.nomeSubFicha}` : ''}
                        </p>
                        {proximoDiaSugerido.dataSugeridaFormatada && <p className="text-sm text-muted-foreground capitalize">{proximoDiaSugerido.dataSugeridaFormatada}</p>}
                    </div>

                    {rotinaAtiva.totalSessoesRotinaPlanejadas != null && rotinaAtiva.totalSessoesRotinaPlanejadas > 0 && (
                        <div>
                            <p className="text-sm font-medium mb-1">Progresso da Rotina ({rotinaAtiva.sessoesRotinaConcluidas} de {rotinaAtiva.totalSessoesRotinaPlanejadas})</p>
                            <Progress value={(rotinaAtiva.sessoesRotinaConcluidas / rotinaAtiva.totalSessoesRotinaPlanejadas) * 100} className="h-2.5" />
                        </div>
                    )}
                </>
            ) : (
                <div className="flex items-center justify-center text-center h-full">
                    <p className="text-muted-foreground">
                        {rotinaAtiva ? 'Selecione um treino ou fale com seu personal.' : 'Você não possui uma rotina ativa.'}
                    </p>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2">
            {rotinaAtiva && proximoDiaSugerido && !alertaRotina?.mensagem.includes("expirou") && !alertaRotina?.mensagem.includes("concluiu") ? (
              <>
                <Button size="lg" className="w-full font-bold text-lg" onClick={() => navigate(`/aluno/ficha/${rotinaAtiva._id}?diaId=${proximoDiaSugerido._id}`)}>
                    <PlayCircle className="w-6 h-6 mr-3" />
                    Iniciar Treino do Dia
                </Button>
                <Button variant="link" className="text-sm text-muted-foreground h-auto pb-1" onClick={() => navigate(`/aluno/ficha/${rotinaAtiva._id}`)}>
                    <Replace className="w-4 h-4 mr-2" />
                    Escolher outro treino
                </Button>
              </>
            ) : (
                <Button size="lg" className="w-full font-bold text-lg" onClick={() => navigate('/aluno/meus-treinos')}>
                    <BookOpenCheck className="w-6 h-6 mr-3" />
                    Ativar uma Rotina
                </Button>
            )}
          </CardFooter>
        </Card>

        {/* ... Os outros cards permanecem os mesmos ... */}
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-500" />
                    <CardTitle>Sua Frequência Semanal</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <FrequenciaSemanal sessoesConcluidasNaSemana={sessoesConcluidasNaSemanaGeral || []} isLoading={isLoadingFrequencia} />
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate('/aluno/historico')}>
                    <History className="w-4 h-4 mr-2" />
                    Ver Histórico Completo
                </Button>
            </CardFooter>
        </Card>
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                    <CardTitle>Seu Progresso</CardTitle>
                </div>
                 <CardDescription>Resumo da sua jornada até agora.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                    <span className="text-muted-foreground">Total de Treinos Concluídos</span>
                    <span className="font-bold text-lg">{sessoesConcluidasNaSemanaGeral?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                    <span className="text-muted-foreground">Média de PSE</span>
                    <span className="font-bold text-lg text-gray-400">N/D</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                    <span className="text-muted-foreground">Dias Consecutivos</span>
                    <span className="font-bold text-lg text-gray-400">N/D</span>
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Análise de Progresso (Em breve)
                </Button>
            </CardFooter>
        </Card>
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-blue-500" />
                    <CardTitle>Suas Fichas de Treino</CardTitle>
                </div>
                <CardDescription>Gerencie todas as suas rotinas disponíveis.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Sua rotina ativa no momento é <strong className="text-foreground">{rotinaAtiva?.titulo || 'nenhuma'}.</strong> Explore outras opções ou revise os detalhes da sua ficha atual.
                </p>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={() => navigate('/aluno/meus-treinos')}>
                    <BookOpenCheck className="w-4 h-4 mr-2" />
                    Ver Todas as Rotinas
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AlunoDashboardPage;