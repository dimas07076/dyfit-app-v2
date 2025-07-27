#!/usr/bin/env node
// simple-test.mjs - Simple test to verify the fix

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/dyfit-test';

async function runSimpleTest() {
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

        // Create collections and test data manually
        const planos = mongoose.connection.collection('planos');
        const personaltrainers = mongoose.connection.collection('personaltrainers');
        const personalplanos = mongoose.connection.collection('personalplanos');

        // Insert a test plan
        const startPlan = {
            _id: new mongoose.Types.ObjectId(),
            nome: 'Start',
            descricao: 'Plano inicial para até 5 alunos ativos',
            limiteAlunos: 5,
            preco: 29.90,
            duracao: 30,
            tipo: 'paid',
            ativo: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await planos.deleteMany({}); // Clear existing
        await planos.insertOne(startPlan);
        console.log('✅ Plano de teste inserido:', startPlan.nome);

        // Insert a test personal trainer
        const testPersonal = {
            _id: new mongoose.Types.ObjectId(),
            nome: 'João Personal',
            email: 'joao@example.com',
            passwordHash: 'test-hash',
            role: 'Personal Trainer',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await personaltrainers.deleteMany({}); // Clear existing
        await personaltrainers.insertOne(testPersonal);
        console.log('✅ Personal trainer de teste inserido:', testPersonal.nome);

        // Insert a PersonalPlano linking them
        const testPersonalPlano = {
            _id: new mongoose.Types.ObjectId(),
            personalTrainerId: testPersonal._id,
            planoId: startPlan._id,
            dataInicio: new Date(),
            dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            ativo: true,
            atribuidoPorAdmin: testPersonal._id,
            motivoAtribuicao: 'Teste inicial',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await personalplanos.deleteMany({}); // Clear existing
        await personalplanos.insertOne(testPersonalPlano);
        console.log('✅ PersonalPlano de teste inserido');

        console.log('\n📊 Dados de teste criados:');
        console.log(`  Personal: ${testPersonal.nome} (${testPersonal._id})`);
        console.log(`  Plano: ${startPlan.nome} (${startPlan._id})`);
        console.log(`  PersonalPlano: ${testPersonalPlano._id}`);
        
        console.log('\n🎯 Agora você pode testar a API!');
        console.log(`curl -X GET "http://localhost:5000/api/admin/personal-trainers" -H "Authorization: Bearer <token>"`);
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔗 Desconectado do MongoDB');
        process.exit(0);
    }
}

runSimpleTest();