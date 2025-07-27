// client/src/pages/admin/GerenciarPlanosPersonalPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, RefreshCw, Crown, Mail, User } from 'lucide-react';
import { PlanoModal } from '../../components/dialogs/admin/PlanoModal';
import { PersonalTrainerWithStatus, AssignPlanForm, AddTokensForm } from '../../../../shared/types/planos';
import { usePersonalTrainers } from '../../hooks/usePersonalTrainers';

export function GerenciarPlanosPersonalPage() {
    // Use the new custom hook for centralized state management
    const {
        personalTrainers,
        planos,
        loading,
        fetchPersonals,
        assignPlan,
        addTokens,
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
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Personal Trainers
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Gerencie os planos dos personal trainers de forma simples e moderna
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchPersonals}
                    disabled={loading}
                    className="flex items-center gap-2 hover:bg-blue-50 border-blue-200"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Atualizando...' : 'Atualizar'}
                </Button>
            </div>

            {/* Search */}
            <Card className="border-blue-100 shadow-sm">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar por nome ou email..."
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
                        {filteredPersonals.map((personal) => (
                            <Card 
                                key={personal._id} 
                                className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-gradient-to-br from-white to-blue-50/30"
                            >
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {/* Name */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                                {personal.nome.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
                                                    {personal.nome}
                                                </h3>
                                            </div>
                                        </div>
                                        
                                        {/* Email */}
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Mail className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm truncate">{personal.email}</span>
                                        </div>
                                        
                                        {/* Plan */}
                                        <div className="flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-purple-500" />
                                            <span className="text-sm font-medium text-gray-700">
                                                {personal.planoDisplay || personal.planDetails?.nome || 'Sem Plano Ativo'}
                                            </span>
                                        </div>
                                        
                                        {/* Action Button */}
                                        <div className="pt-2">
                                            <Button
                                                onClick={() => openModal(personal)}
                                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                                size="sm"
                                            >
                                                Gerenciar Plano
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

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
