// client/src/pages/admin/GerenciarPlanosPersonalPage.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Search, Users, TrendingUp, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { PlanoModal } from '../../components/dialogs/admin/PlanoModal';
import { PersonalTrainerWithStatus, AssignPlanForm, AddTokensForm } from '../../../../shared/types/planos';
import { usePersonalTrainers } from '../../hooks/usePersonalTrainers';

export function GerenciarPlanosPersonalPage() {
    // Use the new custom hook for centralized state management
    const {
        personalTrainers,
        planos,
        loading,
        error,
        fetchPersonals,
        assignPlan,
        addTokens,
        clearError
    } = usePersonalTrainers();

    // Local UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPersonal, setSelectedPersonal] = useState<PersonalTrainerWithStatus | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        // Load initial data
        fetchPersonals();
        
        // Add keyboard shortcut for manual refresh (F5 or Ctrl+R)
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                event.preventDefault();
                console.log('🔄 Refresh manual detectado - recarregando dados...');
                fetchPersonals();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [fetchPersonals]);

    const handleAssignPlan = async (personalId: string, data: AssignPlanForm) => {
        try {
            await assignPlan(personalId, data);
            
            // Close modal after successful operation
            setModalOpen(false);
            setSelectedPersonal(null);
        } catch (error) {
            // Error handling is done in the hook, just keep modal open for retry
            console.error('❌ Error in handleAssignPlan:', error);
        }
    };

    const handleAddTokens = async (personalId: string, data: AddTokensForm) => {
        try {
            await addTokens(personalId, data);
            
            // Close modal after successful operation
            setModalOpen(false);
            setSelectedPersonal(null);
        } catch (error) {
            // Error handling is done in the hook, just keep modal open for retry
            console.error('❌ Error in handleAddTokens:', error);
        }
    };

    const openModal = (personal: PersonalTrainerWithStatus) => {
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
                        onClick={fetchPersonals}
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
                                key={personal._id}
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