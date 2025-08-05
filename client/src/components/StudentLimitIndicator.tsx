// client/src/components/StudentLimitIndicator.tsx
import React from 'react';
import { AlertTriangle, Users, Zap, Info, CheckCircle } from 'lucide-react';
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
    // Temporarily simplified version to prevent crashes
    try {
        console.log('🔧 [StudentLimitIndicator] Rendering component, variant:', variant);
        
        // Try to use the hook, but with better error boundaries
        let hookResult;
        try {
            hookResult = useStudentLimit();
            console.log('🔧 [StudentLimitIndicator] Hook result:', {
                hasStatus: !!hookResult.status,
                isLoading: hookResult.isLoading,
                isError: hookResult.isError,
                errorMessage: hookResult.error?.message
            });
        } catch (hookError) {
            console.error('🚨 [StudentLimitIndicator] Hook failed:', hookError);
            // Return a simple fallback
            return (
                <div className={`p-2 text-sm text-gray-600 ${className}`}>
                    <span>Status do limite: Carregando...</span>
                </div>
            );
        }

        const { 
            status, 
            isLoading, 
            isError, 
            error, 
            isAtLimit, 
            isCloseToLimit, 
            refreshStatus 
        } = hookResult;

        // Loading state
        if (isLoading) {
            return (
                <div className={`animate-pulse ${className}`}>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
            );
        }

        if (isError || !status) {
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

        const progressPercentage = status.currentLimit > 0 
            ? (status.activeStudents / status.currentLimit) * 100 
            : 0;

        const getStatusColor = () => {
            if (isAtLimit) return 'destructive';
            if (isCloseToLimit) return 'warning';
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
                        {status.activeStudents}/{status.currentLimit}
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
                                <span className="text-sm font-medium">Alunos Ativos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor()}>
                                    {status.activeStudents}/{status.currentLimit}
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
                                                const token = localStorage.getItem('token');
                                                const response = await fetch('/api/student-limit/debug-tokens', {
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                        'Content-Type': 'application/json',
                                                    },
                                                });
                                                const data = await response.json();
                                                console.log('🔧 [Debug] Token debug response:', data);
                                                alert(`Tokens Debug: Total Records: ${data.debug?.totalTokenRecords}, Active: ${data.debug?.activeTokenRecords}, Service Result: ${data.debug?.serviceTokenCount}. Check console for details.`);
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
                        
                        {showProgress && status.currentLimit > 0 && (
                            <Progress 
                                value={progressPercentage} 
                                className="h-2 mb-2"
                            />
                        )}
                        
                        <p className="text-sm text-muted-foreground">
                            {status.availableSlots > 0 
                                ? `${status.availableSlots} slots disponíveis`
                                : 'Nenhum slot disponível'
                            }
                        </p>

                        {status.planInfo?.tokensAvulsos > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                                <Zap className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs text-muted-foreground">
                                    {status.planInfo.tokensAvulsos} tokens ativos
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
                    <AlertTitle>Status dos Alunos</AlertTitle>
                    <AlertDescription className="mt-2">
                        <div className="space-y-3">
                            <div>
                                <p className="font-medium">{status.message}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Alunos ativos:</span>
                                    <span className="ml-2 font-medium">{status.activeStudents}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Limite atual:</span>
                                    <span className="ml-2 font-medium">{status.currentLimit}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Slots disponíveis:</span>
                                    <span className="ml-2 font-medium">{status.availableSlots}</span>
                                </div>
                                {status.planInfo?.tokensAvulsos > 0 && (
                                    <div>
                                        <span className="text-muted-foreground">Tokens ativos:</span>
                                        <span className="ml-2 font-medium flex items-center gap-1">
                                            <Zap className="h-3 w-3 text-yellow-500" />
                                            {status.planInfo.tokensAvulsos}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {showProgress && status.currentLimit > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>0</span>
                                        <span>{status.currentLimit}</span>
                                    </div>
                                    <Progress value={progressPercentage} className="h-2" />
                                </div>
                            )}

                            {showRecommendations && status.recommendations && status.recommendations.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Recomendações:</p>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                        {status.recommendations.map((rec, index) => (
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
        // Fallback UI if component crashes
        console.error('StudentLimitIndicator crashed:', error);
        return (
            <div className={`p-2 border border-red-200 rounded bg-red-50 ${className}`}>
                <p className="text-sm text-red-600">Erro ao carregar indicador de limite</p>
            </div>
        );
    }
};

export default StudentLimitIndicator;