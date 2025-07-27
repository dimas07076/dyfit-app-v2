#!/usr/bin/env node
// test-api-direct.mjs - Test the admin API directly

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/dyfit-test';

async function testApiLogic() {
    try {
        console.log('🔗 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            dbName: "dyfit-test"
        });
        
        console.log('✅ Conectado ao MongoDB!');

        // Import the built services
        const PlanoService = await import('./dist/services/PlanoService.js');
        const PersonalTrainer = (await import('./dist/models/PersonalTrainer.js')).default;
        const Aluno = (await import('./dist/models/Aluno.js')).default;

        console.log('\n🔍 Simulando a lógica do adminPlanosRoutes...');

        // Get personal trainers (simulating the route logic)
        const personalTrainers = await PersonalTrainer.find({ 
            role: 'Personal Trainer' 
        }).select('nome email createdAt statusAssinatura limiteAlunos dataInicioAssinatura dataFimAssinatura planoId');

        console.log(`✅ Encontrados ${personalTrainers.length} personal trainers.`);

        if (personalTrainers.length === 0) {
            console.log('⚠️ Nenhum personal trainer encontrado.');
            return;
        }

        // Process each personal trainer (simulating the Promise.all logic)
        for (const personal of personalTrainers) {
            const personalId = personal._id?.toString();
            if (!personalId) continue;
            
            console.log(`\n🔍 [API Test] Processando personal: ${personal.nome} (${personalId})`);
            
            try {
                const status = await PlanoService.default.getPersonalCurrentPlan(personalId);
                
                console.log(`📊 [API Test] Status retornado pelo PlanoService para ${personal.nome}:`, {
                    plano: status.plano ? {
                        _id: status.plano._id,
                        nome: status.plano.nome,
                        limiteAlunos: status.plano.limiteAlunos
                    } : null,
                    personalPlano: status.personalPlano ? {
                        _id: status.personalPlano._id,
                        planoId: status.personalPlano.planoId
                    } : null,
                    limiteAtual: status.limiteAtual,
                    alunosAtivos: status.alunosAtivos,
                    tokensAvulsos: status.tokensAvulsos
                });
                
                const planoNome = (status.plano && status.plano.nome) ? status.plano.nome : 'Sem plano';
                const planoId = (status.plano && status.plano._id) ? status.plano._id : null;
                const planoDisplay = (status.plano && status.plano.nome) ? 
                    status.plano.nome : 
                    'Sem plano';
                
                const personalData = {
                    _id: personal._id,
                    nome: personal.nome,
                    email: personal.email,
                    createdAt: personal.createdAt,
                    planoId: planoId, // Use the planoId from the actual status

                    planoAtual: planoNome, 
                    planoDisplay: planoDisplay, 
                    alunosAtivos: status.alunosAtivos,
                    limiteAlunos: status.limiteAtual, 
                    percentualUso: status.limiteAtual > 0 ? Math.round((status.alunosAtivos / status.limiteAtual) * 100) : 0,
                    hasActivePlan: !!(status.plano && status.plano.nome),
                    planDetails: (status.plano && status.plano.nome) ? {
                        id: status.plano._id,
                        nome: status.plano.nome,
                        limiteAlunos: status.plano.limiteAlunos,
                        preco: status.plano.preco
                    } : null
                };

                console.log(`✅ [API Test] Dados finais para ${personal.nome}:`, {
                    planoAtual: personalData.planoAtual,
                    planoDisplay: personalData.planoDisplay,
                    planoId: personalData.planoId,
                    hasActivePlan: personalData.hasActivePlan,
                    planDetails: personalData.planDetails ? personalData.planDetails.nome : null
                });

                // This is what should be returned by the API
                if (personalData.planoAtual !== 'Sem plano') {
                    console.log(`🎉 SUCESSO! Personal ${personal.nome} tem plano: ${personalData.planoAtual}`);
                } else {
                    console.log(`❌ PROBLEMA! Personal ${personal.nome} ainda mostra "Sem plano"`);
                }

            } catch (error) {
                console.error(`❌ Erro ao processar personal ${personal.nome}:`, error);
            }
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔗 Desconectado do MongoDB');
        process.exit(0);
    }
}

testApiLogic();