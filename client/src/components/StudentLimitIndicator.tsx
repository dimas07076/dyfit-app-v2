// client/src/components/StudentLimitIndicator.tsx
import React from 'react';
import { AlertTriangle, Users, Zap, Info, CheckCircle, Crown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import useStudentLimit from '../hooks/useStudentLimit';

interface StudentLimitIndicatorProps {
    variant?: 'compact' | 'detailed' | 'minimal';
    showProgress?: boolean;
    showRecommendations?: boolean;
    className?: string;
}

export const StudentLimitIndicator: React.FC<StudentLimitIndicatorProps> = ({
    variant = 'compact',
    showProgress = true,
    showRecommendations = false,
    className = '',
}) => {
    try {
        console.log('🔧 [StudentLimitIndicator] Rendering component, variant:', variant);
        
        let hookResult;
        try {
            hookResult = useStudentLimit();
            console.log('🔧 [StudentLimitIndicator] Hook result:', {
                hasTokenStatus: !!hookResult.tokenStatus,
                hasLegacyStatus: !!hookResult.status,
                isLoading: hookResult.loading,
                availableSlots: hookResult.availableSlots,
                canActivate: hookResult.canActivateStudent
            });
        } catch (hookError) {
            console.error('🚨 [StudentLimitIndicator] Hook failed:', hookError);
            return (
                <div className={`p-2 text-sm text-gray-600 ${className}`}>
                    <span>Status do limite: Carregando...</span>
                </div>
            );
        }

        const { 
            tokenStatus,
            status,
            loading,
            isError,
            error,
            availableSlots,
            isAtLimit,
            isCloseToLimit,
            refreshStatus,
            getStatusMessage,
            getRecommendations
        } = hookResult;

        // Loading state
        if (loading) {
            return (
                <div className={`animate-pulse ${className}`}>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
            );
        }

        if (isError && !tokenStatus && !status) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar status do limite de alunos';
            const isAuthError = error instanceof Error && error.message.includes('Token de autenticação');
            
            return (
                <Alert variant="destructive" className={className}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                        <div>{errorMessage}</div>
                        {isAuthError ? (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.location.href = '/login'}
                                className="text-xs"
                            >
                                Fazer Login
                            </Button>
                        ) : (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => refreshStatus()}
                                className="text-xs"
                            >
                                Tentar novamente
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            );
        }

        // Use new token system data when available, fallback to legacy
        const currentLimit = tokenStatus ? 
            tokenStatus.plan.total + tokenStatus.avulso.total : 
            status?.currentLimit || 0;
        const activeStudents = status?.activeStudents || 0;

        const progressPercentage = currentLimit > 0 
            ? (activeStudents / currentLimit) * 100 
            : 0;

        const getStatusColor = (): "default" | "destructive" => {
            if (isAtLimit) return 'destructive';
            return 'default';
        };

        const getStatusIcon = () => {
            if (isAtLimit) return <AlertTriangle className="h-4 w-4" />;
            if (isCloseToLimit) return <Info className="h-4 w-4" />;
            return <CheckCircle className="h-4 w-4" />;
        };

        if (variant === 'minimal') {
            return (
                <div className={`flex items-center gap-2 ${className}`}>
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                        {activeStudents}/{currentLimit}
                    </span>
                    {isAtLimit && (
                        <Badge variant="destructive" className="ml-1">
                            Limite
                        </Badge>
                    )}
                </div>
            );
        }

        if (variant === 'compact') {
            return (
                <Card className={className}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Slots de Alunos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor()}>
                                    {activeStudents}/{currentLimit}
                                </Badge>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => refreshStatus()}
                                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                    title="Atualizar status"
                                >
                                    ↻
                                </Button>
                                {process.env.NODE_ENV === 'development' && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={async () => {
                                            try {
                                                const token = localStorage.getItem('authToken');
                                                const response = await fetch('/api/token/debug/stats/' + localStorage.getItem('userData')?.split('"id":"')[1]?.split('"')[0] || '', {
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                        'Content-Type': 'application/json',
                                                    },
                                                });
                                                const data = await response.json();
                                                console.log('🔧 [Debug] Token stats response:', data);
                                                alert(`Token Stats: Total: ${data.data?.stats?.total}, Available: ${data.data?.stats?.available}, Consumed: ${data.data?.stats?.consumed}. Check console for details.`);
                                            } catch (error) {
                                                console.error('Debug failed:', error);
                                                alert('Debug failed. Check console.');
                                            }
                                        }}
                                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                        title="Debug tokens (DEV)"
                                    >
                                        🔧
                                    </Button>
                                )}
                            </div>
                        </div>
                        
                        {showProgress && currentLimit > 0 && (
                            <Progress 
                                value={progressPercentage} 
                                className="h-2 mb-2"
                            />
                        )}
                        
                        <p className="text-sm text-muted-foreground">
                            {availableSlots > 0 
                                ? `${availableSlots} slots disponíveis`
                                : 'Nenhum slot disponível'
                            }
                        </p>

                        {/* Token breakdown using new token system */}
                        {tokenStatus && (
                            <div className="space-y-1 mt-2">
                                {tokenStatus.hasPlan && tokenStatus.plan.total > 0 && (
                                    <div className="flex items-center gap-1">
                                        <Crown className="h-3 w-3 text-blue-500" />
                                        <span className="text-xs text-muted-foreground">
                                            Plano: {tokenStatus.plan.available}/{tokenStatus.plan.total} disponíveis
                                            {tokenStatus.plan.expirationDate && (
                                                <span className="text-gray-400 ml-1">
                                                    (exp: {new Date(tokenStatus.plan.expirationDate).toLocaleDateString('pt-BR')})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                                {tokenStatus.avulso.total > 0 && (
                                    <div className="flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-yellow-500" />
                                        <span className="text-xs text-muted-foreground">
                                            Avulso: {tokenStatus.avulso.available}/{tokenStatus.avulso.total} disponíveis
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Legacy token display for backward compatibility */}
                        {!tokenStatus && status && (status.tokenInfo?.totalTokens > 0 || (status.planInfo?.tokensAvulsos && status.planInfo.tokensAvulsos > 0)) && (
                            <div className="flex items-center gap-1 mt-2">
                                <Zap className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">
                                    {status.tokenInfo ? 
                                        `${status.tokenInfo.availableTokens} disponíveis / ${status.tokenInfo.consumedTokens} consumidos` :
                                        `${status.planInfo?.tokensAvulsos} tokens ativos`
                                    }
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            );
        }

        // Detailed variant
        return (
            <div className={className}>
                <Alert variant={getStatusColor()}>
                    {getStatusIcon()}
                    <AlertTitle>Status dos Slots de Alunos</AlertTitle>
                    <AlertDescription className="mt-2">
                        <div className="space-y-3">
                            <div>
                                <p className="font-medium">{getStatusMessage()}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Alunos ativos:</span>
                                    <span className="ml-2 font-medium">{activeStudents}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Limite total:</span>
                                    <span className="ml-2 font-medium">{currentLimit}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Slots disponíveis:</span>
                                    <span className="ml-2 font-medium">{availableSlots}</span>
                                </div>
                                
                                {/* New token system breakdown */}
                                {tokenStatus && (
                                    <>
                                        {tokenStatus.plan.total > 0 && (
                                            <>
                                                <div>
                                                    <span className="text-muted-foreground">Tokens de Plano:</span>
                                                    <span className="ml-2 font-medium flex items-center gap-1">
                                                        <Crown className="h-3 w-3 text-blue-500" />
                                                        {tokenStatus.plan.available}/{tokenStatus.plan.total}
                                                    </span>
                                                </div>
                                                {tokenStatus.plan.expirationDate && (
                                                    <div>
                                                        <span className="text-muted-foreground">Validade do Plano:</span>
                                                        <span className="ml-2 font-medium text-xs">
                                                            {new Date(tokenStatus.plan.expirationDate).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {tokenStatus.avulso.total > 0 && (
                                            <div>
                                                <span className="text-muted-foreground">Tokens Avulsos:</span>
                                                <span className="ml-2 font-medium flex items-center gap-1">
                                                    <Zap className="h-3 w-3 text-yellow-500" />
                                                    {tokenStatus.avulso.available}/{tokenStatus.avulso.total}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Legacy token info for backward compatibility */}
                                {!tokenStatus && status && status.tokenInfo && status.tokenInfo.totalTokens > 0 && (
                                    <>
                                        <div>
                                            <span className="text-muted-foreground">Tokens disponíveis:</span>
                                            <span className="ml-2 font-medium flex items-center gap-1">
                                                <Zap className="h-3 w-3 text-green-500" />
                                                {status.tokenInfo.availableTokens}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Tokens consumidos:</span>
                                            <span className="ml-2 font-medium flex items-center gap-1">
                                                <Zap className="h-3 w-3 text-red-500" />
                                                {status.tokenInfo.consumedTokens}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {showProgress && currentLimit > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>0</span>
                                        <span>{currentLimit}</span>
                                    </div>
                                    <Progress value={progressPercentage} className="h-2" />
                                </div>
                            )}

                            {showRecommendations && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Recomendações:</p>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                        {getRecommendations().map((rec, index) => (
                                            <li key={index} className="flex items-start gap-1">
                                                <span className="text-primary">•</span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    } catch (error) {
        console.error('StudentLimitIndicator crashed:', error);
        return (
            <div className={`p-2 border border-red-200 rounded bg-red-50 ${className}`}>
                <p className="text-sm text-red-600">Erro ao carregar indicador de limite</p>
            </div>
        );
    }
};

export default StudentLimitIndicator;