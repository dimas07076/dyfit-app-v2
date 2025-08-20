// client/src/pages/meu-plano.tsx
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient";
import { useThrottle } from "@/hooks/useDebounce";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    CalendarDays,
    Users,
    Crown,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    Zap,
    Briefcase,
    RocketIcon
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PersonalPlanStatus } from "../../../shared/types/planos";

export default function MeuPlano() {
  const { user } = useUser();
  const trainerId = user?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleUpgradeClick = useThrottle(() => {
    navigate("/solicitar-renovacao");
  }, 1000);

  const {
    data: planStatus,
    isLoading: isLoadingPlan,
    error: errorPlan
  } = useQuery<PersonalPlanStatus, Error>({
    queryKey: ["planStatus", trainerId],
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar status do plano.");
      return apiRequest<PersonalPlanStatus>("GET", "/api/personal/meu-plano");
    },
    enabled: !!trainerId,
    retry: (failureCount, error: any) => {
        if (error.message.includes("404")) {
            return false;
        }
        return failureCount < 2;
    },
  });

  // Query para buscar detalhes dos tokens
  const {
    data: tokensData,
    isLoading: isLoadingTokens,
    error: errorTokens
  } = useQuery<{ tokens: Array<{ id: string; quantidade: number; dataAdicao: string; dataVencimento: string; ativo: boolean }> }, Error>({
    queryKey: ["detailedTokens", trainerId],
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar tokens.");
      return apiRequest<{ tokens: Array<{ id: string; quantidade: number; dataAdicao: string; dataVencimento: string; ativo: boolean }> }>("GET", "/api/personal/meus-tokens");
    },
    enabled: !!trainerId && !!planStatus,
    retry: 2,
  });

  useEffect(() => {
    if (errorPlan && errorPlan.message.includes("404")) {
      toast({
        title: "Bem-vindo(a)!",
        description: "Para começar, por favor, escolha ou ative um plano.",
      });
      navigate("/solicitar-renovacao", { replace: true });
    }
  }, [errorPlan, navigate, toast]);


  if (!user) {
    return <div className="bg-blue-50 dark:bg-slate-900 h-full"><LoadingSpinner text="Carregando dados do usuário..." /></div>;
  }

  if (isLoadingPlan) {
    return (
      <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <RocketIcon className="w-12 h-12 text-sky-500 animate-pulse mx-auto mb-4" />
            <LoadingSpinner text="Carregando informações do seu plano..." />
          </div>
        </div>
      </div>
    );
  }

  if (errorPlan && !errorPlan.message.includes("404")) {
    return (
      <ErrorBoundary>
        <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <ErrorMessage title="Erro ao Carregar Status do Plano" message={errorPlan.message} />
        </div>
      </ErrorBoundary>
    );
  }

  if (!planStatus) {
    return <LoadingSpinner text="Verificando seu plano..." />;
  }

  const {
    plano,
    personalPlano,
    limiteAtual,
    alunosAtivos,
    tokensAvulsos,
    percentualUso = 0,
    podeAtivarMais = false
  } = planStatus;

  // Derivações seguras conforme especificação
  const alunosAtivosCalc = alunosAtivos ?? 0;
  const limitePlano = plano?.limiteAlunos ?? limiteAtual ?? 0;
  const tokens = tokensAvulsos ?? 0;

  const capacidadeTotal = Math.max(0, limitePlano) + Math.max(0, tokens);
  
  // Uso de tokens
  const tokensUsados = Math.min(Math.max(0, alunosAtivosCalc - limitePlano), Math.max(0, tokens));
  const tokensRestantes = Math.max(0, tokens - tokensUsados);
  
  // Slots restantes
  const slotsPlanoRestantes = Math.max(0, limitePlano - alunosAtivosCalc);
  const slotsTotaisRestantes = slotsPlanoRestantes + tokensRestantes;

  // Progresso: ocupação sobre a capacidade total potencial
  const progresso = capacidadeTotal > 0
    ? Math.min(100, Math.round((alunosAtivosCalc / capacidadeTotal) * 100))
    : 0;

  const displayPercentualUso = percentualUso ?? 0;

  const getStatusInfo = () => {
    // Nova regra de estado conforme especificação
    if (alunosAtivosCalc > capacidadeTotal) {
      return {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        text: 'Extrapolado',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    if (alunosAtivosCalc > limitePlano && tokens > 0) {
      return {
        variant: 'default' as const,
        icon: Zap,
        text: 'Usando Tokens',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      };
    }
    return {
      variant: 'secondary' as const,
      icon: CheckCircle,
      text: 'Dentro do Limite',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getDaysUntilExpiration = () => {
    if (!personalPlano?.dataVencimento) return null;
    const today = new Date();
    const expiration = new Date(personalPlano.dataVencimento);
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 bg-gradient-to-r from-sky-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-sky-600" />
              Meu Plano
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Gerencie e acompanhe o status do seu plano de assinatura
            </p>
          </div>
        </header>

        <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2 mb-6 shadow-md`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-sky-600" />
                <CardTitle className="text-lg">Status do Plano</CardTitle>
              </div>
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <StatusIcon className="w-3 h-3" />
                {statusInfo.text}
              </Badge>
            </div>
            {plano && (
              <p className="text-gray-600 dark:text-gray-400">
                Plano <span className="font-semibold">{plano.nome}</span> ativo
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                  <Users className="w-6 h-6 text-sky-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Alunos Ativos</p>
                <p className="text-2xl font-bold text-gray-800">{alunosAtivosCalc}</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Limite</p>
                <p className="text-2xl font-bold text-gray-800">{limitePlano}</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Disponível</p>
                <p className="text-2xl font-bold text-gray-800">{slotsTotaisRestantes}</p>
              </div>

              {tokens > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                    <Zap className="w-6 h-6 text-amber-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Tokens</p>
                  <p className="text-2xl font-bold text-gray-800">{tokens}</p>
                </div>
              )}
            </div>

            <div className="bg-white/70 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Utilização do Plano</span>
                <span className="text-sm text-gray-600">{progresso}%</span>
              </div>
              <Progress 
                value={progresso} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{alunosAtivosCalc} usados</span>
                <span>{capacidadeTotal} total</span>
              </div>
            </div>

            {/* Seção de métricas detalhadas conforme especificação */}
            <div className="bg-white/50 p-4 rounded-xl space-y-3">
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Alunos ativos:</span>
                  <span className="font-semibold text-gray-800">{alunosAtivosCalc}</span>
                </div>
              </div>
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Limite do plano:</span>
                  <span className="font-semibold text-gray-800">{limitePlano}</span>
                </div>
              </div>
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tokens avulsos disponíveis:</span>
                  <span className="font-semibold text-gray-800">{tokens}</span>
                </div>
              </div>
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Capacidade total potencial:</span>
                  <span className="font-semibold text-sky-600">{capacidadeTotal}</span>
                </div>
              </div>
              {tokensUsados > 0 && (
                <div className="text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Usando tokens:</span>
                    <span className="font-semibold text-amber-600">{tokensUsados}</span>
                  </div>
                </div>
              )}
              {tokens > 0 && (
                <div className="text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tokens restantes:</span>
                    <span className="font-semibold text-gray-800">{tokensRestantes}</span>
                  </div>
                </div>
              )}
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Slots restantes (total):</span>
                  <span className="font-semibold text-green-600">{slotsTotaisRestantes}</span>
                </div>
              </div>
              
              {/* Texto explicativo quando tokens > 0 */}
              {tokens > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    Tokens avulsos ampliam temporariamente sua capacidade de alunos. Cada token cobre 1 aluno por até 30 dias.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {plano && personalPlano && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="bg-white shadow-md border border-zinc-100">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <RocketIcon className="w-5 h-5 text-sky-500" />
                  Informações do Plano
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600">Nome do Plano:</span>
                  <p className="font-semibold text-gray-800">{plano.nome}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Valor:</span>
                  <p className="font-semibold text-gray-800">
                    {plano.preco === 0 ? 'Gratuito' : `R$ ${plano.preco.toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Descrição:</span>
                  <p className="text-gray-700 text-sm">{plano.descricao || 'Sem descrição disponível'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-md border border-zinc-100">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-amber-500" />
                  Datas Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600">Data de Início:</span>
                  <p className="font-semibold text-gray-800">{formatDate(personalPlano.dataInicio)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Data de Vencimento:</span>
                  <p className="font-semibold text-gray-800">
                    {formatDate(personalPlano.dataVencimento)}
                    {daysUntilExpiration !== null && (
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                        daysUntilExpiration <= 7 ? 'bg-red-100 text-red-600' : 
                        daysUntilExpiration <= 30 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {daysUntilExpiration > 0 ? `${daysUntilExpiration} dias restantes` : 'Vencido'}
                      </span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Card de Tokens Avulsos Detalhados */}
        {planStatus && (
          <Card className="bg-white shadow-md border border-amber-200 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Meus Tokens Avulsos
              </CardTitle>
              <p className="text-sm text-gray-600">
                Histórico completo dos seus tokens para ampliação de capacidade
              </p>
            </CardHeader>
            <CardContent>
              {tokensData && tokensData.tokens && tokensData.tokens.length > 0 ? (
                <div className="space-y-4">
                  {tokensData.tokens.map((token, index) => {
                  const dataVencimento = new Date(token.dataVencimento);
                  const dataAdicao = new Date(token.dataAdicao);
                  const hoje = new Date();
                  const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                  
                  // Determinar status real do token baseado em múltiplos fatores
                  const isTokenVencido = diasRestantes <= 0;
                  const isTokenInativo = !token.ativo;
                  
                  // <<< INÍCIO DA CORREÇÃO >>>
                  // A lógica para determinar se um token está em uso é aprimorada.
                  // Agora, consideramos TODOS os tokens não expirados para determinar a ordem de uso,
                  // e não apenas aqueles com `ativo: true`.
                  let isTokenUsado = false;
                  if (!isTokenVencido) {
                    // 1. Pega todos os tokens que ainda não venceram.
                    const tokensNaoExpirados = tokensData.tokens
                      .filter(t => new Date(t.dataVencimento) > hoje)
                      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
                    
                    // 2. Encontra a posição do token atual nesta lista ordenada.
                    const indexNaOrdemDeUso = tokensNaoExpirados.findIndex(t => t.id === token.id);

                    // 3. Se a posição do token for menor que o número de tokens que estão sendo usados, ele está "Em Uso".
                    if (indexNaOrdemDeUso !== -1 && indexNaOrdemDeUso < tokensUsados) {
                        isTokenUsado = true;
                    }
                  }
                  // <<< FIM DA CORREÇÃO >>>
                  
                  let statusToken, statusColor, statusBg;
                  if (isTokenVencido) {
                    statusToken = "Vencido";
                    statusColor = "text-red-600";
                    statusBg = "bg-red-50 border-red-200";
                  } else if (isTokenInativo) {
                    statusToken = "Consumido";
                    statusColor = "text-gray-600";
                    statusBg = "bg-gray-50 border-gray-200";
                  } else if (isTokenUsado) {
                    statusToken = "Em Uso";
                    statusColor = "text-amber-600";
                    statusBg = "bg-amber-50 border-amber-200";
                  } else {
                    statusToken = "Disponível";
                    statusColor = "text-green-600";
                    statusBg = "bg-green-50 border-green-200";
                  }
                  
                  return (
                    <div 
                      key={token.id} 
                      className={`${statusBg} border rounded-lg p-4 space-y-3`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className={`w-4 h-4 ${
                            isTokenVencido ? 'text-red-600' : 
                            isTokenInativo ? 'text-gray-600' :
                            isTokenUsado ? 'text-amber-600' : 'text-green-600'
                          }`} />
                          <span className="font-semibold text-gray-800">Token #{index + 1}</span>
                          <Badge 
                            variant={
                              isTokenVencido ? "destructive" : 
                              isTokenInativo ? "secondary" :
                              isTokenUsado ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {statusToken}
                          </Badge>
                        </div>
                        <Badge 
                          variant={diasRestantes <= 7 ? "destructive" : diasRestantes <= 15 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {diasRestantes > 0 ? `${diasRestantes} dias restantes` : 'Vencido'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">ID do Token:</span>
                          <p className="font-mono text-xs text-gray-800 bg-white px-2 py-1 rounded border mt-1">
                            {token.id}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Quantidade:</span>
                          <p className="font-semibold text-gray-800">{token.quantidade} slot{token.quantidade !== 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Adicionado em:</span>
                          <p className="font-semibold text-gray-800">{dataAdicao.toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Válido até:</span>
                          <p className="font-semibold text-gray-800">{dataVencimento.toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Status de Uso:</span>
                          <p className={`font-semibold ${statusColor}`}>
                            {statusToken}
                          </p>
                        </div>
                      </div>
                      
                      {/* Informação contextual sobre o uso do token */}
                      <div className="border-t pt-3">
                        {isTokenVencido ? (
                          <span className="text-xs text-red-600">
                            ⚠️ Token vencido e não pode mais ser utilizado
                          </span>
                        ) : isTokenInativo ? (
                          <span className="text-xs text-gray-600">
                            📋 Token consumido permanentemente 
                          </span>
                        ) : isTokenUsado ? (
                          <span className="text-xs text-amber-700">
                            🔋 Token sendo usado para ampliar capacidade (aluno #{limitePlano + Math.floor(index / 1) + 1})
                          </span>
                        ) : (
                          <span className="text-xs text-green-700">
                            💡 Token disponível para uso quando necessário
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : !isLoadingTokens && !errorTokens ? (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">
                    Nenhum token avulso encontrado
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Tokens aparecerão aqui quando adicionados pelo administrador
                  </p>
                </div>
              ) : null}
              
              {isLoadingTokens && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                    Carregando detalhes dos tokens...
                  </div>
                </div>
              )}
              
              {errorTokens && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-600">
                    Erro ao carregar detalhes dos tokens. Tente recarregar a página.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4 mb-6">
          {!podeAtivarMais && (
            <Button 
              onClick={handleUpgradeClick}
              className="flex-1 py-6"
              variant={displayPercentualUso >= 90 ? "destructive" : "default"}
              size="lg"
            >
              <RocketIcon className="w-4 h-4 mr-2" />
              {displayPercentualUso >= 90 ? 'Upgrade Urgente' : 'Fazer Upgrade'}
            </Button>
          )}
          
          {!plano && (
            <Button onClick={handleUpgradeClick} className="flex-1 py-6" size="lg">
              <Crown className="w-4 h-4 mr-2" />
              Ativar Plano
            </Button>
          )}
        </div>

        {daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0 && (
          <Card className="bg-yellow-50 border-yellow-200 border-2 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  Seu plano vence em {daysUntilExpiration} dia{daysUntilExpiration !== 1 ? 's' : ''}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {!podeAtivarMais && alunosAtivosCalc >= capacidadeTotal && (
          <Card className="bg-red-50 border-red-200 border-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  Capacidade total atingida. Faça upgrade para adicionar mais alunos.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
}