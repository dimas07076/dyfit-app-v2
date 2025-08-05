// client/src/pages/admin/EnhancedGerenciarPlanosPersonalPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Search, RefreshCw, Mail, User, AlertCircle, CheckCircle, Clock, Users, Trophy, Zap, Calendar, X } from 'lucide-react';
import { PlanoModal } from '../../components/dialogs/admin/PlanoModal';
import { PersonalTrainerWithStatus, AssignPlanForm, AddTokensForm } from '../../../../shared/types/planos';
import { usePersonalTrainers } from '../../hooks/usePersonalTrainers';
import { Badge } from '../../components/ui/badge';

export function GerenciarPlanosPersonalPage() {
    // Use the enhanced custom hook for centralized state management
    const {
        personalTrainers,
        planos,
        loading,
        error,
        lastUpdated,
        fetchData,
        assignPlan,
        addTokens,
        clearError,
        getPlanNameById,
        getPlanById,
    } = usePersonalTrainers();

    // Local UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPersonal, setSelectedPersonal] = useState<PersonalTrainerWithStatus | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        // Load initial data
        fetchData();
        
        // Add keyboard shortcut for manual refresh (F5 or Ctrl+R)
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                event.preventDefault();
                console.log('🔄 Manual refresh detected - reloading data...');
                fetchData();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [fetchData]);

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
        personal.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPlanNameById(personal.planoId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusIcon = (percentual: number) => {
        if (percentual >= 90) return <AlertCircle className="w-4 h-4 text-red-500" />;
        if (percentual >= 70) return <Clock className="w-4 h-4 text-yellow-500" />;
        return <CheckCircle className="w-4 h-4 text-green-500" />;
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

    const getPlanBadgeVariant = (planName: string, isExpired: boolean) => {
        if (isExpired) return 'destructive';
        if (planName === 'Sem plano') return 'outline';
        if (planName === 'Free') return 'secondary';
        return 'default';
    };

    const getCardClasses = (isExpired: boolean) => {
        if (isExpired) {
            return "group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-red-300 bg-gradient-to-br from-red-50 to-red-100/50 relative overflow-hidden";
        }
        return "group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-gradient-to-br from-white to-blue-50/30 relative overflow-hidden";
    };

    const getStatusIndicatorColor = (percentual: number, isExpired: boolean) => {
        if (isExpired) return 'bg-red-500';
        if (percentual >= 90) return 'bg-red-500';
        if (percentual >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // Statistics
    const stats = {
        total: personalTrainers.length,
        withPlans: personalTrainers.filter(p => p.hasActivePlan).length,
        expired: personalTrainers.filter(p => p.isExpired).length,
        critical: personalTrainers.filter(p => p.percentualUso >= 90 && !p.isExpired).length,
        warning: personalTrainers.filter(p => p.percentualUso >= 70 && p.percentualUso < 90 && !p.isExpired).length,
    };

    if (loading && personalTrainers.length === 0) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-lg font-medium">Carregando dados...</p>
                        <p className="text-sm text-gray-500 mt-1">Buscando personal trainers e planos</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Gerenciar Planos
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Gerencie os planos dos personal trainers de forma simples e moderna
                    </p>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">
                            Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
                        </p>
                    )}
                </div>
                <Button
                    variant="outline"
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 hover:bg-blue-50 border-blue-200"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Atualizando...' : 'Atualizar'}
                </Button>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>{error}</span>
                        <Button variant="outline" size="sm" onClick={clearError}>
                            Dismiss
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600">Total</p>
                                <p className="text-2xl font-bold text-blue-800">{stats.total}</p>
                            </div>
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600">Com Planos</p>
                                <p className="text-2xl font-bold text-green-800">{stats.withPlans}</p>
                            </div>
                            <Trophy className="w-8 h-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-600">Expirados</p>
                                <p className="text-2xl font-bold text-red-800">{stats.expired}</p>
                            </div>
                            <Calendar className="w-8 h-8 text-red-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-yellow-600">Atenção</p>
                                <p className="text-2xl font-bold text-yellow-800">{stats.warning}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600">Crítico</p>
                                <p className="text-2xl font-bold text-orange-800">{stats.critical}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-orange-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card className="border-blue-100 shadow-sm">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar por nome, email ou plano..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Personal Trainers Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Personal Trainers ({filteredPersonals.length})
                    </h2>
                    {searchTerm && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSearchTerm('')}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            Limpar filtro
                        </Button>
                    )}
                </div>

                {filteredPersonals.length === 0 ? (
                    <Card className="border-gray-200">
                        <CardContent className="py-16">
                            <div className="text-center text-gray-500">
                                <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium mb-2">
                                    {searchTerm ? 'Nenhum personal encontrado' : 'Nenhum personal trainer cadastrado'}
                                </p>
                                <p className="text-sm">
                                    {searchTerm ? 'Tente ajustar sua busca.' : 'Quando você adicionar personal trainers, eles aparecerão aqui.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredPersonals.map((personal) => {
                            const planName = getPlanNameById(personal.planoId);
                            const plan = getPlanById(personal.planoId);
                            
                            return (
                                <Card 
                                    key={personal._id} 
                                    className={getCardClasses(personal.isExpired)}
                                >
                                    {/* Status indicator - red for expired plans */}
                                    <div className={`absolute top-0 left-0 w-full h-1 ${getStatusIndicatorColor(personal.percentualUso, personal.isExpired)}`} />
                                    
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            {/* Header with avatar and name */}
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                                                    personal.isExpired 
                                                        ? 'bg-gradient-to-br from-red-500 to-red-700' 
                                                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                                                }`}>
                                                    {personal.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className={`font-semibold text-lg transition-colors ${
                                                        personal.isExpired 
                                                            ? 'text-red-800 group-hover:text-red-900' 
                                                            : 'text-gray-800 group-hover:text-blue-600'
                                                    }`}>
                                                        {personal.nome}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Mail className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500 truncate">{personal.email}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expired Plan Badge */}
                                            {personal.isExpired && (
                                                <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                                                    <X className="w-4 h-4 text-red-600" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-red-800">Plano Expirado</p>
                                                        {personal.dataVencimento && (
                                                            <p className="text-xs text-red-600">
                                                                Venceu em: {new Date(personal.dataVencimento).toLocaleDateString('pt-BR')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Plan Information */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Plano Atual</span>
                                                    <Badge variant={getPlanBadgeVariant(planName, personal.isExpired)} className="text-xs">
                                                        {planName}
                                                    </Badge>
                                                </div>
                                                
                                                {plan && (
                                                    <div className="text-xs text-gray-500 grid grid-cols-2 gap-2">
                                                        <div>Limite: {plan.limiteAlunos}</div>
                                                        <div>Preço: R$ {plan.preco.toFixed(2)}</div>
                                                    </div>
                                                )}

                                                {/* Plan Dates for Expired Plans */}
                                                {personal.isExpired && personal.dataInicio && personal.dataVencimento && (
                                                    <div className="text-xs text-gray-500 grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                                                        <div>
                                                            <span className="text-gray-400">Início:</span><br/>
                                                            {new Date(personal.dataInicio).toLocaleDateString('pt-BR')}
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">Fim:</span><br/>
                                                            {new Date(personal.dataVencimento).toLocaleDateString('pt-BR')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Usage Stats */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-blue-500" />
                                                        <span className="text-gray-600">Alunos</span>
                                                    </div>
                                                    <span className="font-medium">
                                                        {personal.alunosAtivos}/{personal.limiteAlunos}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(personal.percentualUso)}
                                                            <span className="text-gray-600">Status</span>
                                                        </div>
                                                        <span className="font-medium">
                                                            {personal.isExpired ? 'Expirado' : `${personal.percentualUso}%`}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full transition-all duration-300 ${getStatusIndicatorColor(personal.percentualUso, personal.isExpired)}`}
                                                            style={{ 
                                                                width: personal.isExpired ? '100%' : `${Math.min(personal.percentualUso, 100)}%` 
                                                            }}
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex justify-between text-xs text-gray-500">
                                                        <span>0</span>
                                                        <span className="font-medium">
                                                            {personal.isExpired ? 'Expirado' : getStatusText(personal.percentualUso)}
                                                        </span>
                                                        <span>{personal.isExpired ? 'Renovar' : '100%'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Action Button */}
                                            <div className="pt-2">
                                                <Button
                                                    onClick={() => openModal(personal)}
                                                    className={`w-full border-0 shadow-md hover:shadow-lg transition-all duration-200 ${
                                                        personal.isExpired
                                                            ? 'bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white'
                                                            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                                                    }`}
                                                    size="sm"
                                                >
                                                    <Zap className="w-4 h-4 mr-2" />
                                                    {personal.isExpired ? 'Renovar Plano' : 'Gerenciar Plano'}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Enhanced Modal */}
            <PlanoModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                personal={selectedPersonal}
                planos={planos}
                onAssignPlan={handleAssignPlan}
                onAddTokens={handleAddTokens}
                getPlanNameById={getPlanNameById}
                getPlanById={getPlanById}
            />
        </div>
    );
}

export default GerenciarPlanosPersonalPage;