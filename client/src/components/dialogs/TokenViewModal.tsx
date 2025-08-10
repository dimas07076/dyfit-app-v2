// client/src/components/dialogs/TokenViewModal.tsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Tag, RefreshCw, AlertCircle, User, Hash, Clock, Award } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Aluno } from '@/types/aluno';
import LoadingSpinner from '@/components/LoadingSpinner';

interface TokenViewModalProps {
    student: Aluno | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

export default function TokenViewModal({ student, open, onOpenChange }: TokenViewModalProps) {
    const { tokenInfo, isLoading, error, refetch } = useTokenInfo(student?._id);

    const handleRefresh = () => {
        console.log(`[TokenViewModal] Manual refresh triggered for student: ${student?.nome}`);
        refetch();
    };

    if (!student) {
        return null;
    }

    const isExpired = tokenInfo?.dataExpiracao ? new Date(tokenInfo.dataExpiracao) <= new Date() : false;
    const formattedExpiration = tokenInfo?.dataExpiracao 
        ? format(new Date(tokenInfo.dataExpiracao), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })
        : null;
    const formattedAssociation = tokenInfo?.dateAssigned 
        ? format(new Date(tokenInfo.dateAssigned), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Informações do Token
                    </DialogTitle>
                    <DialogDescription>
                        Token associado ao aluno <strong>{student.nome}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Refresh Button */}
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="text-xs"
                        >
                            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                    </div>

                    {isLoading && (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner text="Carregando informações do token..." />
                        </div>
                    )}

                    {error && (
                        <Card className="border-destructive/50 bg-destructive/5">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Erro ao carregar token</span>
                                </div>
                                <p className="text-xs text-destructive/80 mt-1">{error}</p>
                            </CardContent>
                        </Card>
                    )}

                    {!isLoading && !error && !tokenInfo && (
                        <Card className="border-dashed border-2">
                            <CardContent className="text-center py-8">
                                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                                <h3 className="font-medium text-sm mb-2">Nenhum token associado</h3>
                                <p className="text-xs text-muted-foreground">
                                    {student.status === 'active' 
                                        ? 'Token será atribuído automaticamente nos próximos minutos'
                                        : 'Ative o aluno para que um token seja atribuído automaticamente'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {!isLoading && !error && tokenInfo && (
                        <Card>
                            <CardContent className="pt-4 space-y-4">
                                {/* Token ID */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Hash className="h-4 w-4" />
                                        ID do Token
                                    </div>
                                    <div className="bg-muted p-2 rounded-md">
                                        <code className="text-xs font-mono">{tokenInfo.id}</code>
                                    </div>
                                </div>

                                <Separator />

                                {/* Token Type */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Award className="h-4 w-4" />
                                        Tipo de Token
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{getTipoIcon(tokenInfo.tipo)}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {getTipoLabel(tokenInfo.tipo)}
                                        </Badge>
                                    </div>
                                </div>

                                <Separator />

                                {/* Status */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <AlertCircle className="h-4 w-4" />
                                        Status
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{getStatusIcon(tokenInfo.status)}</span>
                                        <Badge variant={getStatusBadgeVariant(tokenInfo.status)} className="text-xs">
                                            {tokenInfo.status}
                                        </Badge>
                                    </div>
                                </div>

                                <Separator />

                                {/* Association Date */}
                                {formattedAssociation && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <User className="h-4 w-4" />
                                                Data de Associação
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {formattedAssociation}
                                            </span>
                                        </div>
                                        <Separator />
                                    </>
                                )}

                                {/* Expiration Date */}
                                {formattedExpiration && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Calendar className="h-4 w-4" />
                                            Vencimento
                                        </div>
                                        <span className={`text-sm font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                                            {formattedExpiration}
                                        </span>
                                    </div>
                                )}

                                {/* Quantity (if > 1) */}
                                {tokenInfo.quantidade > 1 && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <Hash className="h-4 w-4" />
                                                Quantidade
                                            </div>
                                            <span className="text-sm font-medium">
                                                {tokenInfo.quantidade} tokens
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Warning for expired tokens */}
                                {isExpired && (
                                    <>
                                        <Separator />
                                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                            <div className="flex items-center gap-2 text-destructive text-sm">
                                                <AlertCircle className="h-4 w-4" />
                                                <span className="font-medium">Token Expirado</span>
                                            </div>
                                            <p className="text-xs text-destructive/80 mt-1">
                                                Este token precisa ser renovado para continuar ativo.
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Status explanation */}
                                {tokenInfo.status === 'disponível' && student.status === 'inactive' && (
                                    <>
                                        <Separator />
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                                                <Clock className="h-4 w-4" />
                                                <span className="font-medium">Token Disponível</span>
                                            </div>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                Token liberado e disponível para ser associado a outro aluno.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}