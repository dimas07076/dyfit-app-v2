#!/usr/bin/env node
// test-plans.js - Test script to verify plan lookup logic

import mongoose from 'mongoose';
import PlanoService from './server/services/PlanoService.js';
import Plano from './server/models/Plano.js';
import PersonalPlano from './server/models/PersonalPlano.js';
import PersonalTrainer from './server/models/PersonalTrainer.js';

const MONGODB_URI = 'mongodb://localhost:27017/dyfit-test';

async function runTest() {
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

        // Initialize plans
        console.log('\n📋 Inicializando planos...');
        await PlanoService.ensureInitialPlansExist();
        
        // Get all plans
        const plans = await PlanoService.getAllPlans();
        console.log(`✅ Encontrados ${plans.length} planos:`);
        plans.forEach(plan => {
            console.log(`  - ${plan.nome} (${plan._id}): ${plan.limiteAlunos} alunos, R$${plan.preco}`);
        });

        // Create a test personal trainer if none exists
        let testPersonal = await PersonalTrainer.findOne({ email: 'test@example.com' });
        if (!testPersonal) {
            console.log('\n👤 Criando personal trainer de teste...');
            testPersonal = new PersonalTrainer({
                nome: 'Personal de Teste',
                email: 'test@example.com',
                passwordHash: 'test-hash',
                role: 'Personal Trainer'
            });
            await testPersonal.save();
            console.log(`✅ Personal criado: ${testPersonal.nome} (${testPersonal._id})`);
        } else {
            console.log(`\n👤 Personal existente: ${testPersonal.nome} (${testPersonal._id})`);
        }

        // Check if this personal has any plan
        console.log('\n🔍 Verificando plano atual...');
        const status = await PlanoService.getPersonalCurrentPlan(testPersonal._id.toString());
        
        console.log('📊 Status atual:', {
            planoNome: status.plano?.nome || 'Sem plano',
            planoId: status.plano?._id || null,
            limiteAtual: status.limiteAtual,
            alunosAtivos: status.alunosAtivos,
            tokensAvulsos: status.tokensAvulsos
        });

        // If no plan, assign one for testing
        if (!status.plano && plans.length > 0) {
            console.log('\n🎯 Atribuindo plano de teste...');
            const startPlan = plans.find(p => p.nome === 'Start') || plans[0];
            
            await PlanoService.assignPlanToPersonal(
                testPersonal._id.toString(),
                startPlan._id.toString(),
                testPersonal._id.toString(), // Use same ID as admin for test
                undefined,
                'Teste de atribuição automática'
            );
            
            console.log(`✅ Plano "${startPlan.nome}" atribuído!`);
            
            // Check status again
            console.log('\n🔍 Verificando plano após atribuição...');
            const newStatus = await PlanoService.getPersonalCurrentPlan(testPersonal._id.toString());
            
            console.log('📊 Novo status:', {
                planoNome: newStatus.plano?.nome || 'Sem plano',
                planoId: newStatus.plano?._id || null,
                limiteAtual: newStatus.limiteAtual,
                alunosAtivos: newStatus.alunosAtivos,
                tokensAvulsos: newStatus.tokensAvulsos
            });
        }

        console.log('\n✅ Teste completo!');
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔗 Desconectado do MongoDB');
        process.exit(0);
    }
}

runTest();