// client/src/components/ui/dashboard/plano-status-card.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../card';
import { Badge } from '../badge';
import { Button } from '../button';
import { Progress } from '../progress';
import { 
    CalendarDays, 
    Users, 
    Crown, 
    AlertTriangle, 
    CheckCircle, 
    Clock,
    TrendingUp,
    Zap
} from 'lucide-react';
import { PersonalPlanStatus } from '../../../../../shared/types/planos';

interface PlanoStatusCardProps {
    planStatus: PersonalPlanStatus;
    onUpgradeClick?: () => void;
    showUpgradeButton?: boolean;
}

export function PlanoStatusCard({ 
    planStatus, 
    onUpgradeClick, 
    showUpgradeButton = false 
}: PlanoStatusCardProps) {
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

    const getStatusInfo = () => {
        if (percentualUso >= 90) {
            return {
                variant: 'destructive' as const,
                icon: AlertTriangle,
                text: 'Crítico',
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-200'
            };
        }
        if (percentualUso >= 70) {
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
        <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-lg">Status do Plano</CardTitle>
                    </div>
                    <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.text}
                    </Badge>
                </div>
                <CardDescription>
                    {plano ? `Plano ${plano.nome} ativo` : 'Nenhum plano ativo'}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Usage Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Alunos Ativos</p>
                        <p className="text-xl font-bold">{alunosAtivos}</p>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mx-auto mb-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Limite</p>
                        <p className="text-xl font-bold">{limiteAtual}</p>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mx-auto mb-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Disponível</p>
                        <p className="text-xl font-bold">{vagasDisponiveis}</p>
                    </div>

                    {tokensAvulsos > 0 && (
                        <div className="text-center">
                            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mx-auto mb-2">
                                <Zap className="w-5 h-5 text-orange-600" />
                            </div>
                            <p className="text-sm text-gray-600 mb-1">Tokens</p>
                            <p className="text-xl font-bold">{tokensAvulsos}</p>
                        </div>
                    )}
                </div>

                {/* Usage Progress */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Utilização do Plano</span>
                        <span className="text-sm text-gray-600">{percentualUso}%</span>
                    </div>
                    <Progress 
                        value={percentualUso} 
                        className="h-3"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{alunosAtivos} usados</span>
                        <span>{limiteAtual} total</span>
                    </div>
                </div>

                {/* Plan Details */}
                {plano && personalPlano && (
                    <div className="bg-white/50 p-4 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Plano:</span>
                                <p className="font-medium">{plano.nome}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Valor:</span>
                                <p className="font-medium">
                                    {plano.preco === 0 ? 'Gratuito' : `R$ ${plano.preco.toFixed(2)}`}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-600">Início:</span>
                                <p className="font-medium">{formatDate(personalPlano.dataInicio)}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Vencimento:</span>
                                <p className="font-medium">
                                    {formatDate(personalPlano.dataVencimento)}
                                    {daysUntilExpiration !== null && (
                                        <span className={`ml-1 text-xs ${
                                            daysUntilExpiration <= 7 ? 'text-red-600' : 
                                            daysUntilExpiration <= 30 ? 'text-yellow-600' : 'text-gray-500'
                                        }`}>
                                            ({daysUntilExpiration > 0 ? `${daysUntilExpiration} dias` : 'Vencido'})
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {showUpgradeButton && (
                    <div className="flex gap-2">
                        {!podeAtivarMais && (
                            <Button 
                                onClick={onUpgradeClick}
                                className="flex-1"
                                variant={percentualUso >= 90 ? "destructive" : "default"}
                            >
                                {percentualUso >= 90 ? 'Upgrade Urgente' : 'Fazer Upgrade'}
                            </Button>
                        )}
                        
                        {!plano && (
                            <Button onClick={onUpgradeClick} className="flex-1">
                                Ativar Plano
                            </Button>
                        )}
                    </div>
                )}

                {/* Warnings */}
                {daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-yellow-800">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                Seu plano vence em {daysUntilExpiration} dia{daysUntilExpiration !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}

                {!podeAtivarMais && limiteAtual > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                                Limite de alunos atingido. Faça upgrade para adicionar mais alunos.
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}