// client/src/pages/admin/GerenciarPlanosPersonalPage.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Search, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { PlanoModal } from '../../components/dialogs/admin/PlanoModal';
import { PersonalTrainerWithStatus, Plano, AssignPlanForm, AddTokensForm } from '../../../../shared/types/planos';

// Extended type for local state management with force update capability
interface PersonalTrainerWithStatusExtended extends PersonalTrainerWithStatus {
    _lastUpdated?: number;
}

export function GerenciarPlanosPersonalPage() {
    const [personalTrainers, setPersonalTrainers] = useState<PersonalTrainerWithStatusExtended[]>([]);
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPersonal, setSelectedPersonal] = useState<PersonalTrainerWithStatusExtended | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [forceRenderKey, setForceRenderKey] = useState(0);

    useEffect(() => {
        loadData();
        
        // Add keyboard shortcut for manual refresh (F5 or Ctrl+R)
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                event.preventDefault();
                console.log('🔄 Refresh manual detectado - recarregando dados...');
                loadData();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    const loadData = async (forceUpdate: boolean = false) => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            console.log(`🔄 Carregando dados do painel administrativo... [${timestamp}]`);
            
            const [personalResponse, planosResponse] = await Promise.all([
                fetch('/api/admin/personal-trainers', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                }),
                fetch('/api/admin/planos', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                })
            ]);

            if (personalResponse.ok) {
                const personalData = await personalResponse.json();
                console.log(`✅ Dados dos personal trainers carregados [${timestamp}]:`, personalData.length);
                
                // Force new object references to ensure React re-renders
                const freshPersonalData = personalData.map((pt: PersonalTrainerWithStatus) => ({ 
                    ...pt,
                    // Add timestamp to force updates if needed
                    _lastUpdated: timestamp
                }));
                
                console.log('🔄 Atualizando estado dos personal trainers...', {
                    previous: personalTrainers.length,
                    new: freshPersonalData.length,
                    forceUpdate,
                    timestamp
                });
                
                setPersonalTrainers(freshPersonalData);
                
                if (forceUpdate) {
                    setForceRenderKey(prev => prev + 1);
                    console.log('🔄 Force render aplicado:', forceRenderKey + 1);
                }
            } else {
                console.error('❌ Erro ao carregar personal trainers:', personalResponse.status);
            }

            if (planosResponse.ok) {
                const planosData = await planosResponse.json();
                console.log(`✅ Dados dos planos carregados [${timestamp}]:`, planosData.length);
                setPlanos(planosData);
            } else {
                console.error('❌ Erro ao carregar planos:', planosResponse.status);
            }
        } catch (error) {
            console.error('❌ Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignPlan = async (personalId: string, data: AssignPlanForm) => {
        try {
            console.log('🔄 Atribuindo plano...', { personalId, data });
            
            // Find the selected plan for optimistic update
            const selectedPlan = planos.find(p => p._id === data.planoId);
            if (!selectedPlan) {
                console.error('❌ Plano selecionado não encontrado');
                return;
            }
            
            // Optimistic update: immediately update the UI
            console.log('⚡ Aplicando atualização otimista...');
            setPersonalTrainers(prevPersonals => {
                const updatedPersonals = prevPersonals.map(personal => {
                    if (personal._id === personalId) {
                        const updatedPersonal = {
                            ...personal,
                            planoAtual: selectedPlan.nome,
                            planoId: selectedPlan._id,
                            planoDisplay: selectedPlan.nome,
                            limiteAlunos: selectedPlan.limiteAlunos,
                            hasActivePlan: true,
                            planDetails: {
                                id: selectedPlan._id,
                                nome: selectedPlan.nome,
                                limiteAlunos: selectedPlan.limiteAlunos,
                                preco: selectedPlan.preco,
                            },
                            // Recalculate usage percentage
                            percentualUso: personal.alunosAtivos > 0 ? 
                                Math.round((personal.alunosAtivos / selectedPlan.limiteAlunos) * 100) : 0,
                            _lastUpdated: Date.now() // Force new reference
                        };
                        console.log('⚡ Personal atualizado otimisticamente:', updatedPersonal);
                        return updatedPersonal;
                    }
                    return personal;
                });
                return updatedPersonals;
            });
            
            // Force re-render
            setForceRenderKey(prev => prev + 1);
            
            const response = await fetch(`/api/admin/personal/${personalId}/assign-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Plano atribuído com sucesso:', result);
                
                // Close modal first
                setModalOpen(false);
                setSelectedPersonal(null);
                
                // Wait a bit for database to process the transaction
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Then reload data to ensure synchronization with backend
                console.log('🔄 Recarregando dados para sincronização...');
                await loadData(true);
                
                // Show success feedback
                console.log('✅ Dados recarregados e sincronizados após atribuição de plano');
            } else {
                const error = await response.json();
                console.error('❌ Error assigning plan:', error.message);
                
                // Revert optimistic update on error
                console.log('🔄 Revertendo atualização otimista devido ao erro...');
                await loadData(true);
                
                alert(`Erro ao atribuir plano: ${error.message}`);
            }
        } catch (error) {
            console.error('❌ Error assigning plan:', error);
            
            // Revert optimistic update on error
            console.log('🔄 Revertendo atualização otimista devido ao erro...');
            await loadData(true);
            
            alert('Erro ao atribuir plano. Tente novamente.');
        }
    };

    const handleAddTokens = async (personalId: string, data: AddTokensForm) => {
        try {
            console.log('🔄 Adicionando tokens...', { personalId, data });
            
            // Optimistic update: immediately update the UI with additional limit
            console.log('⚡ Aplicando atualização otimista para tokens...');
            setPersonalTrainers(prevPersonals => {
                const updatedPersonals = prevPersonals.map(personal => {
                    if (personal._id === personalId) {
                        const newLimit = personal.limiteAlunos + data.quantidade;
                        const updatedPersonal = {
                            ...personal,
                            limiteAlunos: newLimit,
                            // Recalculate usage percentage with new limit
                            percentualUso: personal.alunosAtivos > 0 ? 
                                Math.round((personal.alunosAtivos / newLimit) * 100) : 0,
                            _lastUpdated: Date.now() // Force new reference
                        };
                        console.log('⚡ Personal atualizado otimisticamente com tokens:', updatedPersonal);
                        return updatedPersonal;
                    }
                    return personal;
                });
                return updatedPersonals;
            });
            
            // Force re-render
            setForceRenderKey(prev => prev + 1);
            
            const response = await fetch(`/api/admin/personal/${personalId}/add-tokens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Tokens adicionados com sucesso:', result);
                
                // Close modal first
                setModalOpen(false);
                setSelectedPersonal(null);
                
                // Wait a bit for database to process the transaction
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Then reload data to ensure synchronization with backend
                console.log('🔄 Recarregando dados para sincronização...');
                await loadData(true);
                
                // Show success feedback
                console.log('✅ Dados recarregados e sincronizados após adição de tokens');
            } else {
                const error = await response.json();
                console.error('❌ Error adding tokens:', error.message);
                
                // Revert optimistic update on error
                console.log('🔄 Revertendo atualização otimista devido ao erro...');
                await loadData(true);
                
                alert(`Erro ao adicionar tokens: ${error.message}`);
            }
        } catch (error) {
            console.error('❌ Error adding tokens:', error);
            
            // Revert optimistic update on error
            console.log('🔄 Revertendo atualização otimista devido ao erro...');
            await loadData(true);
            
            alert('Erro ao adicionar tokens. Tente novamente.');
        }
    };

    const openModal = (personal: PersonalTrainerWithStatusExtended) => {
        setSelectedPersonal(personal);
        setModalOpen(true);
    };

    const filteredPersonals = personalTrainers.filter(personal =>
        personal.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        personal.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (percentual: number) => {
        if (percentual >= 90) {
            return <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Crítico
            </Badge>;
        }
        if (percentual >= 70) {
            return <Badge variant="default" className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Atenção
            </Badge>;
        }
        return <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Normal
        </Badge>;
    };

    const stats = {
        total: personalTrainers.length,
        critical: personalTrainers.filter(p => p.percentualUso >= 90).length,
        attention: personalTrainers.filter(p => p.percentualUso >= 70 && p.percentualUso < 90).length,
        normal: personalTrainers.filter(p => p.percentualUso < 70).length,
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p>Carregando dados...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Gerenciar Planos dos Personal Trainers</h1>
                        <p className="text-gray-600 mt-1">
                            Gerencie os planos e tokens dos personal trainers cadastrados no sistema
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => loadData(true)}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Atualizando...' : 'Atualizar'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Personals</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status Crítico</CardTitle>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                        <p className="text-xs text-muted-foreground">≥90% de utilização</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Necessita Atenção</CardTitle>
                        <Clock className="w-4 h-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.attention}</div>
                        <p className="text-xs text-muted-foreground">70-89% de utilização</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status Normal</CardTitle>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
                        <p className="text-xs text-muted-foreground">&lt;70% de utilização</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Personal Trainers List */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Trainers ({filteredPersonals.length})</CardTitle>
                    <CardDescription>
                        Lista de todos os personal trainers com seus status de planos atuais
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredPersonals.map((personal) => (
                            <div
                                key={`${personal._id}-${forceRenderKey}-${personal._lastUpdated || Date.now()}`}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold">{personal.nome}</h3>
                                        {getStatusBadge(personal.percentualUso)}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">{personal.email}</p>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {personal.alunosAtivos}/{personal.limiteAlunos} alunos
                                        </span>
                                        <span>Plano: {personal.planoAtual || 'Sem plano'}</span>
                                        <span>Utilização: {personal.percentualUso ?? 0}%</span>
                                        {process.env.NODE_ENV === 'development' && (
                                            <span className="text-xs text-gray-400">
                                                [Key: {forceRenderKey}, Updated: {personal._lastUpdated ? new Date(personal._lastUpdated).toLocaleTimeString() : 'N/A'}]
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {/* Usage Progress Bar */}
                                    <div className="w-24">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all ${
                                                    personal.percentualUso >= 90 ? 'bg-red-500' :
                                                    personal.percentualUso >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(personal.percentualUso, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openModal(personal)}
                                    >
                                        Gerenciar
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {filteredPersonals.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                {searchTerm ? 'Nenhum personal encontrado para a busca.' : 'Nenhum personal trainer cadastrado.'}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Modal */}
            <PlanoModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                personal={selectedPersonal}
                planos={planos}
                onAssignPlan={handleAssignPlan}
                onAddTokens={handleAddTokens}
            />
        </div>
    );
}

export default GerenciarPlanosPersonalPage;