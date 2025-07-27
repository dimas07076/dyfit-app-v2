// client/src/components/dialogs/admin/EnhancedPlanoModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { PersonalTrainerWithStatus, Plano, AssignPlanForm, AddTokensForm } from '../../../../../shared/types/planos';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { CalendarDays, Users, Clock, DollarSign, AlertCircle, CheckCircle, XCircle, Info, Loader2 } from 'lucide-react';

interface PlanoModalProps {
  isOpen: boolean;
  onClose: () => void;
  personal: PersonalTrainerWithStatus | null;
  planos: Plano[];
  onAssignPlan: (personalId: string, data: AssignPlanForm) => Promise<void>;
  onAddTokens: (personalId: string, data: AddTokensForm) => Promise<void>;
  getPlanNameById: (planId: string | null) => string;
  getPlanById: (planId: string | null) => Plano | null;
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
  onAddTokens,
  getPlanNameById,
  getPlanById
}: PlanoModalProps) {
  const [mode, setMode] = useState<ModalMode>('view');
  const [loading, setLoading] = useState(false);
  const [detailedStatus, setDetailedStatus] = useState<DetailedPersonalStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Reset form and load detailed status when modal opens
  useEffect(() => {
    if (isOpen && personal) {
      setMode('view');
      setError(null);
      setAssignForm({ planoId: '', customDuration: undefined, motivo: '' });
      setTokenForm({ quantidade: 1, customDays: 30, motivo: '' });
      loadDetailedStatus();
    }
  }, [isOpen, personal]);

  const loadDetailedStatus = async () => {
    if (!personal) return;
    
    setLoadingStatus(true);
    setError(null);
    
    try {
      console.log('🔄 Loading detailed status for personal...', personal._id);
      
      const response = await fetch(`/api/admin/personal/${personal._id}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const status = await response.json();
        console.log('✅ Detailed status loaded:', status);
        setDetailedStatus(status);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao carregar detalhes');
      }
    } catch (error) {
      console.error('❌ Error loading detailed status:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar detalhes do personal');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleAssignPlan = async () => {
    if (!personal || !assignForm.planoId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onAssignPlan(personal._id, assignForm);
      // Success handling is done in the parent hook
    } catch (error) {
      console.error('Error assigning plan:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atribuir plano');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTokens = async () => {
    if (!personal || tokenForm.quantidade < 1) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await onAddTokens(personal._id, tokenForm);
      // Success handling is done in the parent hook
    } catch (error) {
      console.error('Error adding tokens:', error);
      setError(error instanceof Error ? error.message : 'Erro ao adicionar tokens');
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

  const getStatusIcon = (percentual: number) => {
    if (percentual >= 90) return <XCircle className="w-4 h-4 text-red-500" />;
    if (percentual >= 70) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const selectedPlan = assignForm.planoId ? getPlanById(assignForm.planoId) : null;

  if (!personal) return null;

  // Get current plan name using the robust lookup function
  const currentPlanName = getPlanNameById(personal.planoId);
  const currentPlan = getPlanById(personal.planoId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
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

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {mode === 'view' && (
          <div className="space-y-6">
            {/* Personal Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Informações do Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="font-medium text-lg">{personal.nome}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{personal.email}</p>
                </div>
              </div>
            </div>

            {/* Current Plan Status - Enhanced Display */}
            <div className="bg-white border-2 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-purple-600" />
                Status do Plano Atual
              </h3>
              
              {loadingStatus ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Carregando status detalhado...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Primary Status Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <CalendarDays className="w-5 h-5 text-blue-600" />
                        <Info className="w-4 h-4 text-blue-400" />
                      </div>
                      <p className="text-sm text-blue-600 font-medium">Plano Atual</p>
                      <p className="font-bold text-lg text-blue-800">{currentPlanName}</p>
                      {personal.planoId && (
                        <p className="text-xs text-blue-500 mt-1">
                          ID: {personal.planoId.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <Users className="w-5 h-5 text-green-600" />
                        <span className="text-xs text-green-500">ativos</span>
                      </div>
                      <p className="text-sm text-green-600 font-medium">Alunos</p>
                      <p className="font-bold text-lg text-green-800">
                        {personal.alunosAtivos}/{personal.limiteAlunos}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        {getStatusIcon(personal.percentualUso)}
                        <Badge variant={
                          personal.percentualUso >= 90 ? 'destructive' : 
                          personal.percentualUso >= 70 ? 'default' : 'secondary'
                        }>
                          {getStatusText(personal.percentualUso)}
                        </Badge>
                      </div>
                      <p className="text-sm text-purple-600 font-medium">Status</p>
                      <p className="font-bold text-lg text-purple-800">
                        {personal.percentualUso}% usado
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(personal.percentualUso)}`} />
                        <Clock className="w-4 h-4 text-orange-400" />
                      </div>
                      <p className="text-sm text-orange-600 font-medium">Utilização</p>
                      <div className="mt-2">
                        <div className="w-full bg-orange-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${getStatusColor(personal.percentualUso)}`}
                            style={{ width: `${Math.min(personal.percentualUso, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plan Details */}
                  {currentPlan && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Detalhes do Plano
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Limite de Alunos:</span>
                          <p className="font-medium">{currentPlan.limiteAlunos}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Preço:</span>
                          <p className="font-medium">R$ {currentPlan.preco.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Duração:</span>
                          <p className="font-medium">{currentPlan.duracao} dias</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Details from Server */}
                  {detailedStatus && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Informações Adicionais</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {detailedStatus.currentPlan?.personalPlano && (
                          <>
                            <div>
                              <span className="text-gray-600">Início da Assinatura:</span>
                              <p className="font-medium">
                                {new Date(detailedStatus.currentPlan.personalPlano.dataInicio).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Fim da Assinatura:</span>
                              <p className="font-medium">
                                {new Date(detailedStatus.currentPlan.personalPlano.dataVencimento).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </>
                        )}
                        {detailedStatus.activeTokens?.length > 0 && (
                          <div className="md:col-span-2">
                            <span className="text-gray-600">Tokens Ativos:</span>
                            <p className="font-medium">
                              {detailedStatus.activeTokens.reduce((sum, token) => sum + token.quantidade, 0)} tokens adicionais
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'assign-plan' && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="plano" className="text-base font-medium">Selecione o Plano</Label>
              <Select value={assignForm.planoId} onValueChange={(value) => setAssignForm({ ...assignForm, planoId: value })}>
                <SelectTrigger className="mt-2">
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
                          <div className="flex flex-col">
                            <span className="font-medium">{plano.nome}</span>
                            <span className="text-xs text-gray-500">
                              {plano.limiteAlunos} alunos • R$ {plano.preco.toFixed(2)} • {plano.duracao} dias
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {planos.length === 0 && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum plano disponível. Entre em contato com o administrador.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Plan Preview */}
              {selectedPlan && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Preview do Plano Selecionado</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Nome:</span>
                      <p className="font-medium">{selectedPlan.nome}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Limite:</span>
                      <p className="font-medium">{selectedPlan.limiteAlunos} alunos</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Preço:</span>
                      <p className="font-medium">R$ {selectedPlan.preco.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Duração:</span>
                      <p className="font-medium">{selectedPlan.duracao} dias</p>
                    </div>
                  </div>
                  {selectedPlan.descricao && (
                    <div className="mt-2">
                      <span className="text-blue-600">Descrição:</span>
                      <p className="text-sm text-gray-700">{selectedPlan.descricao}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="customDuration" className="text-base font-medium">Duração Customizada (dias)</Label>
              <Input
                id="customDuration"
                type="number"
                min="1"
                placeholder={selectedPlan ? `Padrão: ${selectedPlan.duracao} dias` : "Deixe vazio para usar duração padrão"}
                value={assignForm.customDuration || ''}
                onChange={(e) => setAssignForm({ 
                  ...assignForm, 
                  customDuration: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Opcional. Se não informado, será usado a duração padrão do plano.
              </p>
            </div>

            <div>
              <Label htmlFor="motivo" className="text-base font-medium">Motivo da Atribuição</Label>
              <Textarea
                id="motivo"
                placeholder="Descreva o motivo desta atribuição..."
                value={assignForm.motivo}
                onChange={(e) => setAssignForm({ ...assignForm, motivo: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        )}

        {mode === 'add-tokens' && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="quantidade" className="text-base font-medium">Quantidade de Tokens</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={tokenForm.quantidade}
                onChange={(e) => setTokenForm({ ...tokenForm, quantidade: parseInt(e.target.value) || 1 })}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Número de tokens avulsos para adicionar ao personal.
              </p>
            </div>

            <div>
              <Label htmlFor="customDays" className="text-base font-medium">Validade (dias)</Label>
              <Input
                id="customDays"
                type="number"
                min="1"
                value={tokenForm.customDays}
                onChange={(e) => setTokenForm({ ...tokenForm, customDays: parseInt(e.target.value) || 30 })}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Período de validade dos tokens em dias.
              </p>
            </div>

            <div>
              <Label htmlFor="motivoToken" className="text-base font-medium">Motivo da Adição</Label>
              <Textarea
                id="motivoToken"
                placeholder="Descreva o motivo desta adição de tokens..."
                value={tokenForm.motivo}
                onChange={(e) => setTokenForm({ ...tokenForm, motivo: e.target.value })}
                className="mt-2"
                rows={3}
              />
            </div>

            {/* Token Preview */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Preview dos Tokens</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-600">Quantidade:</span>
                  <p className="font-medium">{tokenForm.quantidade} tokens</p>
                </div>
                <div>
                  <span className="text-green-600">Validade:</span>
                  <p className="font-medium">{tokenForm.customDays} dias</p>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-green-600">Vencimento:</span>
                <p className="text-sm text-gray-700">
                  {new Date(Date.now() + tokenForm.customDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {mode === 'view' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setMode('add-tokens')}
                disabled={loadingStatus}
              >
                Adicionar Tokens
              </Button>
              <Button 
                onClick={() => setMode('assign-plan')}
                disabled={loadingStatus}
              >
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
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atribuindo...
                  </>
                ) : (
                  'Atribuir Plano'
                )}
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
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  'Adicionar Tokens'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}