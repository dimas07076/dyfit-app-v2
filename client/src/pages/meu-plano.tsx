// client/src/pages/meu-plano.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/queryClient"; 
import { useThrottle } from "@/hooks/useDebounce";

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
    Clock,
    TrendingUp,
    Zap,
    Briefcase,
    RocketIcon,
    XCircle,
    Info
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner"; 
import ErrorMessage from "@/components/ErrorMessage"; 
import ErrorBoundary from "@/components/ErrorBoundary"; 
import { PersonalPlanStatus } from "../../../shared/types/planos";

interface TokenDetails {
  activeTokens: Array<{
    _id: string;
    quantidade: number;
    dataVencimento: Date;
    adicionadoPorAdmin?: { nome: string };
  }>;
  expiredTokens: Array<{
    _id: string;
    quantidade: number;
    dataVencimento: Date;
    adicionadoPorAdmin?: { nome: string };
  }>;
  totalActiveQuantity: number;
}

export default function MeuPlano() {
  const { user } = useUser();
  const trainerId = user?.id;

  // Throttled upgrade handler to prevent multiple rapid clicks
  const handleUpgradeClick = useThrottle(() => {
    console.log('Upgrade clicked');
    // TODO: Navigate to upgrade page or show modal
    // Example: setLocationWouter("/upgrade") or openUpgradeModal()
  }, 1000);

  // Query for plan status
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
  });

  // Query for detailed token information
  const { 
    data: tokenDetails, 
    isLoading: isLoadingTokens,
    error: errorTokens 
  } = useQuery<TokenDetails, Error>({
    queryKey: ["tokenDetails", trainerId], 
    queryFn: async () => {
      if (!trainerId) throw new Error("Trainer ID não encontrado para buscar tokens.");
      return apiRequest<TokenDetails>("GET", "/api/personal/tokens-detalhados");
    },
    enabled: !!trainerId, 
  });

  if (!user) {
    return <div className="bg-blue-50 dark:bg-slate-900 h-full"><LoadingSpinner text="Carregando dados do usuário..." /></div>;
  }

  if (isLoadingPlan || isLoadingTokens) {
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

  if (errorPlan) {
    return (
      <ErrorBoundary>
        <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <ErrorMessage title="Erro ao Carregar Status do Plano" message={errorPlan.message} />
        </div>
      </ErrorBoundary>
    );
  }

  if (!planStatus) {
    return (
      <ErrorBoundary>
        <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <ErrorMessage title="Plano não encontrado" message="Não foi possível carregar as informações do seu plano." />
        </div>
      </ErrorBoundary>
    );
  }

  const {
    plano,
    personalPlano,
    limiteAtual,
    alunosAtivos,
    tokensAvulsos,
    percentualUso = 0,
    podeAtivarMais = false,
    vagasDisponiveis = 0
  } = planStatus;

  // Ensure percentualUso displays properly - show 0% when null/undefined
  const displayPercentualUso = percentualUso ?? 0;

  const getStatusInfo = () => {
    if (displayPercentualUso >= 90) {
      return {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        text: 'Crítico',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }
    if (displayPercentualUso >= 70) {
      return {
        variant: 'default' as const,
        icon: Clock,
        text: 'Atenção',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }
    return {
      variant: 'secondary' as const,
      icon: CheckCircle,
      text: 'Normal',
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

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString('pt-BR');
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

  // Check if there's no active plan
  const hasNoPlan = !plano || (personalPlano && new Date(personalPlano.dataVencimento) < new Date());
  const hasActiveTokens = tokenDetails && tokenDetails.totalActiveQuantity > 0;

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-sky-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Header */}
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

        {/* Main Plan Card */}
        {hasNoPlan && !hasActiveTokens ? (
          // No Plan Scenario
          <Card className="bg-red-50 border-red-200 border-2 mb-6 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-lg">Status do Plano</CardTitle>
                </div>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Sem Plano
                </Badge>
              </div>
              <p className="text-red-700">
                Você não possui um plano ativo no momento
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="bg-white/70 p-6 rounded-xl text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Nenhum Plano Ativo
                </h3>
                <p className="text-red-700 mb-4">
                  Você não possui um plano ativo no momento. Procure a equipe DyFit para regularização.
                </p>
                <Button onClick={handleUpgradeClick} className="bg-red-600 hover:bg-red-700">
                  <Crown className="w-4 h-4 mr-2" />
                  Entrar em Contato
                </Button>
              </div>

              {/* Current Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                    <Users className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Alunos Ativos</p>
                  <p className="text-2xl font-bold text-gray-800">{alunosAtivos}</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Limite</p>
                  <p className="text-2xl font-bold text-gray-800">0</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                    <XCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Disponível</p>
                  <p className="text-2xl font-bold text-gray-800">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Active Plan or Tokens
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
              {plano ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Plano <span className="font-semibold">{plano.nome}</span> ativo
                </p>
              ) : hasActiveTokens ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Funcionando apenas com <span className="font-semibold">tokens avulsos</span>
                </p>
              ) : null}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Usage Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                    <Users className="w-6 h-6 text-sky-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Alunos Ativos</p>
                  <p className="text-2xl font-bold text-gray-800">{alunosAtivos}</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Limite</p>
                  <p className="text-2xl font-bold text-gray-800">{limiteAtual}</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Disponível</p>
                  <p className="text-2xl font-bold text-gray-800">{vagasDisponiveis}</p>
                </div>

                {tokensAvulsos > 0 && (
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 bg-white shadow-md rounded-xl mx-auto mb-3">
                      <Zap className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Tokens</p>
                    <p className="text-2xl font-bold text-gray-800">{tokensAvulsos}</p>
                  </div>
                )}
              </div>

              {/* Usage Progress */}
              <div className="bg-white/70 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">Utilização do Plano</span>
                  <span className="text-sm text-gray-600">{displayPercentualUso}%</span>
                </div>
                <Progress 
                  value={displayPercentualUso} 
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{alunosAtivos} usados</span>
                  <span>{limiteAtual} total</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Details Cards */}
        {plano && personalPlano && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Plan Information Card */}
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

            {/* Dates Card */}
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

        {/* Detailed Tokens Information */}
        {tokenDetails && (tokenDetails.totalActiveQuantity > 0 || tokenDetails.expiredTokens.length > 0) && (
          <Card className="bg-white shadow-md border border-zinc-100 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Tokens Avulsos
                {tokenDetails.totalActiveQuantity > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {tokenDetails.totalActiveQuantity} ativos
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Gerencie seus tokens avulsos para capacidade adicional de alunos
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active Tokens */}
              {tokenDetails.activeTokens.length > 0 ? (
                <div>
                  <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Tokens Ativos ({tokenDetails.activeTokens.length})
                  </h4>
                  <div className="space-y-2">
                    {tokenDetails.activeTokens.map((token) => (
                      <div key={token._id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                            <Zap className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-green-800">
                              {token.quantidade} {token.quantidade === 1 ? 'token' : 'tokens'}
                            </p>
                            {token.adicionadoPorAdmin && (
                              <p className="text-xs text-green-600">
                                Por: {token.adicionadoPorAdmin.nome}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-700">Vence em:</p>
                          <p className="font-medium text-green-800">
                            {formatDate(token.dataVencimento)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : hasActiveTokens && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">Você possui {tokensAvulsos} tokens ativos mas os detalhes não puderam ser carregados.</span>
                  </div>
                </div>
              )}

              {/* Expired Tokens (Recent) */}
              {tokenDetails.expiredTokens.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Tokens Recentemente Expirados ({tokenDetails.expiredTokens.length})
                  </h4>
                  <div className="space-y-2">
                    {tokenDetails.expiredTokens.slice(0, 3).map((token) => (
                      <div key={token._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                            <XCircle className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">
                              {token.quantidade} {token.quantidade === 1 ? 'token' : 'tokens'}
                            </p>
                            {token.adicionadoPorAdmin && (
                              <p className="text-xs text-gray-500">
                                Por: {token.adicionadoPorAdmin.nome}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Expirou em:</p>
                          <p className="font-medium text-gray-600">
                            {formatDate(token.dataVencimento)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {tokenDetails.expiredTokens.length > 3 && (
                      <p className="text-xs text-gray-500 text-center mt-2">
                        E mais {tokenDetails.expiredTokens.length - 3} token(s) expirado(s)...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* No Tokens Message */}
              {tokenDetails.activeTokens.length === 0 && tokenDetails.expiredTokens.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <Zap className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Nenhum token encontrado</p>
                  <p className="text-sm text-gray-500">Tokens avulsos aumentam temporariamente sua capacidade de alunos</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          {hasNoPlan && !hasActiveTokens ? (
            <Button onClick={handleUpgradeClick} className="flex-1 py-6" size="lg" variant="destructive">
              <Crown className="w-4 h-4 mr-2" />
              Ativar Plano
            </Button>
          ) : (
            <>
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
              
              {!plano && hasActiveTokens && (
                <Button onClick={handleUpgradeClick} className="flex-1 py-6" size="lg">
                  <Crown className="w-4 h-4 mr-2" />
                  Ativar Plano
                </Button>
              )}
            </>
          )}
        </div>

        {/* Warnings */}
        {hasNoPlan && !hasActiveTokens && (
          <Card className="bg-red-50 border-red-200 border-2 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-800">
                <XCircle className="w-5 h-5" />
                <div>
                  <span className="font-medium block">
                    Plano Inativo
                  </span>
                  <span className="text-sm">
                    Você não possui um plano ativo no momento. Procure a equipe DyFit para regularização.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {errorTokens && (
          <Card className="bg-yellow-50 border-yellow-200 border-2 mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-yellow-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  Não foi possível carregar informações detalhadas dos tokens
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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

        {!podeAtivarMais && limiteAtual > 0 && (
          <Card className="bg-red-50 border-red-200 border-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  Limite de alunos atingido. Faça upgrade para adicionar mais alunos.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
}