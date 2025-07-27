// client/src/components/dialogs/admin/PlanoModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { PersonalTrainerWithStatus, Plano, AssignPlanForm, AddTokensForm } from '../../../../../shared/types/planos';
import { CalendarDays, Clock, DollarSign } from 'lucide-react';

interface PlanoModalProps {
    isOpen: boolean;
    onClose: () => void;
    personal: PersonalTrainerWithStatus | null;
    planos: Plano[];
    onAssignPlan: (personalId: string, data: AssignPlanForm) => Promise<void>;
    onAddTokens: (personalId: string, data: AddTokensForm) => Promise<void>;
}

interface DetailedPersonalStatus {
    personalInfo: any;
    currentPlan: any;
    activeTokens: any[];
    activeStudents: number;
    totalLimit: number;
    planHistory: any[];
}

type ModalMode = 'view' | 'assign-plan' | 'add-tokens';

export function PlanoModal({ 
    isOpen, 
    onClose, 
    personal, 
    planos, 
    onAssignPlan, 
    onAddTokens 
}: PlanoModalProps) {
    const [mode, setMode] = useState<ModalMode>('view');
    const [loading, setLoading] = useState(false);
    const [detailedStatus, setDetailedStatus] = useState<DetailedPersonalStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    
    // Plan assignment form
    const [assignForm, setAssignForm] = useState<AssignPlanForm>({
        planoId: '',
        customDuration: undefined,
        motivo: ''
    });
    
    // Token addition form
    const [tokenForm, setTokenForm] = useState<AddTokensForm>({
        quantidade: 1,
        customDays: 30,
        motivo: ''
    });

    // Load detailed status when modal opens
    useEffect(() => {
        if (isOpen && personal) {
            setMode('view');
            setAssignForm({ planoId: '', customDuration: undefined, motivo: '' });
            setTokenForm({ quantidade: 1, customDays: 30, motivo: '' });
            loadDetailedStatus();
        }
    }, [isOpen, personal]);

    const loadDetailedStatus = async () => {
        if (!personal) return;
        
        setLoadingStatus(true);
        try {
            console.log('🔄 Carregando status detalhado do personal...', personal._id);
            
            const response = await fetch(`/api/admin/personal/${personal._id}/status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const status = await response.json();
                console.log('✅ Status detalhado carregado:', status);
                setDetailedStatus(status);
            } else {
                console.error('❌ Erro ao carregar status detalhado');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar status detalhado:', error);
        } finally {
            setLoadingStatus(false);
        }
    };

    const handleAssignPlan = async () => {
        if (!personal || !assignForm.planoId) return;
        
        setLoading(true);
        try {
            await onAssignPlan(personal._id, assignForm);
            // Don't close modal here, let parent component handle it
            // The parent will reload data and close the modal
        } catch (error) {
            console.error('Error assigning plan:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTokens = async () => {
        if (!personal || tokenForm.quantidade < 1) return;
        
        setLoading(true);
        try {
            await onAddTokens(personal._id, tokenForm);
            // Don't close modal here, let parent component handle it
            // The parent will reload data and close the modal
        } catch (error) {
            console.error('Error adding tokens:', error);
        } finally {
            setLoading(false);
        }
    };



    if (!personal) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'view' && `Gerenciar Plano - ${personal.nome}`}
                        {mode === 'assign-plan' && 'Atribuir Plano'}
                        {mode === 'add-tokens' && 'Adicionar Tokens'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'view' && 'Visualize e gerencie o plano do personal trainer'}
                        {mode === 'assign-plan' && 'Atribua um novo plano ao personal trainer'}
                        {mode === 'add-tokens' && 'Adicione tokens avulsos ao personal trainer'}
                    </DialogDescription>
                </DialogHeader>

                {mode === 'view' && (
                    <div className="space-y-6">
                        {/* Personal Info */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Informações do Personal</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Nome:</span>
                                    <p className="font-medium">{personal.nome}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Email:</span>
                                    <p className="font-medium">{personal.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Current Plan Information */}
                        <div className="bg-white border p-4 rounded-lg">
                            <h3 className="font-semibold mb-3">Plano Atual</h3>
                            {loadingStatus ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="ml-2 text-sm text-gray-600">Carregando informações...</span>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                                        <CalendarDays className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <p className="text-lg font-semibold text-gray-800 mb-1">
                                        {detailedStatus?.currentPlan?.plano?.nome || personal.planoAtual || 'Sem plano ativo'}
                                    </p>
                                    {!detailedStatus?.currentPlan?.plano && !personal.planoAtual && (
                                        <p className="text-sm text-gray-500">
                                            Nenhum plano foi atribuído a este personal trainer
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Plan Details */}
                        {detailedStatus && detailedStatus.currentPlan?.plano && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">Informações do Plano</h3>
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-600">Nome do Plano:</span>
                                        <p className="font-medium">{detailedStatus.currentPlan.plano.nome}</p>
                                    </div>
                                    {detailedStatus.currentPlan?.personalPlano && (
                                        <>
                                            <div>
                                                <span className="text-gray-600">Data de Cadastro:</span>
                                                <p className="font-medium">
                                                    {new Date(detailedStatus.currentPlan.personalPlano.dataInicio).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Validade:</span>
                                                <p className="font-medium">
                                                    {new Date(detailedStatus.currentPlan.personalPlano.dataVencimento).toLocaleDateString('pt-BR')}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'assign-plan' && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="plano">Selecione o Plano</Label>
                            <Select value={assignForm.planoId} onValueChange={(value) => setAssignForm({ ...assignForm, planoId: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={planos.length === 0 ? "Nenhum plano disponível" : "Escolha um plano"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {planos.length === 0 ? (
                                        <SelectItem value="empty" disabled>
                                            <span className="text-gray-500">Nenhum plano disponível</span>
                                        </SelectItem>
                                    ) : (
                                        planos.map((plano) => (
                                            <SelectItem key={plano._id} value={plano._id}>
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{plano.nome}</span>
                                                    <span className="text-sm text-gray-500 ml-2">
                                                        {plano.limiteAlunos} alunos - R${plano.preco.toFixed(2)}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {planos.length === 0 && (
                                <p className="text-sm text-red-600 mt-1">
                                    ⚠️ Nenhum plano disponível. Entre em contato com o administrador.
                                </p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="customDuration">Duração Customizada (dias) - Opcional</Label>
                            <Input
                                id="customDuration"
                                type="number"
                                placeholder="Deixe vazio para usar duração padrão do plano"
                                value={assignForm.customDuration || ''}
                                onChange={(e) => setAssignForm({ 
                                    ...assignForm, 
                                    customDuration: e.target.value ? parseInt(e.target.value) : undefined 
                                })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="motivo">Motivo da Atribuição</Label>
                            <Textarea
                                id="motivo"
                                placeholder="Descreva o motivo desta atribuição..."
                                value={assignForm.motivo}
                                onChange={(e) => setAssignForm({ ...assignForm, motivo: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {mode === 'add-tokens' && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="quantidade">Quantidade de Tokens</Label>
                            <Input
                                id="quantidade"
                                type="number"
                                min="1"
                                value={tokenForm.quantidade}
                                onChange={(e) => setTokenForm({ ...tokenForm, quantidade: parseInt(e.target.value) || 1 })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="customDays">Validade (dias)</Label>
                            <Input
                                id="customDays"
                                type="number"
                                min="1"
                                value={tokenForm.customDays}
                                onChange={(e) => setTokenForm({ ...tokenForm, customDays: parseInt(e.target.value) || 30 })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="motivoToken">Motivo da Adição</Label>
                            <Textarea
                                id="motivoToken"
                                placeholder="Descreva o motivo desta adição de tokens..."
                                value={tokenForm.motivo}
                                onChange={(e) => setTokenForm({ ...tokenForm, motivo: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {mode === 'view' && (
                        <>
                            <Button variant="outline" onClick={() => setMode('add-tokens')}>
                                Adicionar Tokens
                            </Button>
                            <Button onClick={() => setMode('assign-plan')}>
                                Atribuir Plano
                            </Button>
                        </>
                    )}
                    
                    {mode === 'assign-plan' && (
                        <>
                            <Button variant="outline" onClick={() => setMode('view')}>
                                Voltar
                            </Button>
                            <Button 
                                onClick={handleAssignPlan} 
                                disabled={!assignForm.planoId || planos.length === 0 || loading}
                            >
                                {loading ? 'Atribuindo...' : 'Atribuir Plano'}
                            </Button>
                        </>
                    )}
                    
                    {mode === 'add-tokens' && (
                        <>
                            <Button variant="outline" onClick={() => setMode('view')}>
                                Voltar
                            </Button>
                            <Button 
                                onClick={handleAddTokens} 
                                disabled={tokenForm.quantidade < 1 || loading}
                            >
                                {loading ? 'Adicionando...' : 'Adicionar Tokens'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}