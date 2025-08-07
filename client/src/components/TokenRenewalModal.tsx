// client/src/components/TokenRenewalModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchWithAuth } from '@/lib/apiClient';

interface TokenForRenewal {
    id: string;
    alunoNome?: string;
    alunoId?: string;
    dataExpiracao: string;
    status: string;
}

interface PlanInfo {
    nome: string;
    limiteAlunos: number;
    novaDataExpiracao: string;
}

interface TokenRenewalData {
    tokens: TokenForRenewal[];
    planInfo: PlanInfo;
}

interface TokenRenewalModalProps {
    isOpen: boolean;
    onClose: () => void;
    planoId: string;
    onSuccess?: () => void;
}

export function TokenRenewalModal({ 
    isOpen, 
    onClose, 
    planoId, 
    onSuccess 
}: TokenRenewalModalProps) {
    const [renewalData, setRenewalData] = useState<TokenRenewalData | null>(null);
    const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch renewal data when modal opens
    useEffect(() => {
        if (isOpen && planoId) {
            fetchRenewalData();
        }
    }, [isOpen, planoId]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setRenewalData(null);
            setSelectedTokens(new Set());
            setError(null);
        }
    }, [isOpen]);

    const fetchRenewalData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchWithAuth(`/api/tokens/renewal/${planoId}`);
            
            if (response && response.success) {
                setRenewalData(response.data);
                // Pre-select all tokens that have assigned students
                const preSelected = new Set(
                    response.data.tokens
                        .filter((token: TokenForRenewal) => token.alunoId)
                        .map((token: TokenForRenewal) => token.id)
                );
                setSelectedTokens(preSelected);
            } else {
                setError('Erro ao carregar dados para renovação');
            }
        } catch (err: any) {
            console.error('Error fetching renewal data:', err);
            setError('Erro ao carregar dados para renovação');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTokenToggle = (tokenId: string, checked: boolean) => {
        const newSelected = new Set(selectedTokens);
        if (checked) {
            newSelected.add(tokenId);
        } else {
            newSelected.delete(tokenId);
        }
        setSelectedTokens(newSelected);
    };

    const handleSelectAll = () => {
        if (renewalData) {
            setSelectedTokens(new Set(renewalData.tokens.map(token => token.id)));
        }
    };

    const handleSelectNone = () => {
        setSelectedTokens(new Set());
    };

    const handleSelectAssigned = () => {
        if (renewalData) {
            const assignedTokens = renewalData.tokens
                .filter(token => token.alunoId)
                .map(token => token.id);
            setSelectedTokens(new Set(assignedTokens));
        }
    };

    const handleSubmit = async () => {
        if (!renewalData) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetchWithAuth('/api/tokens/renovar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planoId,
                    novaDataExpiracao: renewalData.planInfo.novaDataExpiracao,
                    tokensRenovados: Array.from(selectedTokens)
                })
            });

            if (response && response.success) {
                onSuccess?.();
                onClose();
            } else {
                setError(response?.message || 'Erro durante renovação');
            }
        } catch (err: any) {
            console.error('Error renewing tokens:', err);
            setError('Erro durante renovação de tokens');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedCount = selectedTokens.size;
    const liberatedCount = renewalData ? renewalData.tokens.length - selectedCount : 0;
    const newExpirationDate = renewalData ? format(new Date(renewalData.planInfo.novaDataExpiracao), 'dd/MM/yyyy', { locale: ptBR }) : '';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        🔄 Renovação de Tokens do Plano
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                        <p className="text-destructive text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Carregando dados...</span>
                    </div>
                ) : renewalData ? (
                    <>
                        {/* Plan Information */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">{renewalData.planInfo.nome}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Limite: {renewalData.planInfo.limiteAlunos} alunos
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Nova validade:</p>
                                        <p className="font-semibold">{newExpirationDate}</p>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Selection Summary */}
                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium">{selectedCount} tokens renovados</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-orange-600" />
                                    <span className="text-sm font-medium">{liberatedCount} tokens liberados</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleSelectAssigned}>
                                    Selecionar Ativos
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                    Selecionar Todos
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleSelectNone}>
                                    Limpar Seleção
                                </Button>
                            </div>
                        </div>

                        {/* Token List */}
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {renewalData.tokens.map((token) => {
                                const isSelected = selectedTokens.has(token.id);
                                const hasStudent = !!token.alunoId;
                                const isExpired = new Date(token.dataExpiracao) <= new Date();

                                return (
                                    <Card key={token.id} className={`transition-colors ${isSelected ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleTokenToggle(token.id, checked as boolean)}
                                                />
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                                                {token.id}
                                                            </span>
                                                            <Badge variant={hasStudent ? 'default' : 'secondary'} className="text-xs">
                                                                {token.status}
                                                            </Badge>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Calendar className="h-3 w-3" />
                                                            <span className={isExpired ? 'text-destructive' : ''}>
                                                                Expira em {format(new Date(token.dataExpiracao), 'dd/MM/yyyy', { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {hasStudent ? (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">{token.alunoNome}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-muted-foreground">
                                                            Token disponível
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Renewal Instructions */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                            <p className="font-medium text-blue-900 mb-1">ℹ️ Como funciona a renovação:</p>
                            <ul className="text-blue-800 space-y-1 text-xs">
                                <li>• <strong>Tokens selecionados:</strong> Terão a validade atualizada para {newExpirationDate}</li>
                                <li>• <strong>Tokens não selecionados:</strong> Serão liberados e ficarão disponíveis para novos alunos</li>
                                <li>• <strong>Alunos com tokens liberados:</strong> Permanecerão no sistema mas sem token associado</li>
                            </ul>
                        </div>
                    </>
                ) : null}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !renewalData}
                        className="min-w-[120px]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Renovando...
                            </>
                        ) : (
                            'Confirmar Renovação'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}