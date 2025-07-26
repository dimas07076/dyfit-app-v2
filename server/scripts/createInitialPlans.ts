// server/scripts/createInitialPlans.ts
import mongoose from 'mongoose';
import Plano from '../models/Plano.js';
import '../loadEnv.mts'; // Load environment variables

const INITIAL_PLANS = [
    {
        nome: 'Free',
        descricao: 'Plano gratuito por 7 dias com 1 aluno ativo',
        limiteAlunos: 1,
        preco: 0,
        duracao: 7, // 7 days
        tipo: 'free' as const,
        ativo: true
    },
    {
        nome: 'Start',
        descricao: 'Plano inicial para até 5 alunos ativos',
        limiteAlunos: 5,
        preco: 29.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Pro',
        descricao: 'Plano profissional para até 10 alunos ativos',
        limiteAlunos: 10,
        preco: 49.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Elite',
        descricao: 'Plano elite para até 20 alunos ativos',
        limiteAlunos: 20,
        preco: 79.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    },
    {
        nome: 'Master',
        descricao: 'Plano master para até 50 alunos ativos',
        limiteAlunos: 50,
        preco: 129.90,
        duracao: 30, // 30 days
        tipo: 'paid' as const,
        ativo: true
    }
];

async function createInitialPlans() {
    try {
        console.log('Conectando ao MongoDB...');
        
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dyfit';
        await mongoose.connect(mongoUri);
        
        console.log('Conectado ao MongoDB');

        console.log('Verificando planos existentes...');
        const existingPlans = await Plano.find({});
        
        if (existingPlans.length > 0) {
            console.log(`Encontrados ${existingPlans.length} planos existentes:`);
            existingPlans.forEach(plan => {
                console.log(`  - ${plan.nome} (${plan.limiteAlunos} alunos, R$${plan.preco})`);
            });
            
            console.log('\nAtualizar planos existentes? [y/N]');
            // For script execution, we'll skip the interactive part and just log
            console.log('Script executado em modo não-interativo. Pulando atualização.');
        } else {
            console.log('Nenhum plano encontrado. Criando planos iniciais...');
            
            for (const planData of INITIAL_PLANS) {
                try {
                    const existingPlan = await Plano.findOne({ nome: planData.nome });
                    
                    if (existingPlan) {
                        console.log(`Plano '${planData.nome}' já existe. Atualizando...`);
                        await Plano.findByIdAndUpdate(existingPlan._id, planData);
                        console.log(`  ✓ Plano '${planData.nome}' atualizado`);
                    } else {
                        const newPlan = new Plano(planData);
                        await newPlan.save();
                        console.log(`  ✓ Plano '${planData.nome}' criado`);
                    }
                } catch (error) {
                    console.error(`  ✗ Erro ao criar/atualizar plano '${planData.nome}':`, error);
                }
            }
        }

        console.log('\n=== Planos atuais no sistema ===');
        const allPlans = await Plano.find({}).sort({ preco: 1 });
        allPlans.forEach(plan => {
            console.log(`${plan.nome}:`);
            console.log(`  - Limite: ${plan.limiteAlunos} alunos`);
            console.log(`  - Preço: R$${plan.preco.toFixed(2)}`);
            console.log(`  - Duração: ${plan.duracao} dias`);
            console.log(`  - Tipo: ${plan.tipo}`);
            console.log(`  - Ativo: ${plan.ativo ? 'Sim' : 'Não'}`);
            console.log('');
        });

        console.log('Script concluído com sucesso!');
        
    } catch (error) {
        console.error('Erro ao executar script:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('Conexão com MongoDB fechada');
        process.exit(0);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createInitialPlans();
}

export { createInitialPlans, INITIAL_PLANS };