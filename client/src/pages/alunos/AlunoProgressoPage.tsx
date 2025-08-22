// client/src/pages/alunos/AlunoProgressoPage.tsx
import React, { useMemo } from 'react';
import { useAluno } from '../../context/AlunoContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useLocation } from 'wouter';
import { 
  ArrowLeft, 
  TrendingUp, 
  Calendar, 
  Dumbbell, 
  Zap, 
  Award,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';

// Assumed interfaces based on problem statement
interface SessionData {
  id: string;
  data: string; // date
  exercicios: Array<{
    nome: string;
    series: Array<{
      reps: number;
      carga?: number;
    }>;
  }>;
  intensidade?: 'leve' | 'moderado' | 'intenso';
}

interface TreinoData {
  id: string;
  nome: string;
  data: string;
  concluido: boolean;
}

// Mock hooks (will be replaced with actual implementations if they exist)
const useAlunoSessoes = () => {
  console.debug('[AlunoProgressoPage] Mock useAlunoSessoes hook called');
  return {
    data: [] as SessionData[],
    isLoading: false,
    error: null
  };
};

const useAlunoTreinos = () => {
  console.debug('[AlunoProgressoPage] Mock useAlunoTreinos hook called');
  return {
    data: [] as TreinoData[],
    isLoading: false,
    error: null
  };
};

const AlunoProgressoPage: React.FC = () => {
  const { aluno } = useAluno();
  const [, navigate] = useLocation();
  
  // Data fetching hooks (using mocks for now)
  const { data: sessoes = [], isLoading: isLoadingSessoes } = useAlunoSessoes();
  const { data: treinos = [], isLoading: isLoadingTreinos } = useAlunoTreinos();

  console.debug('[AlunoProgressoPage] Sessoes data:', sessoes);
  console.debug('[AlunoProgressoPage] Treinos data:', treinos);

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    console.debug('[AlunoProgressoPage] Calculating progress metrics');
    
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    // Filter recent sessions
    const recentSessions = sessoes.filter(sessao => {
      const sessionDate = new Date(sessao.data);
      return sessionDate >= last30Days;
    });

    console.debug('[AlunoProgressoPage] Recent sessions:', recentSessions.length);

    // Check if we have enough data (minimum 3 sessions)
    const hasEnoughData = recentSessions.length >= 3;

    if (!hasEnoughData) {
      return {
        hasEnoughData: false,
        adesao: 0,
        streak: 0,
        volume: 0,
        intensidadeMedia: 0,
        totalPRs: 0,
        topExercicios: [],
        volumeSemanal: [],
        distribuicaoIntensidade: { leve: 0, moderado: 0, intenso: 0 },
        calendarioHeatmap: {}
      };
    }

    // Calculate metrics
    const totalTreinos = treinos.filter(t => {
      const treinoDate = new Date(t.data);
      return treinoDate >= last30Days;
    }).length;
    
    const treinosConcluidos = treinos.filter(t => {
      const treinoDate = new Date(t.data);
      return treinoDate >= last30Days && t.concluido;
    }).length;

    const adesao = totalTreinos > 0 ? Math.round((treinosConcluidos / totalTreinos) * 100) : 0;

    // Calculate streak (consecutive training days)
    const streak = calculateStreak(sessoes);

    // Calculate volume (total load x reps)
    const volume = calculateVolume(recentSessions);

    // Calculate average intensity
    const intensidadeMedia = calculateIntensidadeMedia(recentSessions);

    // Calculate PRs (personal records)
    const totalPRs = calculatePRs(sessoes);

    // Get top 3 exercises
    const topExercicios = getTopExercicios(recentSessions);

    // Get weekly volume data
    const volumeSemanal = getVolumeSemanal(sessoes);

    // Get intensity distribution
    const distribuicaoIntensidade = getDistribuicaoIntensidade(recentSessions);

    // Get calendar heatmap data
    const calendarioHeatmap = getCalendarioHeatmap(sessoes);

    return {
      hasEnoughData: true,
      adesao,
      streak,
      volume,
      intensidadeMedia,
      totalPRs,
      topExercicios,
      volumeSemanal,
      distribuicaoIntensidade,
      calendarioHeatmap
    };
  }, [sessoes, treinos]);

  const isLoading = isLoadingSessoes || isLoadingTreinos;

  if (!aluno) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-400 p-4 text-white">
        <div className="container mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Acesso negado</h1>
            <p className="text-lg mt-1 opacity-90">
              Você precisa estar logado como aluno para acessar esta página.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-400 p-4 text-white">
        <div className="container mx-auto">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/aluno/dashboard')}
              className="text-white hover:bg-white/20 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Carregando seu progresso...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-400 p-4 text-white">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/aluno/dashboard')}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Seu Progresso</h1>
          <p className="text-lg mt-1 opacity-90">
            Acompanhe sua evolução nos últimos 30 dias
          </p>
        </div>

        {!progressMetrics.hasEnoughData ? (
          // Empty State
          <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Dados insuficientes
                </h3>
                <p className="text-gray-600 mb-6">
                  Você precisa ter pelo menos 3 treinos nos últimos 30 dias para visualizar seu progresso detalhado.
                </p>
                <Button 
                  onClick={() => navigate('/aluno/dashboard')}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Começar a Treinar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <KPICard
                title="Adesão"
                value={`${progressMetrics.adesao}%`}
                icon={<BarChart3 className="w-5 h-5" />}
                color="text-green-500"
              />
              <KPICard
                title="Streak"
                value={`${progressMetrics.streak} dias`}
                icon={<Calendar className="w-5 h-5" />}
                color="text-blue-500"
              />
              <KPICard
                title="Volume"
                value={`${Math.round(progressMetrics.volume / 1000)}k kg`}
                icon={<Dumbbell className="w-5 h-5" />}
                color="text-purple-500"
              />
              <KPICard
                title="Intensidade"
                value={progressMetrics.intensidadeMedia.toFixed(1)}
                icon={<Zap className="w-5 h-5" />}
                color="text-yellow-500"
              />
              <KPICard
                title="PRs"
                value={progressMetrics.totalPRs}
                icon={<Award className="w-5 h-5" />}
                color="text-red-500"
              />
            </div>

            {/* Charts Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top 3 Exercícios */}
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Top 3 Exercícios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {progressMetrics.topExercicios.length > 0 ? (
                      progressMetrics.topExercicios.map((exercicio, index) => (
                        <ExercicioProgressCard key={exercicio.nome} exercicio={exercicio} rank={index + 1} />
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        Nenhum exercício encontrado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Volume Semanal */}
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Volume Semanal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VolumeSemanalChart data={progressMetrics.volumeSemanal} />
                </CardContent>
              </Card>

              {/* Distribuição de Intensidade */}
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-500" />
                    Distribuição de Intensidade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <IntensidadeChart data={progressMetrics.distribuicaoIntensidade} />
                </CardContent>
              </Card>

              {/* Calendário Heatmap */}
              <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-2xl shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    Calendário de Treinos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CalendarioHeatmap data={progressMetrics.calendarioHeatmap} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-xl shadow-lg border-0">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ExercicioProgressCard: React.FC<{
  exercicio: {
    nome: string;
    estimativa1RM: number;
    progressoPercentual: number;
    isPR: boolean;
  };
  rank: number;
}> = ({ exercicio, rank }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-3">
      <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center text-xs">
        {rank}
      </Badge>
      <div>
        <p className="font-medium">{exercicio.nome}</p>
        <p className="text-sm text-gray-600">
          Est. 1RM: {exercicio.estimativa1RM}kg
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm text-green-600 font-medium">
        +{exercicio.progressoPercentual}%
      </p>
      {exercicio.isPR && (
        <Badge variant="destructive" className="text-xs">PR</Badge>
      )}
    </div>
  </div>
);

const VolumeSemanalChart: React.FC<{ data: Array<{ volume: number; week: number }> }> = ({ data }) => (
  <div className="space-y-2">
    <p className="text-sm text-gray-600">Últimas 8 semanas</p>
    <div className="flex items-end gap-2 h-32">
      {data.map((week, index) => (
        <div key={index} className="flex-1 flex flex-col items-center">
          <div 
            className="w-full bg-blue-500 rounded-t-sm min-h-1"
            style={{ height: `${Math.max((week.volume / Math.max(...data.map(d => d.volume))) * 100, 5)}%` }}
          />
          <p className="text-xs text-gray-500 mt-1">S{index + 1}</p>
        </div>
      ))}
    </div>
  </div>
);

const IntensidadeChart: React.FC<{ data: { leve: number; moderado: number; intenso: number } }> = ({ data }) => (
  <div className="space-y-3">
    {Object.entries(data).map(([intensidade, count]) => (
      <div key={intensidade} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            intensidade === 'leve' ? 'bg-green-500' :
            intensidade === 'moderado' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="capitalize">{intensidade}</span>
        </div>
        <span className="font-medium">{count}</span>
      </div>
    ))}
  </div>
);

const CalendarioHeatmap: React.FC<{ data: { [key: string]: number } }> = ({ data }) => {
  const currentMonth = new Date();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const days = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const trainingCount = data[dateStr] || 0;
    const intensity = trainingCount === 0 ? 'bg-gray-100' :
                     trainingCount === 1 ? 'bg-blue-200' :
                     trainingCount === 2 ? 'bg-blue-400' : 'bg-blue-600';
    
    days.push(
      <div
        key={day}
        className={`w-8 h-8 rounded-sm ${intensity} flex items-center justify-center text-xs`}
        title={`${day}: ${trainingCount} treino(s)`}
      >
        {day}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-7 gap-1">
      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
        <div key={day} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500">
          {day}
        </div>
      ))}
      {days}
    </div>
  );
};

// Helper calculation functions (placeholders for now)
function calculateStreak(_sessoes: SessionData[]): number {
  console.debug('[AlunoProgressoPage] Calculating streak');
  // TODO: Implement streak calculation
  return 0;
}

function calculateVolume(sessoes: SessionData[]): number {
  console.debug('[AlunoProgressoPage] Calculating volume');
  return sessoes.reduce((total, sessao) => {
    const sessionVolume = sessao.exercicios.reduce((exercicioTotal, exercicio) => {
      return exercicioTotal + exercicio.series.reduce((serieTotal, serie) => {
        return serieTotal + (serie.carga || 0) * serie.reps;
      }, 0);
    }, 0);
    return total + sessionVolume;
  }, 0);
}

function calculateIntensidadeMedia(sessoes: SessionData[]): number {
  console.debug('[AlunoProgressoPage] Calculating intensity average');
  if (sessoes.length === 0) return 0;
  
  const intensidadeMap = { leve: 1, moderado: 2, intenso: 3 };
  const total = sessoes.reduce((sum, sessao) => {
    return sum + (intensidadeMap[sessao.intensidade || 'leve'] || 1);
  }, 0);
  
  return total / sessoes.length;
}

function calculatePRs(_sessoes: SessionData[]): number {
  console.debug('[AlunoProgressoPage] Calculating PRs');
  // TODO: Implement PR calculation
  return 0;
}

function getTopExercicios(_sessoes: SessionData[]): any[] {
  console.debug('[AlunoProgressoPage] Getting top exercises');
  // TODO: Implement top exercises calculation
  return [];
}

function getVolumeSemanal(sessoes: SessionData[]): any[] {
  console.debug('[AlunoProgressoPage] Getting weekly volume');
  // Create 8 weeks of data
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekSessions = sessoes.filter(sessao => {
      const sessionDate = new Date(sessao.data);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
    
    const weekVolume = calculateVolume(weekSessions);
    weeks.push({ volume: weekVolume, week: i });
  }
  
  return weeks;
}

function getDistribuicaoIntensidade(sessoes: SessionData[]): any {
  console.debug('[AlunoProgressoPage] Getting intensity distribution');
  const distribution = { leve: 0, moderado: 0, intenso: 0 };
  
  sessoes.forEach(sessao => {
    const intensidade = sessao.intensidade || 'leve';
    distribution[intensidade]++;
  });
  
  return distribution;
}

function getCalendarioHeatmap(sessoes: SessionData[]): any {
  console.debug('[AlunoProgressoPage] Getting calendar heatmap');
  const heatmap: { [key: string]: number } = {};
  
  sessoes.forEach(sessao => {
    const date = new Date(sessao.data);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
  });
  
  return heatmap;
}

export default AlunoProgressoPage;