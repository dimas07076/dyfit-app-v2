// Test component to verify plan name display functionality
import React from 'react';
import { PersonalTrainerWithStatus } from '../../../../../shared/types/planos';

// Mock data for testing
const mockPersonalTrainers: PersonalTrainerWithStatus[] = [
    {
        _id: "1",
        nome: "João Silva",
        email: "joao@example.com",
        createdAt: new Date(),
        planoAtual: "Start",
        planoId: "plan_start",
        planoDisplay: "Start", 
        alunosAtivos: 3,
        limiteAlunos: 5,
        percentualUso: 60,
        hasActivePlan: true,
        planDetails: {
            id: "plan_start",
            nome: "Start",
            limiteAlunos: 5,
            preco: 29.90
        }
    },
    {
        _id: "2", 
        nome: "Maria Santos",
        email: "maria@example.com",
        createdAt: new Date(),
        planoAtual: "Pro",
        planoId: "plan_pro",
        planoDisplay: "Pro",
        alunosAtivos: 12,
        limiteAlunos: 15,
        percentualUso: 80,
        hasActivePlan: true,
        planDetails: {
            id: "plan_pro",
            nome: "Pro", 
            limiteAlunos: 15,
            preco: 59.90
        }
    },
    {
        _id: "3",
        nome: "Pedro Costa", 
        email: "pedro@example.com",
        createdAt: new Date(),
        planoAtual: "Premium",
        planoId: "plan_premium",
        planoDisplay: "Premium",
        alunosAtivos: 28,
        limiteAlunos: 30,
        percentualUso: 93,
        hasActivePlan: true,
        planDetails: {
            id: "plan_premium",
            nome: "Premium",
            limiteAlunos: 30,
            preco: 99.90
        }
    },
    {
        _id: "4",
        nome: "Ana Lima",
        email: "ana@example.com", 
        createdAt: new Date(),
        planoAtual: "Sem plano",
        planoId: null,
        planoDisplay: "Sem plano",
        alunosAtivos: 0,
        limiteAlunos: 0,
        percentualUso: 0,
        hasActivePlan: false,
        planDetails: null
    }
];

export function TestPlanDisplay() {
    console.log('🧪 [TestPlanDisplay] Testando display dos planos com dados mock:', mockPersonalTrainers);
    
    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Test: Personal Trainer Plan Display</h1>
            <p>Esta página testa a exibição dos nomes dos planos nos cards dos personal trainers.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {mockPersonalTrainers.map((personal) => {
                    // Simulate the plan display logic from the main component
                    const getPlanDisplayInfo = () => {
                        console.log(`📋 [TestPlanDisplay] Calculando info do plano para ${personal.nome}:`, {
                            planoDisplay: personal.planoDisplay,
                            planoAtual: personal.planoAtual,
                            planDetails: personal.planDetails,
                            hasActivePlan: personal.hasActivePlan
                        });
                        
                        if (personal.planDetails && personal.planDetails.nome) {
                            console.log(`✅ [TestPlanDisplay] Usando planDetails.nome: "${personal.planDetails.nome}"`);
                            return {
                                name: personal.planDetails.nome,
                                hasActivePlan: true,
                                color: '#10B981' // green
                            };
                        }
                        
                        if (personal.planoDisplay && personal.planoDisplay !== 'Sem plano') {
                            console.log(`✅ [TestPlanDisplay] Usando planoDisplay: "${personal.planoDisplay}"`);
                            return {
                                name: personal.planoDisplay,
                                hasActivePlan: personal.hasActivePlan,
                                color: personal.hasActivePlan ? '#10B981' : '#6B7280'
                            };
                        }
                        
                        if (personal.planoAtual && personal.planoAtual !== 'Sem plano') {
                            console.log(`✅ [TestPlanDisplay] Usando planoAtual: "${personal.planoAtual}"`);
                            return {
                                name: personal.planoAtual,
                                hasActivePlan: personal.hasActivePlan,
                                color: personal.hasActivePlan ? '#10B981' : '#6B7280'
                            };
                        }
                        
                        console.log(`⚠️ [TestPlanDisplay] Nenhum plano encontrado, usando "Sem plano"`);
                        return {
                            name: 'Sem plano',
                            hasActivePlan: false,
                            color: '#9CA3AF'
                        };
                    };
                    
                    const planInfo = getPlanDisplayInfo();
                    
                    return (
                        <div key={personal._id} style={{
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            padding: '20px',
                            background: 'linear-gradient(to bottom right, white, #EFF6FF)',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.3s ease'
                        }}>
                            {/* Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px', 
                                    borderRadius: '50%',
                                    background: 'linear-gradient(to bottom right, #3B82F6, #8B5CF6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '14px'
                                }}>
                                    {personal.nome.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1F2937' }}>
                                        {personal.nome}
                                    </h3>
                                </div>
                            </div>
                            
                            {/* Email */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#6B7280' }}>
                                <span style={{ fontSize: '14px' }}>📧</span>
                                <span style={{ fontSize: '14px' }}>{personal.email}</span>
                            </div>
                            
                            {/* Plan Information */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#6B7280' }}>
                                <span style={{ fontSize: '14px' }}>💳</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px' }}>Plano:</span>
                                    <span style={{
                                        backgroundColor: planInfo.color,
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                    }}>
                                        {planInfo.name}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Usage Information */}
                            {planInfo.hasActivePlan && (
                                <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span>Utilização:</span>
                                        <span style={{ fontWeight: '500' }}>
                                            {personal.alunosAtivos || 0}/{personal.limiteAlunos || 0} alunos
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        backgroundColor: '#E5E7EB',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(personal.percentualUso || 0, 100)}%`,
                                            backgroundColor: 
                                                (personal.percentualUso || 0) >= 90 ? '#EF4444' :
                                                (personal.percentualUso || 0) >= 70 ? '#F59E0B' : 
                                                '#10B981',
                                            transition: 'all 0.3s ease'
                                        }} />
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                                        {personal.percentualUso || 0}% utilizado
                                    </div>
                                </div>
                            )}
                            
                            {/* Action Button */}
                            <button style={{
                                width: '100%',
                                padding: '8px 16px',
                                background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }} onClick={() => {
                                console.log(`🔄 [TestPlanDisplay] Abrindo modal para ${personal.nome}`);
                                alert(`Gerenciar plano para ${personal.nome}\nPlano atual: ${planInfo.name}`);
                            }}>
                                Gerenciar Plano
                            </button>
                        </div>
                    );
                })}
            </div>
            
            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                <h2>Debug Information</h2>
                <p>Esta página demonstra que a UI deve mostrar:</p>
                <ul>
                    <li>✅ Nome e email do personal trainer</li>
                    <li>✅ Nome do plano atual (ex: "Start", "Pro", "Premium", ou "Sem plano")</li>
                    <li>✅ Estatísticas de uso (alunos ativos / limite)</li>
                    <li>✅ Barra visual de uso com códigos de cor</li>
                    <li>✅ Porcentagem de utilização do plano</li>
                </ul>
                <p><strong>Abra o console do navegador para ver os logs de debug.</strong></p>
            </div>
        </div>
    );
}