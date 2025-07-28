// client/src/pages/alunos/AlunoDashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { useAluno } from '../../context/AlunoContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Loader2, AlertTriangle, PlayCircle, Zap, History, Dumbbell, TrendingUp, ClipboardList, BookOpenCheck, Replace, Eye } from 'lucide-react';
import { useLocation } from 'wouter';
import { format, parseISO, isValid as isDateValidFn, nextDay, Day, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FrequenciaSemanal from '../../components/alunos/FrequenciaSemanal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { useLogger } from '@/lib/logger';
import ErrorBoundary from '@/components/ErrorBoundary';


// --- Interfaces ---
interface ExercicioDetalhePopulado { _id: string; nome: string; grupoMuscular?: string; urlVideo?: string; descricao?: string; categoria?: string; tipo?: string; }
interface ExercicioEmDiaDeTreinoPopulado { _id: string; exercicioId: ExercicioDetalhePopulado | string; series?: string; repeticoes?: string; carga?: string; descanso?: string; observacoes?: string; ordemNoDia: number; concluido?: boolean; }
interface DiaDeTreinoPopulado { _id: string; identificadorDia: string; nomeSubFicha?: string; ordemNaRotina: number; exerciciosDoDia: ExercicioEmDiaDeTreinoPopulado[]; dataSugeridaFormatada?: string; concluidoNestaSemana?: boolean; }
interface RotinaDeTreinoAluno { _id: string; titulo: string; descricao?: string; tipo: "modelo" | "individual"; alunoId?: { _id: string; nome: string; email?: string; } | string | null; criadorId?: { _id: string; nome: string; email?: string; } | string; tipoOrganizacaoRotina: 'diasDaSemana' | 'numerico' | 'livre'; diasDeTreino: DiaDeTreinoPopulado[]; pastaId?: { _id: string; nome: string; } | string | null; statusModelo?: "ativo" | "rascunho" | "arquivado"; ordemNaPasta?: number; dataValidade?: string | null; totalSessoesRotinaPlanejadas?: number | null; sessoesRotinaConcluidas: number; criadoEm: string; atualizadoEm?: string; }
interface SessaoConcluidaParaFrequencia { _id: string; sessionDate: string | Date; tipoCompromisso?: string; }
interface ProgressoStats {
  totalTreinosConcluidos: number;
  mediaPSE: string | number;
  diasConsecutivos: number;
}

const DiaDetalhesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  diaDeTreino: DiaDeTreinoPopulado | null;
}> = ({ isOpen, onClose, onStart, diaDeTreino }) => {
  if (!diaDeTreino) return null;

  const exercicios = diaDeTreino.exerciciosDoDia
    .filter(ex => ex.exercicioId && typeof ex.exercicioId === 'object')
    .sort((a, b) => a.ordemNoDia - b.ordemNoDia);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{diaDeTreino.identificadorDia}{diaDeTreino.nomeSubFicha && ` - ${diaDeTreino.nomeSubFicha}`}</DialogTitle>
          <DialogDescription>Lista de exercícios para este dia.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4 my-4">
          <ul className="space-y-3">
            {exercicios.map(ex => (
              <li key={ex._id} className="text-sm p-2 bg-slate-50 rounded-md">
                {(ex.exercicioId as ExercicioDetalhePopulado).nome}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Fechar</Button>
          <Button type="button" onClick={onStart}>
            <PlayCircle className="mr-2 h-4 w-4" /> Iniciar Treino
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const weekDayMap: { [key: string]: Day } = { 'domingo': 0, 'segunda-feira': 1, 'terca-feira': 2, 'quarta-feira': 3, 'quinta-feira': 4, 'sexta-feira': 5, 'sabado': 6 };
const getNextDateForWeekday = (weekdayName: string): Date | null => {
    const lowerWeekdayName = weekdayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace("-feira", "");
    const targetDayIndex = weekDayMap[lowerWeekdayName];
    if (targetDayIndex === undefined) { return null; }
    return nextDay(new Date(), targetDayIndex as Day);
};

const AlunoDashboardPage: React.FC = () => {
  const logger = useLogger('AlunoDashboardPage');
  const { aluno } = useAluno();
  const [, navigate] = useLocation();
  const [activeRotinaId, setActiveRotinaId] = useState<string | null>(() => {
    if (aluno) { return localStorage.getItem(`activeRotinaId_${aluno.id}`); }
    return null;
  });
  const [diaParaVerDetalhes, setDiaParaVerDetalhes] = useState<DiaDeTreinoPopulado | null>(null);
  const [queryTimeout, setQueryTimeout] = useState<NodeJS.Timeout | null>(null);

  // Log component mount
  useEffect(() => {
    logger.mounted({ 
      alunoId: aluno?.id,
      alunoName: aluno?.nome,
      hasAluno: !!aluno,
      activeRotinaId 
    });

    if (!aluno) {
      logger.warn('AlunoDashboardPage mounted without aluno');
    }

    return () => {
      logger.unmounted();
      if (queryTimeout) {
        clearTimeout(queryTimeout);
      }
    };
  }, [aluno]);

  // Performance timing
  useEffect(() => {
    logger.time('aluno-dashboard-render');
    return () => logger.timeEnd('aluno-dashboard-render');
  });

  const { data: minhasRotinas, isLoading: isLoadingRotinas, error: errorRotinas } = useQuery<RotinaDeTreinoAluno[], Error>({
    queryKey: ['minhasRotinasAluno', aluno?.id],
    queryFn: async () => {
      try {
        if (!aluno?.id) {
          const error = new Error("Aluno não autenticado.");
          logger.error('Rotinas query failed - no aluno', error);
          throw error;
        }
        
        logger.queryStarted('minhasRotinasAluno');
        logger.time('fetch-rotinas');
        
        const rotinasDoAluno = await apiRequest<RotinaDeTreinoAluno[]>('GET', '/api/aluno/meus-treinos', undefined, 'aluno');
        const sortedRotinas = rotinasDoAluno.sort((a, b) => new Date(b.atualizadoEm || b.criadoEm).getTime() - new Date(a.atualizadoEm || a.criadoEm).getTime());
        
        logger.timeEnd('fetch-rotinas');
        logger.querySuccess('minhasRotinasAluno', { count: sortedRotinas.length });
        
        return sortedRotinas;
      } catch (error) {
        logger.timeEnd('fetch-rotinas');
        logger.queryError('minhasRotinasAluno', error as Error);
        throw error;
      }
    },
    enabled: !!aluno,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      const shouldRetry = failureCount < 3;
      logger.warn(`Rotinas query failed, retry ${failureCount}/3`, { shouldRetry, error: error.message });
      return shouldRetry;
    },
  });

  const { data: statsProgresso, isLoading: isLoadingStats, error: errorStats } = useQuery<ProgressoStats, Error>({
    queryKey: ['statsProgressoAluno', aluno?.id],
    queryFn: async () => {
      try {
        logger.queryStarted('statsProgressoAluno');
        logger.time('fetch-stats');
        
        const result = await apiRequest<ProgressoStats>('GET', '/api/aluno/stats-progresso', undefined, 'aluno');
        
        logger.timeEnd('fetch-stats');
        logger.querySuccess('statsProgressoAluno', result);
        
        return result;
      } catch (error) {
        logger.timeEnd('fetch-stats');
        logger.queryError('statsProgressoAluno', error as Error);
        throw error;
      }
    },
    enabled: !!aluno,
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      const shouldRetry = failureCount < 3;
      logger.warn(`Stats query failed, retry ${failureCount}/3`, { shouldRetry, error: error.message });
      return shouldRetry;
    },
  });

  useEffect(() => {
    if (!aluno) return;

    const handleSyncActiveRotina = () => {
      logger.debug('Syncing active rotina', { alunoId: aluno.id, minhasRotinasCount: minhasRotinas?.length });
      
      if (minhasRotinas && minhasRotinas.length > 0) {
        const currentId = localStorage.getItem(`activeRotinaId_${aluno.id}`);
        const rotinaExiste = minhasRotinas.some(r => r._id === currentId);
        
        if (!currentId || !rotinaExiste) {
          const defaultActiveId = minhasRotinas[0]._id;
          logger.info('Setting default active rotina', { 
            previousId: currentId, 
            newId: defaultActiveId,
            rotinaExistia: rotinaExiste 
          });
          localStorage.setItem(`activeRotinaId_${aluno.id}`, defaultActiveId);
          setActiveRotinaId(defaultActiveId);
        } else {
          logger.debug('Using existing active rotina', { activeId: currentId });
          setActiveRotinaId(currentId);
        }
      } else {
        logger.warn('No rotinas available to set as active');
      }
    };

    handleSyncActiveRotina();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `activeRotinaId_${aluno.id}`) {
        logger.info('Active rotina changed via storage event', { 
          oldValue: event.oldValue, 
          newValue: event.newValue 
        });
        setActiveRotinaId(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [minhasRotinas, aluno]);

  const { data: sessoesConcluidasNaSemanaGeral, isLoading: isLoadingFrequencia, error: errorFrequencia } = useQuery<SessaoConcluidaParaFrequencia[], Error>({
    queryKey: ['frequenciaSemanalAluno', aluno?.id],
    queryFn: async () => {
      try {
        if (!aluno?.id) {
          const error = new Error("Aluno não autenticado.");
          logger.error('Frequencia query failed - no aluno', error);
          throw error;
        }
        
        logger.queryStarted('frequenciaSemanalAluno');
        logger.time('fetch-frequencia');
        
        const result = await apiRequest<SessaoConcluidaParaFrequencia[]>('GET', '/api/aluno/minhas-sessoes-concluidas-na-semana', undefined, 'aluno');
        
        logger.timeEnd('fetch-frequencia');
        logger.querySuccess('frequenciaSemanalAluno', { count: result.length });
        
        return result;
      } catch (error) {
        logger.timeEnd('fetch-frequencia');
        logger.queryError('frequenciaSemanalAluno', error as Error);
        throw error;
      }
    },
    enabled: !!aluno,
    staleTime: 1000 * 60 * 1,
    retry: (failureCount, error) => {
      const shouldRetry = failureCount < 3;
      logger.warn(`Frequencia query failed, retry ${failureCount}/3`, { shouldRetry, error: error.message });
      return shouldRetry;
    },
  });

  // Add timeout for loading states
  useEffect(() => {
    const isAnyLoading = isLoadingRotinas || isLoadingFrequencia || isLoadingStats;
    
    if (isAnyLoading && !queryTimeout) {
      const timeout = setTimeout(() => {
        logger.warn('Queries timeout reached - still loading after 30 seconds', {
          isLoadingRotinas,
          isLoadingFrequencia,
          isLoadingStats,
          alunoId: aluno?.id,
        });
      }, 30000); // 30 seconds
      
      setQueryTimeout(timeout);
    } else if (!isAnyLoading && queryTimeout) {
      clearTimeout(queryTimeout);
      setQueryTimeout(null);
    }
  }, [isLoadingRotinas, isLoadingFrequencia, isLoadingStats]);

  // Log data changes
  useEffect(() => {
    if (minhasRotinas) {
      logger.info('Rotinas data loaded', { 
        count: minhasRotinas.length,
        rotinaIds: minhasRotinas.map(r => r._id),
      });
    }
  }, [minhasRotinas]);

  useEffect(() => {
    if (statsProgresso) {
      logger.info('Stats data loaded', statsProgresso);
    }
  }, [statsProgresso]);

  useEffect(() => {
    if (sessoesConcluidasNaSemanaGeral) {
      logger.info('Frequencia data loaded', { count: sessoesConcluidasNaSemanaGeral.length });
    }
  }, [sessoesConcluidasNaSemanaGeral]);

  // Log errors
  useEffect(() => {
    if (errorRotinas) {
      logger.error('Rotinas query error', errorRotinas);
    }
  }, [errorRotinas]);

  useEffect(() => {
    if (errorStats) {
      logger.error('Stats query error', errorStats);
    }
  }, [errorStats]);

  useEffect(() => {
    if (errorFrequencia) {
      logger.error('Frequencia query error', errorFrequencia);
    }
  }, [errorFrequencia]);
  
  const rotinaAtiva = (minhasRotinas && activeRotinaId) 
    ? minhasRotinas.find(r => r._id === activeRotinaId) || minhasRotinas[0] || null
    : null;

  const getProximoDiaEAlerta = () => {
    logger.debug('Calculating next day and alerts', { 
      hasRotinaAtiva: !!rotinaAtiva,
      diasDeTreinoCount: rotinaAtiva?.diasDeTreino?.length || 0 
    });

    if (!rotinaAtiva || !rotinaAtiva.diasDeTreino || rotinaAtiva.diasDeTreino.length === 0) {
      const alert = { tipo: 'warning' as const, mensagem: 'Sua rotina ativa está vazia. Fale com seu personal ou escolha outra rotina.' };
      logger.warn('Empty or missing training routine', { rotinaAtivaId: rotinaAtiva?._id });
      return { proximoDiaSugerido: null, alertaRotina: alert };
    }

    const diasDaRotinaComData = [...rotinaAtiva.diasDeTreino].map(dia => {
      let dataSugeridaFormatada;
      if (rotinaAtiva.tipoOrganizacaoRotina === 'diasDaSemana' && dia.identificadorDia) {
        const nextDate = getNextDateForWeekday(dia.identificadorDia);
        if (nextDate) {
          dataSugeridaFormatada = format(nextDate, "EEEE, dd/MM", { locale: ptBR });
        }
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
          alerta = { tipo: 'warning' as const, mensagem: 'Esta rotina expirou! Fale com seu personal para obter uma nova.' };
          logger.warn('Routine has expired', { 
            rotinaId: rotinaAtiva._id, 
            dataValidade: rotinaAtiva.dataValidade,
            diasParaExpirar 
          });
        } else if (diasParaExpirar <= 7) {
          alerta = { tipo: 'warning' as const, mensagem: `Atenção: Sua rotina expira em ${diasParaExpirar + 1} dia(s)!` };
          logger.info('Routine expiring soon', { 
            rotinaId: rotinaAtiva._id, 
            diasParaExpirar 
          });
        }
      }
    }
    if (!alerta && rotinaAtiva.totalSessoesRotinaPlanejadas && rotinaAtiva.sessoesRotinaConcluidas >= rotinaAtiva.totalSessoesRotinaPlanejadas) {
      alerta = { tipo: 'info' as const, mensagem: 'Parabéns, você concluiu esta rotina! Fale com seu personal para os próximos passos.' };
      logger.info('Routine completed', { 
        rotinaId: rotinaAtiva._id, 
        sessoesCompletas: rotinaAtiva.sessoesRotinaConcluidas,
        totalPlanejadas: rotinaAtiva.totalSessoesRotinaPlanejadas 
      });
    }
    
    const proximoDia = diasDaRotinaComData[0] || null;
    logger.debug('Next day calculated', { 
      proximoDiaId: proximoDia?._id,
      alertaType: alerta?.tipo 
    });
    
    return { proximoDiaSugerido: proximoDia, alertaRotina: alerta };
  };

  const { proximoDiaSugerido, alertaRotina } = getProximoDiaEAlerta();

  // Log render state
  logger.debug('AlunoDashboardPage rendering', {
    hasAluno: !!aluno,
    alunoId: aluno?.id,
    isLoadingRotinas,
    isLoadingFrequencia,
    isLoadingStats,
    hasRotinaAtiva: !!rotinaAtiva,
    hasProximoDia: !!proximoDiaSugerido,
    hasAlerta: !!alertaRotina,
    activeRotinaId,
    queryTimeout: !!queryTimeout,
  });

  if (isLoadingRotinas || isLoadingFrequencia || !aluno || isLoadingStats) {
    logger.debug('Showing loading spinner', {
      isLoadingRotinas,
      isLoadingFrequencia,
      isLoadingStats,
      hasAluno: !!aluno,
    });
    
    return (
      // Alterado de "flex h-screen w-full" para "fixed inset-0 z-50 flex" para criar um overlay verdadeiro
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-400">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
        <span className="ml-4 text-lg text-white">Carregando seu painel...</span>
        {queryTimeout && (
          <span className="ml-2 text-sm text-white/80">(Isto está demorando mais que o esperado)</span>
        )}
      </div>
    );
  }

  if (errorRotinas) {
    logger.error('Rendering error state for rotinas');
    return (
      <ErrorBoundary componentName="AlunoDashboardPage[RotinasError]">
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-400 p-4 text-white">
          <Alert variant="destructive" className="bg-red-800/80 border-red-500 text-white">
            <AlertTitle>Erro de Conexão</AlertTitle>
            <AlertDescription>
              Não foi possível carregar suas rotinas de treino. Por favor, tente novamente mais tarde.
              <div className="mt-2 text-xs">
                Erro: {errorRotinas.message} | Aluno: {aluno?.id}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </ErrorBoundary>
    );
  }
  return (
    <ErrorBoundary 
      componentName="AlunoDashboardPage"
      onError={(error, errorInfo) => {
        logger.error('ErrorBoundary caught error in AlunoDashboardPage', error, { 
          errorInfo, 
          alunoId: aluno?.id,
          activeRotinaId,
        });
      }}
    >
      <div className="min-h-screen text-white"> 
        <div className="mb-6">
            <h1 className="text-3xl font-bold">Olá, {aluno.nome?.split(' ')[0] || 'Aluno'}!</h1>
            <p className="text-lg mt-1 opacity-90">Pronto para o seu próximo desafio?</p>
        </div>
        <div className="space-y-6">
          <ErrorBoundary 
            componentName="TreinoCard"
            fallback={
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0 p-4">
                <p className="text-red-600">Erro ao carregar informações do treino</p>
              </Card>
            }
          >
            <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-6 h-6 text-indigo-600" />
                  <CardTitle className="text-xl font-bold">Seu Treino de Hoje</CardTitle>
                </div>
                <CardDescription className="!mt-2">
                  Sua rotina ativa é: <span className="font-semibold text-indigo-600">{rotinaAtiva?.titulo || "Nenhuma"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {alertaRotina && (
                    <Alert variant={alertaRotina.tipo === 'warning' ? 'destructive' : 'default'} className={alertaRotina.tipo === 'info' ? 'bg-blue-50 border-blue-200' : ''}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{alertaRotina.tipo === 'warning' ? 'Atenção!' : 'Aviso'}</AlertTitle>
                        <AlertDescription>{alertaRotina.mensagem}</AlertDescription>
                    </Alert>
                )}
                {rotinaAtiva && proximoDiaSugerido && !alertaRotina?.mensagem.includes("expirou") && !alertaRotina?.mensagem.includes("concluiu") ? (
                    <>
                        <div>
                            <p className="text-sm text-gray-600">Próximo treino sugerido:</p>
                            <p className="text-lg font-bold text-gray-900">
                                {proximoDiaSugerido.identificadorDia}
                                {proximoDiaSugerido.nomeSubFicha ? ` - ${proximoDiaSugerido.nomeSubFicha}` : ''}
                            </p>
                        </div>

                        {rotinaAtiva.totalSessoesRotinaPlanejadas != null && rotinaAtiva.totalSessoesRotinaPlanejadas > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-1 text-gray-700">Progresso da Rotina ({rotinaAtiva.sessoesRotinaConcluidas} de {rotinaAtiva.totalSessoesRotinaPlanejadas})</p>
                                <Progress value={(rotinaAtiva.sessoesRotinaConcluidas / rotinaAtiva.totalSessoesRotinaPlanejadas) * 100} className="h-2.5" />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-gray-600">{rotinaAtiva ? 'Fale com seu personal ou ative outra rotina.' : 'Você não possui uma rotina ativa.'}</p>
                    </div>
                )}
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3 pt-4">
                {rotinaAtiva && proximoDiaSugerido && !alertaRotina?.mensagem.includes("expirou") && !alertaRotina?.mensagem.includes("concluiu") ? (
                  <>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          className="w-full sm:w-auto" 
                          onClick={() => {
                            logger.userAction('view-workout-details', { 
                              diaId: proximoDiaSugerido._id,
                              rotinaId: rotinaAtiva._id 
                            });
                            setDiaParaVerDetalhes(proximoDiaSugerido);
                          }}
                        >
                            <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                        </Button>
                        <Button 
                          size="lg" 
                          className="w-full sm:flex-1 font-bold text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" 
                          onClick={() => {
                            logger.userAction('start-workout', { 
                              diaId: proximoDiaSugerido._id,
                              rotinaId: rotinaAtiva._id 
                            });
                            navigate(`/aluno/ficha/${rotinaAtiva._id}?diaId=${proximoDiaSugerido._id}`);
                          }}
                        >
                            <PlayCircle className="w-5 h-5 mr-2" /> Iniciar Treino
                        </Button>
                    </div>
                    <Button 
                      variant="link" 
                      className="text-sm text-gray-600 hover:text-indigo-600 h-auto" 
                      onClick={() => {
                        logger.userAction('choose-different-workout', { rotinaId: rotinaAtiva._id });
                        navigate(`/aluno/ficha/${rotinaAtiva._id}`);
                      }}
                    >
                        <Replace className="w-4 h-4 mr-2" />
                        Escolher outro treino
                    </Button>
                  </>
                ) : (
                    <Button 
                      size="lg" 
                      className="w-full font-bold text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" 
                      onClick={() => {
                        logger.userAction('activate-routine-clicked');
                        navigate('/aluno/meus-treinos');
                      }}
                    >
                        <BookOpenCheck className="w-5 h-5 mr-2" />
                        Ativar uma Rotina
                    </Button>
                )}
              </CardFooter>
            </Card>
          </ErrorBoundary>

          <ErrorBoundary 
            componentName="FrequenciaCard"
            fallback={
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0 p-4">
                <p className="text-red-600">Erro ao carregar frequência semanal</p>
              </Card>
            }
          >
            <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-yellow-500" />
                        <CardTitle className="text-xl font-bold">Sua Frequência Semanal</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <FrequenciaSemanal sessoesConcluidasNaSemana={sessoesConcluidasNaSemanaGeral || []} isLoading={isLoadingFrequencia} />
                </CardContent>
                <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900" 
                      onClick={() => {
                        logger.userAction('view-full-history');
                        navigate('/aluno/historico');
                      }}
                    >
                        <History className="w-4 h-4 mr-2" />
                        Ver Histórico Completo
                    </Button>
                </CardFooter>
            </Card>
          </ErrorBoundary>

          <ErrorBoundary 
            componentName="ProgressCard"
            fallback={
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0 p-4">
                <p className="text-red-600">Erro ao carregar estatísticas de progresso</p>
              </Card>
            }
          >
            <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-green-500" />
                        <CardTitle className="text-xl font-bold">Seu Progresso</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    {isLoadingStats ? (
                        <>
                            <div className="flex justify-between items-center p-3">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-6 w-10" />
                            </div>
                            <div className="flex justify-between items-center p-3">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-6 w-10" />
                            </div>
                            <div className="flex justify-between items-center p-3">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-6 w-10" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Total de Treinos Concluídos</span>
                                <span className="font-bold text-lg text-gray-800">{statsProgresso?.totalTreinosConcluidos ?? 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Média de PSE</span>
                                <span className="font-bold text-lg text-gray-800">{statsProgresso?.mediaPSE ?? 'N/D'}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Dias Consecutivos</span>
                                <span className="font-bold text-lg text-gray-800">{statsProgresso?.diasConsecutivos ?? 0}</span>
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full border-gray-300 text-gray-700" disabled>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Análise de Progresso (Em breve)
                    </Button>
                </CardFooter>
            </Card>
          </ErrorBoundary>

          <ErrorBoundary 
            componentName="RoutinesCard"
            fallback={
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0 p-4">
                <p className="text-red-600">Erro ao carregar fichas de treino</p>
              </Card>
            }
          >
            <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-6 h-6 text-blue-500" />
                        <CardTitle className="text-xl font-bold">Suas Fichas de Treino</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 text-center">
                        Gerencie todas as suas rotinas e escolha qual seguir.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl" 
                      onClick={() => {
                        logger.userAction('view-all-routines');
                        navigate('/aluno/meus-treinos');
                      }}
                    >
                        <BookOpenCheck className="w-4 h-4 mr-2" />
                        Ver Todas as Rotinas
                    </Button>
                </CardFooter>
            </Card>
          </ErrorBoundary>
        </div>
        
        <ErrorBoundary 
          componentName="DiaDetalhesModal"
          fallback={null}
        >
          <DiaDetalhesModal
            isOpen={!!diaParaVerDetalhes}
            onClose={() => {
              logger.userAction('close-workout-details-modal');
              setDiaParaVerDetalhes(null);
            }}
            onStart={() => {
                if (diaParaVerDetalhes && rotinaAtiva) {
                    logger.userAction('start-workout-from-modal', { 
                      diaId: diaParaVerDetalhes._id,
                      rotinaId: rotinaAtiva._id 
                    });
                    navigate(`/aluno/ficha/${rotinaAtiva._id}?diaId=${diaParaVerDetalhes._id}`);
                    setDiaParaVerDetalhes(null);
                }
            }}
            diaDeTreino={diaParaVerDetalhes}
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
};

export default AlunoDashboardPage;
