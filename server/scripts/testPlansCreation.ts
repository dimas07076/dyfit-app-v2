// server/scripts/testPlansCreation.ts
import { connectToDatabase } from '../database.js';
import PlanoService from '../services/PlanoService.js';
import '../loadEnv.mts'; // Load environment variables

async function testPlansCreation() {
    try {
        console.log('🔄 Iniciando teste de criação de planos...');
        
        // Test database connection
        console.log('🔌 Testando conexão com banco de dados...');
        await connectToDatabase();
        console.log('✅ Conectado ao banco de dados com sucesso!');
        
        // Test plans creation/verification
        console.log('📝 Testando criação de planos...');
        const planosIniciaisStatus = await PlanoService.ensureInitialPlansExist();
        console.log(`🎯 Status da criação de planos iniciais: ${planosIniciaisStatus ? 'Sucesso' : 'Falha'}`);
        
        // Test getting all plans
        console.log('📊 Testando busca de todos os planos...');
        const planos = await PlanoService.getAllPlans();
        console.log(`✅ Encontrados ${planos.length} planos:`);
        
        planos.forEach((plano, index) => {
            console.log(`  ${index + 1}. ${plano.nome}:`);
            console.log(`     - Limite: ${plano.limiteAlunos} alunos`);
            console.log(`     - Preço: R$${plano.preco.toFixed(2)}`);
            console.log(`     - Duração: ${plano.duracao} dias`);
            console.log(`     - Tipo: ${plano.tipo}`);
            console.log(`     - Ativo: ${plano.ativo ? 'Sim' : 'Não'}`);
        });
        
        console.log('\n🎉 Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
        throw error;
    } finally {
        // Close database connection
        const mongoose = await import('mongoose');
        await mongoose.disconnect();
        console.log('🔌 Conexão com banco de dados fechada');
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testPlansCreation()
        .then(() => {
            console.log('✅ Script executado com sucesso');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script falhou:', error);
            process.exit(1);
        });
}

export { testPlansCreation };