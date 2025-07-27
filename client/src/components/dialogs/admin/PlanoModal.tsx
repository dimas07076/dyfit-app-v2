// client/src/components/dialogs/admin/PlanoModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { PersonalTrainerWithStatus, Plano, AssignPlanForm, AddTokensForm } from '../../../../../shared/types/planos';
import { Badge } from '../../ui/badge';
import { CalendarDays, Users, Clock, DollarSign } from 'lucide-react';

interface PlanoModalProps {
    isOpen: boolean;
    onClose: () => void;
    personal: PersonalTrainerWithStatus | null;
    planos: Plano[];
    onAssignPlan: (personalId: string, data: AssignPlanForm) => Promise<void>;
    onAddTokens: (personalId: string, data: AddTokensForm) => Promise<void>;
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

    useEffect(() => {
        if (isOpen) {
            setMode('view');
            setAssignForm({ planoId: '', customDuration: undefined, motivo: '' });
            setTokenForm({ quantidade: 1, customDays: 30, motivo: '' });
        }
    }, [isOpen]);

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

    const getStatusColor = (percentual: number) => {
        if (percentual >= 90) return 'bg-red-500';
        if (percentual >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatusText = (percentual: number) => {
        if (percentual >= 90) return 'Crítico';
        if (percentual >= 70) return 'Atenção';
        return 'Normal';
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

                        {/* Current Plan Status */}
                        <div className="bg-white border p-4 rounded-lg">
                            <h3 className="font-semibold mb-3">Status Atual</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-1">
                                        <CalendarDays className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <p className="text-sm text-gray-600">Plano Atual</p>
                                    <p className="font-semibold">{personal.planoAtual || 'Sem plano'}</p>
                                </div>
                                
                                <div className="text-center">
                                    <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-1">
                                        <Users className="w-4 h-4 text-green-600" />
                                    </div>
                                    <p className="text-sm text-gray-600">Alunos Ativos</p>
                                    <p className="font-semibold">{personal.alunosAtivos || 0}/{personal.limiteAlunos || 0}</p>
                                </div>
                                
                                <div className="text-center">
                                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-1">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(personal.percentualUso || 0)}`} />
                                    </div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <Badge variant={(personal.percentualUso || 0) >= 90 ? 'destructive' : (personal.percentualUso || 0) >= 70 ? 'default' : 'secondary'}>
                                        {getStatusText(personal.percentualUso || 0)}
                                    </Badge>
                                </div>
                                
                                <div className="text-center">
                                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-1">
                                        <div className="text-orange-600 text-xs font-bold">{personal.percentualUso || 0}%</div>
                                    </div>
                                    <p className="text-sm text-gray-600">Utilização</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                        <div 
                                            className={`h-2 rounded-full ${getStatusColor(personal.percentualUso || 0)}`}
                                            style={{ width: `${Math.min(personal.percentualUso || 0, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'assign-plan' && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="plano">Selecione o Plano</Label>
                            <Select value={assignForm.planoId} onValueChange={(value) => setAssignForm({ ...assignForm, planoId: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Escolha um plano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {planos.map((plano) => (
                                        <SelectItem key={plano._id} value={plano._id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{plano.nome}</span>
                                                <span className="text-sm text-gray-500 ml-2">
                                                    {plano.limiteAlunos} alunos - R${plano.preco.toFixed(2)}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                disabled={!assignForm.planoId || loading}
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