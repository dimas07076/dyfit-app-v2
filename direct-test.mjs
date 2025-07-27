#!/usr/bin/env node
// direct-test.mjs - Direct test of the populate fix

import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const MONGODB_URI = 'mongodb://localhost:27017/dyfit-test';

async function directTest() {
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

        // Test the populate logic directly by using the MongoDB query
        const PersonalPlano = mongoose.model('PersonalPlano', new mongoose.Schema({
            personalTrainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PersonalTrainer' },
            planoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plano' },
            dataInicio: Date,
            dataVencimento: Date,
            ativo: Boolean,
            atribuidoPorAdmin: mongoose.Schema.Types.ObjectId,
            motivoAtribuicao: String
        }));

        const Plano = mongoose.model('Plano', new mongoose.Schema({
            nome: String,
            descricao: String,
            limiteAlunos: Number,
            preco: Number,
            duracao: Number,
            tipo: String,
            ativo: Boolean
        }));

        // Test the actual populate query that was failing
        console.log('\n🔍 Testando query populate...');
        
        const personalPlanoAtivo = await PersonalPlano.findOne({
            ativo: true,
            dataVencimento: { $gt: new Date() }
        }).populate({
            path: 'planoId',
            model: 'Plano',
            select: 'nome descricao limiteAlunos preco duracao tipo ativo'
        }).sort({ dataInicio: -1 }).exec();

        console.log('📊 Resultado do populate:', {
            found: !!personalPlanoAtivo,
            personalPlanoId: personalPlanoAtivo?._id,
            planoIdField: personalPlanoAtivo?.planoId,
            planoIdType: typeof personalPlanoAtivo?.planoId,
            isPopulated: personalPlanoAtivo?.planoId && typeof personalPlanoAtivo.planoId === 'object',
            hasNomeProperty: personalPlanoAtivo?.planoId && typeof personalPlanoAtivo.planoId === 'object' && 'nome' in personalPlanoAtivo.planoId,
            planoNome: personalPlanoAtivo?.planoId?.nome || 'N/A'
        });

        if (personalPlanoAtivo) {
            console.log('\n✅ PersonalPlano encontrado!');
            if (personalPlanoAtivo.planoId && typeof personalPlanoAtivo.planoId === 'object' && 'nome' in personalPlanoAtivo.planoId) {
                console.log(`✅ Populate funcionou! Plano: ${personalPlanoAtivo.planoId.nome}`);
                console.log(`   Limite de alunos: ${personalPlanoAtivo.planoId.limiteAlunos}`);
                console.log(`   Preço: R$${personalPlanoAtivo.planoId.preco}`);
            } else {
                console.log('❌ Populate falhou - planoId não foi populado corretamente');
                
                // Try manual lookup as fallback
                console.log('\n🔄 Tentando busca manual...');
                const manualPlano = await Plano.findById(personalPlanoAtivo.planoId).exec();
                if (manualPlano) {
                    console.log(`✅ Busca manual funcionou! Plano: ${manualPlano.nome}`);
                } else {
                    console.log('❌ Busca manual também falhou');
                }
            }
        } else {
            console.log('❌ Nenhum PersonalPlano ativo encontrado');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔗 Desconectado do MongoDB');
        process.exit(0);
    }
}

directTest();