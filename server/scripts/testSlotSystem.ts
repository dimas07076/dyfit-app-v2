// server/scripts/testSlotSystem.ts
import mongoose from 'mongoose';
import PlanoService from '../services/PlanoService.js';
import SlotManagementService from '../services/SlotManagementService.js';
import TokenManagementService from '../services/TokenManagementService.js';
import dbConnect from '../lib/dbConnect.js';

/**
 * Test script to validate the slot management system
 */
async function testSlotSystem() {
    try {
        console.log('🧪 Iniciando teste do sistema de slots...');
        
        // Connect to database
        await dbConnect();
        
        // Create a test personal trainer ID (this would normally exist)
        const testPersonalId = new mongoose.Types.ObjectId().toString();
        console.log(`👤 Personal ID de teste: ${testPersonalId}`);
        
        // Test 1: Check slot availability with no plan
        console.log('\n📋 Teste 1: Verificar slots sem plano...');
        const noPlanResult = await SlotManagementService.verificarSlotDisponivel(testPersonalId);
        console.log('Resultado:', noPlanResult.slotsDisponiveis ? 'Slots disponíveis' : 'Sem slots');
        console.log('Mensagem:', noPlanResult.message);
        
        // Test 2: Create some tokens for the personal
        console.log('\n🎫 Teste 2: Criando tokens avulsos...');
        const testAdminId = new mongoose.Types.ObjectId().toString();
        const tokens = await TokenManagementService.criarTokensParaPersonal({
            personalId: testPersonalId,
            quantidade: 3,
            validade: 30, // 30 days
            adminId: testAdminId,
            motivo: 'Teste do sistema'
        });
        console.log(`✅ Criados ${tokens.length} tokens`);
        
        // Test 3: Check slot availability with tokens
        console.log('\n📋 Teste 3: Verificar slots com tokens...');
        const withTokensResult = await SlotManagementService.verificarSlotDisponivel(testPersonalId);
        console.log('Resultado:', withTokensResult.slotsDisponiveis ? 'Slots disponíveis' : 'Sem slots');
        console.log('Fonte:', withTokensResult.slotInfo?.fonte);
        
        // Test 4: Create a test student and associate with slot
        console.log('\n👨‍🎓 Teste 4: Criando aluno teste...');
        const testAlunoId = new mongoose.Types.ObjectId().toString();
        
        if (withTokensResult.slotsDisponiveis && withTokensResult.slotInfo) {
            // Simulate student creation (normally would be done via Aluno.save())
            console.log('📎 Associando aluno ao slot...');
            // This would fail without an actual Aluno document, but we'll just test the token utilization
            
            const tokenId = withTokensResult.slotInfo.tokenId;
            if (tokenId) {
                await TokenManagementService.utilizarToken(tokenId.toString(), testAlunoId);
                console.log('✅ Token utilizado com sucesso');
            }
        }
        
        // Test 5: Check token status
        console.log('\n📊 Teste 5: Status dos tokens...');
        const tokenStatus = await TokenManagementService.listarTokensPersonal(testPersonalId, true);
        console.log(`Total de tokens: ${tokenStatus.totalTokens}`);
        console.log(`Tokens disponíveis: ${tokenStatus.tokensDisponiveis}`);
        console.log(`Tokens utilizados: ${tokenStatus.tokensUtilizados}`);
        
        // Test 6: Expire tokens test
        console.log('\n⏰ Teste 6: Expiração de tokens...');
        const expiredCount = await TokenManagementService.expirarTokensVencidos();
        console.log(`Tokens expirados: ${expiredCount.tokensExpirados}`);
        
        // Test 7: Check available slots count
        console.log('\n🔢 Teste 7: Contagem de tokens disponíveis...');
        const availableCount = await TokenManagementService.contarTokensDisponiveis(testPersonalId);
        console.log(`Tokens disponíveis contados: ${availableCount}`);
        
        // Cleanup: Remove test tokens
        console.log('\n🧹 Limpeza: Removendo tokens de teste...');
        const { default: TokenAvulso } = await import('../models/TokenAvulso.js');
        await TokenAvulso.deleteMany({ personalId: testPersonalId });
        console.log('✅ Tokens de teste removidos');
        
        console.log('\n🎉 Teste do sistema de slots concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante teste:', error);
        throw error;
    }
}

// Run test if called directly
if (process.argv[1].endsWith('testSlotSystem.ts') || process.argv[1].endsWith('testSlotSystem.js')) {
    testSlotSystem()
        .then(() => {
            console.log('✅ Teste concluído');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Teste falhou:', error);
            process.exit(1);
        });
}