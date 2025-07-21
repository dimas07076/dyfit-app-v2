// client/src/pages/alunos/AlunoDashboardPage.tsx
import React, { useMemo } from 'react';
import { useAluno } from '../../context/AlunoContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
// <<< ALTERAÇÃO: 'ClipboardList' foi removido desta linha >>>
import { Loader2, AlertTriangle, PlayCircle, Zap, History, Dumbbell, TrendingUp, BookOpenCheck, Replace } from 'lucide-react';
import { useLocation } from 'wouter';
// <<< ALTERAÇÃO: 'format' foi removido desta linha >>>
import { parseISO, isValid as isDateValidFn, differenceInDays } from 'date-fns';
import FrequenciaSemanal from '../../components/alunos/FrequenciaSemanal';

// --- Interfaces ---
// (Estas interfaces podem ser movidas para um arquivo de tipos compartilhado no futuro)
interface DiaDeTreinoPopulado { _id: string; identificadorDia: string; nomeSubFicha?: string; ordemNaRotina: number; }
interface RotinaDeTreinoAluno { _id: string; titulo: string; dataValidade?: string | null; totalSessoesRotinaPlanejadas?: number | null; sessoesRotinaConcluidas: number; diasDeTreino: DiaDeTreinoPopulado[]; }
interface SessaoConcluidaParaFrequencia { _id: string; sessionDate: string | Date; }
// Interface para a resposta da nossa nova rota do dashboard
interface AlunoDashboardData {
  minhasRotinas: RotinaDeTreinoAluno[];
  ultimoDiaConcluidoId: string | null;
  sessoesConcluidasNaSemana: SessaoConcluidaParaFrequencia[];
}

// ============================================================================
// LÓGICA DE SUGESTÃO DE TREINO (A NOVA PARTE INTELIGENTE)
// ============================================================================
const getProximoDiaSugerido = (rotinaAtiva: RotinaDeTreinoAluno | null, ultimoDiaConcluidoId: string | null) => {
    if (!rotinaAtiva || !rotinaAtiva.diasDeTreino || rotinaAtiva.diasDeTreino.length === 0) {
        return null;
    }

    const diasOrdenados = [...rotinaAtiva.diasDeTreino].sort((a, b) => a.ordemNaRotina - b.ordemNaRotina);

    if (!ultimoDiaConcluidoId) {
        // Se o aluno nunca concluiu um treino desta rotina, sugere o primeiro.
        return diasOrdenados[0];
    }

    const indiceUltimoConcluido = diasOrdenados.findIndex(dia => dia._id === ultimoDiaConcluidoId);

    if (indiceUltimoConcluido === -1) {
        // Se o último dia concluído não foi encontrado (ex: rotina mudou), sugere o primeiro.
        return diasOrdenados[0];
    }

    // Calcula o índice do próximo dia, reiniciando o ciclo se necessário.
    const indiceProximoDia = (indiceUltimoConcluido + 1) % diasOrdenados.length;
    
    return diasOrdenados[indiceProximoDia];
};


const AlunoDashboardPage: React.FC = () => {
  const { aluno } = useAluno();
  const [, navigate] = useLocation();

  // --- UMA ÚNICA CHAMADA PARA BUSCAR TODOS OS DADOS DO DASHBOARD ---
  const { data: dashboardData, isLoading, error } = useQuery<AlunoDashboardData, Error>({
    queryKey: ['alunoDashboardData', aluno?.id],
    queryFn: () => apiRequest('GET', '/api/aluno/dashboard'),
    enabled: !!aluno,
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });

  // --- LÓGICA DE ESTADO DERIVADO (agora muito mais simples) ---
  const { rotinaAtiva, proximoDiaSugerido, alertaRotina } = useMemo(() => {
    if (!dashboardData) {
        return { rotinaAtiva: null, proximoDiaSugerido: null, alertaRotina: null };
    }
    
    // A rotina ativa é a primeira da lista (a mais recente)
    const ativa = dashboardData.minhasRotinas?.[0] || null;
    
    // Usa nossa nova função inteligente para obter a sugestão correta
    const proximo = getProximoDiaSugerido(ativa, dashboardData.ultimoDiaConcluidoId);
    
    let alerta: { tipo: 'warning' | 'info'; mensagem: string } | null = null;
    if (ativa) {
        if (!ativa.diasDeTreino || ativa.diasDeTreino.length === 0) {
            alerta = { tipo: 'warning', mensagem: 'Sua rotina ativa está vazia. Fale com seu personal.' };
        } else if (ativa.dataValidade) {
            const dataValidadeDate = parseISO(ativa.dataValidade);
            if (isDateValidFn(dataValidadeDate)) {
                const diasParaExpirar = differenceInDays(dataValidadeDate, new Date());
                if (diasParaExpirar < 0) {
                    alerta = { tipo: 'warning', mensagem: 'Esta rotina expirou! Fale com seu personal para obter uma nova.' };
                } else if (diasParaExpirar <= 7) {
                    alerta = { tipo: 'warning', mensagem: `Atenção: Sua rotina expira em ${diasParaExpirar + 1} dia(s)!` };
                }
            }
        }
    }
    
    return { rotinaAtiva: ativa, proximoDiaSugerido: proximo, alertaRotina: alerta };
  }, [dashboardData]);


  if (isLoading || !aluno) { 
    return ( <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-400"> <Loader2 className="h-10 w-10 animate-spin text-white" /> <span className="ml-4 text-lg text-white">Carregando seu painel...</span> </div> );
  }
  if (error) { 
      return ( <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-400 p-4 text-white"> <Alert variant="destructive" className="bg-red-800/80 border-red-500 text-white"> <AlertTitle>Erro de Conexão</AlertTitle> <AlertDescription>Não foi possível carregar seus dados. Por favor, tente novamente mais tarde.</AlertDescription> </Alert> </div> );
  }

  // --- RENDERIZAÇÃO DO DASHBOARD (praticamente inalterada) ---
  return (
    <div className="min-h-screen text-white"> 
      <div className="mb-6">
          <h1 className="text-3xl font-bold">Olá, {aluno.nome?.split(' ')[0] || 'Aluno'}!</h1>
          <p className="text-lg mt-1 opacity-90">Pronto para o seu próximo desafio?</p>
      </div>

      <div className="space-y-6">
        <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center gap-3"><Dumbbell className="w-6 h-6 text-indigo-600" /><CardTitle className="text-xl font-bold">Seu Treino de Hoje</CardTitle></div>
            <CardDescription className="!mt-2">Sua rotina ativa é: <span className="font-semibold text-indigo-600">{rotinaAtiva?.titulo || "Nenhuma"}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {alertaRotina && (<Alert variant={alertaRotina.tipo === 'warning' ? 'destructive' : 'default'} className={alertaRotina.tipo === 'info' ? 'bg-blue-50 border-blue-200' : ''}><AlertTriangle className="h-4 w-4" /><AlertTitle>{alertaRotina.tipo === 'warning' ? 'Atenção!' : 'Aviso'}</AlertTitle><AlertDescription>{alertaRotina.mensagem}</AlertDescription></Alert>)}
            {rotinaAtiva && proximoDiaSugerido && !alertaRotina?.mensagem.includes("expirou") ? (
                <>
                    <div><p className="text-sm text-gray-600">Próximo treino sugerido:</p><p className="text-lg font-bold text-gray-900">{proximoDiaSugerido.identificadorDia}{proximoDiaSugerido.nomeSubFicha ? ` - ${proximoDiaSugerido.nomeSubFicha}` : ''}</p></div>
                    {rotinaAtiva.totalSessoesRotinaPlanejadas != null && rotinaAtiva.totalSessoesRotinaPlanejadas > 0 && (<div><p className="text-sm font-medium mb-1 text-gray-700">Progresso da Rotina ({rotinaAtiva.sessoesRotinaConcluidas} de {rotinaAtiva.totalSessoesRotinaPlanejadas})</p><Progress value={(rotinaAtiva.sessoesRotinaConcluidas / rotinaAtiva.totalSessoesRotinaPlanejadas) * 100} className="h-2.5" /></div>)}
                </>
            ) : (<div className="text-center py-4"><p className="text-gray-600">{rotinaAtiva ? 'Fale com seu personal ou ative outra rotina.' : 'Você não possui uma rotina ativa.'}</p></div>)}
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 pt-4">
            {rotinaAtiva && proximoDiaSugerido && !alertaRotina?.mensagem.includes("expirou") ? (<><Button size="lg" className="w-full font-bold text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" onClick={() => navigate(`/aluno/ficha/${rotinaAtiva._id}?diaId=${proximoDiaSugerido._id}`)}><PlayCircle className="w-5 h-5 mr-2" /> Iniciar Treino do Dia</Button><Button variant="link" className="text-sm text-gray-600 hover:text-indigo-600 h-auto" onClick={() => navigate(`/aluno/ficha/${rotinaAtiva._id}`)}><Replace className="w-4 h-4 mr-2" /> Escolher outro treino</Button></>) : (<Button size="lg" className="w-full font-bold text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md" onClick={() => navigate('/aluno/meus-treinos')}><BookOpenCheck className="w-5 h-5 mr-2" /> Ativar uma Rotina</Button>)}
          </CardFooter>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
            <CardHeader><div className="flex items-center gap-3"><Zap className="w-6 h-6 text-yellow-500" /><CardTitle className="text-xl font-bold">Sua Frequência Semanal</CardTitle></div></CardHeader>
            <CardContent><FrequenciaSemanal sessoesConcluidasNaSemana={dashboardData?.sessoesConcluidasNaSemana || []} isLoading={isLoading} /></CardContent>
            <CardFooter><Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900" onClick={() => navigate('/aluno/historico')}><History className="w-4 h-4 mr-2" /> Ver Histórico Completo</Button></CardFooter>
        </Card>
        
        <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
            <CardHeader><div className="flex items-center gap-3"><TrendingUp className="w-6 h-6 text-green-500" /><CardTitle className="text-xl font-bold">Seu Progresso</CardTitle></div></CardHeader>
            <CardContent><p>Em breve...</p></CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AlunoDashboardPage;