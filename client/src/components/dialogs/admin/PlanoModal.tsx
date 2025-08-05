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
import { CalendarDays, Users, Clock, DollarSign, AlertCircle, CheckCircle, XCircle, Info, Loader2, Calendar, X, Trash2 } from 'lucide-react';
import { ModalConfirmacao } from '../../ui/modal-confirmacao';

interface PlanoModalProps {
  isOpen: boolean;
  onClose: () => void;
  personal: PersonalTrainerWithStatus | null;
  planos: Plano[];
  onAssignPlan: (personalId: string, data: AssignPlanForm) => Promise<void>;
  onAddTokens: (personalId: string, data: AddTokensForm) => Promise<void>;
  onRemovePlan: (personalId: string) => Promise<void>;
  onDeleteToken: (personalId: string, tokenId: string) => Promise<void>;
  getPlanNameById: (planId: string | null) => string;
  getPlanById: (planId: string | null) => Plano | null;
}

interface DetailedPersonalStatus {
  personalInfo: any;
  currentPlan: any;
  activeTokens: any[];
  expiredTokens: any[];
  totalActiveTokens: number;
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
  onRemovePlan,
  onDeleteToken,
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

  // Confirmation dialogs state
  const [showRemovePlanConfirm, setShowRemovePlanConfirm] = useState(false);
  const [showDeleteTokenConfirm, setShowDeleteTokenConfirm] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<{ id: string; quantidade: number } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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

  const handleRemovePlan = async () => {
    if (!personal) return;
    
    setConfirmLoading(true);
    try {
      await onRemovePlan(personal._id);
      setShowRemovePlanConfirm(false);
      await loadDetailedStatus(); // Reload status after removal
    } catch (error) {
      console.error('Error removing plan:', error);
      setError(error instanceof Error ? error.message : 'Erro ao remover plano');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDeleteToken = async () => {
    if (!personal || !tokenToDelete) return;
    
    setConfirmLoading(true);
    try {
      await onDeleteToken(personal._id, tokenToDelete.id);
      setShowDeleteTokenConfirm(false);
      setTokenToDelete(null);
      await loadDetailedStatus(); // Reload status after deletion
    } catch (error) {
      console.error('Error deleting token:', error);
      setError(error instanceof Error ? error.message : 'Erro ao remover token');
    } finally {
      setConfirmLoading(false);
    }
  };

  const initiateTokenDelete = (tokenId: string, quantidade: number) => {
    setTokenToDelete({ id: tokenId, quantidade });
    setShowDeleteTokenConfirm(true);
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

            {/* Expired Plan Alert */}
            {personal.isExpired && (
              <div className="bg-red-50 border-2 border-red-200 p-6 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <X className="w-6 h-6 text-red-600" />
                  <h3 className="font-semibold text-lg text-red-800">Plano Expirado</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-red-700">
                    Este plano expirou e o personal trainer não pode mais ativar novos alunos.
                  </p>
                  {personal.dataVencimento && (
                    <p className="text-sm text-red-600">
                      <strong>Data de expiração:</strong> {new Date(personal.dataVencimento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <p className="text-sm text-red-600 font-medium">
                    Para reativar o acesso, atribua um novo plano ao personal trainer.
                  </p>
                </div>
              </div>
            )}

            {/* Current Plan Status - Enhanced Display */}
            <div className={`border-2 p-6 rounded-lg ${personal.isExpired ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CalendarDays className={`w-5 h-5 ${personal.isExpired ? 'text-red-600' : 'text-purple-600'}`} />
                {personal.isExpired ? 'Status do Plano Expirado' : 'Status do Plano Atual'}
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
                    <div className={`p-4 rounded-lg border ${personal.isExpired ? 'bg-red-100 border-red-300' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <CalendarDays className={`w-5 h-5 ${personal.isExpired ? 'text-red-600' : 'text-blue-600'}`} />
                        <Info className={`w-4 h-4 ${personal.isExpired ? 'text-red-400' : 'text-blue-400'}`} />
                      </div>
                      <p className={`text-sm font-medium ${personal.isExpired ? 'text-red-600' : 'text-blue-600'}`}>
                        {personal.isExpired ? 'Plano Expirado' : 'Plano Atual'}
                      </p>
                      <p className={`font-bold text-lg ${personal.isExpired ? 'text-red-800' : 'text-blue-800'}`}>
                        {currentPlanName}
                      </p>
                      {personal.planoId && (
                        <p className={`text-xs mt-1 ${personal.isExpired ? 'text-red-500' : 'text-blue-500'}`}>
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
                    
                    <div className={`p-4 rounded-lg border ${
                      personal.isExpired 
                        ? 'bg-red-100 border-red-300' 
                        : personal.percentualUso >= 90 
                          ? 'bg-red-50 border-red-200' 
                          : personal.percentualUso >= 70 
                            ? 'bg-yellow-50 border-yellow-200' 
                            : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        {personal.isExpired ? (
                          <X className="w-4 h-4 text-red-500" />
                        ) : (
                          getStatusIcon(personal.percentualUso)
                        )}
                        <Badge variant={
                          personal.isExpired ? 'destructive' :
                          personal.percentualUso >= 90 ? 'destructive' : 
                          personal.percentualUso >= 70 ? 'default' : 'secondary'
                        }>
                          {personal.isExpired ? 'Expirado' : getStatusText(personal.percentualUso)}
                        </Badge>
                      </div>
                      <p className={`text-sm font-medium ${
                        personal.isExpired ? 'text-red-600' : 
                        personal.percentualUso >= 90 ? 'text-red-600' : 
                        personal.percentualUso >= 70 ? 'text-yellow-600' : 'text-green-600'
                      }`}>Status</p>
                      <p className={`font-bold text-lg ${
                        personal.isExpired ? 'text-red-800' : 
                        personal.percentualUso >= 90 ? 'text-red-800' : 
                        personal.percentualUso >= 70 ? 'text-yellow-800' : 'text-green-800'
                      }`}>
                        {personal.isExpired ? 'Bloqueado' : `${personal.percentualUso}% usado`}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          personal.isExpired ? 'bg-red-500' : getStatusColor(personal.percentualUso)
                        }`} />
                        <Clock className="w-4 h-4 text-orange-400" />
                      </div>
                      <p className="text-sm text-orange-600 font-medium">Utilização</p>
                      <div className="mt-2">
                        <div className="w-full bg-orange-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-300 ${
                              personal.isExpired ? 'bg-red-500' : getStatusColor(personal.percentualUso)
                            }`}
                            style={{ 
                              width: personal.isExpired ? '100%' : `${Math.min(personal.percentualUso, 100)}%` 
                            }}
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

                  {/* Plan History/Dates - Always show if available */}
                  {(personal.dataInicio || personal.dataVencimento || detailedStatus?.currentPlan?.personalPlano) && (
                    <div className={`p-4 rounded-lg ${personal.isExpired ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${personal.isExpired ? 'text-red-600' : 'text-blue-600'}`} />
                        {personal.isExpired ? 'Histórico do Plano Expirado' : 'Datas do Plano'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {(personal.dataInicio || personal.dataVencimento || detailedStatus?.currentPlan?.personalPlano) && (
                          <div>
                            <span className={`${personal.isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                              {personal.isExpired ? 'Data de Início (Expirado):' : 'Início da Assinatura:'}
                            </span>
                            <p className="font-medium">
                              {personal.dataInicio 
                                ? new Date(personal.dataInicio).toLocaleDateString('pt-BR')
                                : new Date(detailedStatus.currentPlan.personalPlano.dataInicio).toLocaleDateString('pt-BR')
                              }
                            </p>
                          </div>
                        )}
                        {(personal.dataVencimento || detailedStatus?.currentPlan?.personalPlano?.dataVencimento) && (
                          <div>
                            <span className={`${personal.isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                              {personal.isExpired ? 'Data de Expiração:' : 'Fim da Assinatura:'}
                            </span>
                            <p className={`font-medium ${personal.isExpired ? 'text-red-700' : ''}`}>
                              {personal.dataVencimento 
                                ? new Date(personal.dataVencimento).toLocaleDateString('pt-BR')
                                : new Date(detailedStatus.currentPlan.personalPlano.dataVencimento).toLocaleDateString('pt-BR')
                              }
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Duration calculation for expired plans */}
                      {personal.isExpired && personal.dataInicio && personal.dataVencimento && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <div className="text-sm text-red-600">
                            <strong>Duração do plano:</strong> {' '}
                            {Math.ceil((new Date(personal.dataVencimento).getTime() - new Date(personal.dataInicio).getTime()) / (1000 * 60 * 60 * 24))} dias
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comprehensive Token Display Section */}
                  {(detailedStatus?.activeTokens?.length > 0 || detailedStatus?.expiredTokens?.length > 0) && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border">
                      <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Detalhes dos Tokens
                      </h4>

                      {/* Active Tokens Summary */}
                      {detailedStatus?.activeTokens?.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-green-800 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Tokens Ativos ({detailedStatus.activeTokens.length})
                            </h5>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {detailedStatus.totalActiveTokens || detailedStatus.activeTokens.reduce((sum, token) => sum + token.quantidade, 0)} tokens disponíveis
                            </Badge>
                          </div>
                          
                          <div className="grid gap-3">
                            {detailedStatus.activeTokens.map((token, index) => {
                              const createdDate = new Date(token.createdAt);
                              const expirationDate = new Date(token.dataVencimento);
                              const now = new Date();
                              const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              const isExpiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration > 0;
                              
                              return (
                                <div key={token._id || index} className={`p-4 rounded-lg border-2 ${
                                  isExpiringSoon 
                                    ? 'bg-yellow-50 border-yellow-200' 
                                    : 'bg-white border-green-200'
                                }`}>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${
                                        isExpiringSoon ? 'bg-yellow-500' : 'bg-green-500'
                                      }`} />
                                      <span className="font-medium">
                                        Token #{index + 1}
                                      </span>
                                      {isExpiringSoon && (
                                        <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                          Expira em {daysUntilExpiration} dia{daysUntilExpiration !== 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={`${
                                        isExpiringSoon 
                                          ? 'bg-yellow-600 hover:bg-yellow-700' 
                                          : 'bg-green-600 hover:bg-green-700'
                                      } text-white`}>
                                        {token.quantidade} token{token.quantidade !== 1 ? 's' : ''}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => initiateTokenDelete(token._id, token.quantidade)}
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        title="Remover token"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-gray-600 font-medium">Início:</span>
                                      <p className="text-gray-800">
                                        {createdDate.toLocaleDateString('pt-BR')} às {createdDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <div>
                                      <span className={`font-medium ${isExpiringSoon ? 'text-yellow-600' : 'text-gray-600'}`}>
                                        Expira em:
                                      </span>
                                      <p className={`${isExpiringSoon ? 'text-yellow-800 font-medium' : 'text-gray-800'}`}>
                                        {expirationDate.toLocaleDateString('pt-BR')} às {expirationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {(token.motivoAdicao || token.adicionadoPorAdmin) && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      {token.adicionadoPorAdmin && (
                                        <div className="mb-2">
                                          <span className="text-gray-600 text-sm">Adicionado por:</span>
                                          <p className="text-sm font-medium text-blue-700">
                                            {typeof token.adicionadoPorAdmin === 'object' 
                                              ? token.adicionadoPorAdmin.nome 
                                              : 'Admin'
                                            }
                                          </p>
                                        </div>
                                      )}
                                      {token.motivoAdicao && (
                                        <div>
                                          <span className="text-gray-600 text-sm">Motivo:</span>
                                          <p className="text-sm text-gray-700 italic">"{token.motivoAdicao}"</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Expired Tokens (Recent) */}
                      {detailedStatus?.expiredTokens?.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-red-800 flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              Tokens Expirados Recentes ({detailedStatus.expiredTokens.length})
                            </h5>
                            <Badge variant="destructive" className="bg-red-100 text-red-800">
                              Últimos 30 dias
                            </Badge>
                          </div>
                          
                          <div className="grid gap-3">
                            {detailedStatus.expiredTokens.slice(0, 3).map((token, index) => {
                              const createdDate = new Date(token.createdAt);
                              const expirationDate = new Date(token.dataVencimento);
                              
                              return (
                                <div key={token._id || index} className="p-4 rounded-lg border-2 bg-red-50 border-red-200 opacity-75">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-red-500" />
                                      <span className="font-medium text-red-800">
                                        Token #{index + 1} (Expirado)
                                      </span>
                                    </div>
                                    <Badge variant="destructive">
                                      {token.quantidade} token{token.quantidade !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className="text-red-600 font-medium">Início:</span>
                                      <p className="text-red-700">
                                        {createdDate.toLocaleDateString('pt-BR')}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-red-600 font-medium">Expirou em:</span>
                                      <p className="text-red-700 font-medium">
                                        {expirationDate.toLocaleDateString('pt-BR')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {(token.motivoAdicao || token.adicionadoPorAdmin) && (
                                    <div className="mt-3 pt-3 border-t border-red-200">
                                      {token.adicionadoPorAdmin && (
                                        <div className="mb-2">
                                          <span className="text-red-600 text-sm">Adicionado por:</span>
                                          <p className="text-sm font-medium text-red-700">
                                            {typeof token.adicionadoPorAdmin === 'object' 
                                              ? token.adicionadoPorAdmin.nome 
                                              : 'Admin'
                                            }
                                          </p>
                                        </div>
                                      )}
                                      {token.motivoAdicao && (
                                        <div>
                                          <span className="text-red-600 text-sm">Motivo:</span>
                                          <p className="text-sm text-red-700 italic">"{token.motivoAdicao}"</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            
                            {detailedStatus.expiredTokens.length > 3 && (
                              <div className="text-center py-2">
                                <p className="text-sm text-gray-500">
                                  ... e mais {detailedStatus.expiredTokens.length - 3} token{detailedStatus.expiredTokens.length - 3 !== 1 ? 's' : ''} expirado{detailedStatus.expiredTokens.length - 3 !== 1 ? 's' : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* No Tokens Message */}
                      {(!detailedStatus?.activeTokens?.length && !detailedStatus?.expiredTokens?.length) && (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <Info className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-600 font-medium">Nenhum token encontrado</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Este personal trainer não possui tokens ativos ou expirados recentes.
                          </p>
                        </div>
                      )}
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
              {personal?.hasActivePlan && !personal?.isExpired && (
                <Button 
                  variant="destructive"
                  onClick={() => setShowRemovePlanConfirm(true)}
                  disabled={loadingStatus}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover Plano
                </Button>
              )}
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

      {/* Plan Removal Confirmation Dialog */}
      <ModalConfirmacao
        isOpen={showRemovePlanConfirm}
        onClose={() => setShowRemovePlanConfirm(false)}
        onConfirm={handleRemovePlan}
        titulo="Remover Plano"
        mensagem={
          <div className="space-y-2">
            <p>Tem certeza que deseja remover o plano atual deste personal trainer?</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. O personal trainer ficará sem plano ativo.
              </p>
            </div>
          </div>
        }
        textoConfirmar="Remover Plano"
        textoCancelar="Cancelar"
        isLoadingConfirm={confirmLoading}
      />

      {/* Token Deletion Confirmation Dialog */}
      <ModalConfirmacao
        isOpen={showDeleteTokenConfirm}
        onClose={() => {
          setShowDeleteTokenConfirm(false);
          setTokenToDelete(null);
        }}
        onConfirm={handleDeleteToken}
        titulo="Remover Token"
        mensagem={
          <div className="space-y-2">
            <p>Tem certeza que deseja remover este token?</p>
            {tokenToDelete && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>Token:</strong> {tokenToDelete.quantidade} unidade{tokenToDelete.quantidade !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            )}
          </div>
        }
        textoConfirmar="Remover Token"
        textoCancelar="Cancelar"
        isLoadingConfirm={confirmLoading}
      />
    </Dialog>
  );
}