// client/src/components/ConsumedTokensDisplay.tsx
import React from 'react';
import { Zap, User, Calendar, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import useConsumedTokens from '../hooks/useConsumedTokens';

interface ConsumedTokensDisplayProps {
    className?: string;
}

export const ConsumedTokensDisplay: React.FC<ConsumedTokensDisplayProps> = ({
    className = '',
}) => {
    const { data, isLoading, isError, error } = useConsumedTokens();

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Tokens Consumidos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError || !data) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Tokens Consumidos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-red-600">
                        Erro ao carregar tokens consumidos: {error?.message}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { summary, consumedTokenDetails } = data;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Gestão de Tokens
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-green-600">
                            {summary.availableTokens}
                        </p>
                        <p className="text-xs text-muted-foreground">Disponíveis</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-red-600">
                            {summary.consumedTokens}
                        </p>
                        <p className="text-xs text-muted-foreground">Consumidos</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-bold text-blue-600">
                            {summary.totalTokens}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                </div>

                {consumedTokenDetails.length > 0 && (
                    <>
                        <Separator />
                        
                        {/* Consumed tokens details */}
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">Tokens Atribuídos aos Alunos</h4>
                            
                            {consumedTokenDetails.map((token, index) => (
                                <div
                                    key={token.tokenId}
                                    className="border rounded-lg p-3 space-y-2 bg-gray-50"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm">
                                                {token.assignedStudent.nome}
                                            </span>
                                            <Badge
                                                variant={token.assignedStudent.status === 'active' ? 'default' : 'secondary'}
                                                className="text-xs"
                                            >
                                                {token.assignedStudent.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Zap className="h-3 w-3 text-yellow-500" />
                                            <span className="text-sm font-medium">
                                                {token.quantidade}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>ID: {token.tokenId}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {token.type === 'plano' ? 'Plano' : 'Avulso'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {token.assignedStudent.email}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Atribuído: {new Date(token.dateAssigned).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                    
                                    <div className="text-xs text-muted-foreground">
                                        <span className="text-orange-600">
                                            Expira: {new Date(token.dataVencimento).toLocaleDateString('pt-BR')}
                                        </span>
                                        {new Date(token.dataVencimento) <= new Date() && (
                                            <Badge variant="destructive" className="ml-2 text-xs">
                                                Expirado
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {consumedTokenDetails.length === 0 && summary.consumedTokens === 0 && (
                    <>
                        <Separator />
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">
                                Nenhum token foi consumido ainda
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Tokens serão consumidos quando alunos forem cadastrados ou ativados
                            </p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default ConsumedTokensDisplay;