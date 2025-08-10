// client/src/components/TokenInfoDisplay.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Tag, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface TokenInfo {
    id: string;
    tipo: 'plano' | 'avulso';
    dataExpiracao: string;
    status: string;
    alunoId?: string;
    alunoNome?: string;
    quantidade: number;
    dateAssigned?: string;
}

interface TokenInfoDisplayProps {
    tokenInfo: TokenInfo | null;
    isLoading?: boolean;
    showTitle?: boolean;
}

const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
        case 'ativo':
            return 'default';
        case 'expirado':
            return 'destructive';
        case 'disponível':
            return 'secondary';
        case 'inativo':
            return 'outline';
        default:
            return 'secondary';
    }
};

const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
        case 'ativo':
            return '✅';
        case 'expirado':
            return '❌';
        case 'disponível':
            return '🔓';
        case 'inativo':
            return '⏸️';
        default:
            return '❓';
    }
};

const getTipoLabel = (tipo: string) => {
    return tipo === 'plano' ? 'Plano' : 'Avulso';
};

const getTipoIcon = (tipo: string) => {
    return tipo === 'plano' ? '📦' : '🎟️';
};

export function TokenInfoDisplay({ 
    tokenInfo, 
    isLoading = false, 
    showTitle = true 
}: TokenInfoDisplayProps) {
    if (isLoading) {
        return (
            <Card className="w-full">
                {showTitle && (
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Token Associado
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent className="space-y-3">
                    <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!tokenInfo) {
        return (
            <Card className="w-full border-dashed">
                {showTitle && (
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Token Associado
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent className="text-center py-6">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                        Nenhum token associado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Token será atribuído automaticamente ao ativar o aluno
                    </p>
                </CardContent>
            </Card>
        );
    }

    const formattedExpiration = format(new Date(tokenInfo.dataExpiracao), 'dd/MM/yyyy', { locale: ptBR });
    const isExpired = new Date(tokenInfo.dataExpiracao) <= new Date();

    return (
        <Card className="w-full">
            {showTitle && (
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Token Associado
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className="space-y-3">
                {/* Token ID and Type */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {tokenInfo.id}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs">{getTipoIcon(tokenInfo.tipo)}</span>
                        <Badge variant="outline" className="text-xs">
                            {getTipoLabel(tokenInfo.tipo)}
                        </Badge>
                    </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex items-center gap-2">
                        <span>{getStatusIcon(tokenInfo.status)}</span>
                        <Badge variant={getStatusBadgeVariant(tokenInfo.status)} className="text-xs">
                            {tokenInfo.status}
                        </Badge>
                    </div>
                </div>

                {/* Expiration Date */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Validade:
                    </span>
                    <span className={`text-sm font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                        {formattedExpiration}
                    </span>
                </div>

                {/* Quantity (if > 1) */}
                {tokenInfo.quantidade > 1 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Quantidade:</span>
                        <span className="text-sm font-medium">
                            {tokenInfo.quantidade}
                        </span>
                    </div>
                )}

                {/* Student Name (if available and different) */}
                {tokenInfo.alunoNome && tokenInfo.alunoId && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Aluno:
                        </span>
                        <span className="text-sm font-medium truncate max-w-[150px]">
                            {tokenInfo.alunoNome}
                        </span>
                    </div>
                )}

                {/* Warning for expired tokens */}
                {isExpired && (
                    <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Token expirado - requer renovação
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}