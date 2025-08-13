// server/scripts/cronJobs.ts
import PlanMaintenanceService from '../services/PlanMaintenanceService.js';

/**
 * Cron job script for automated maintenance
 * This script should be scheduled to run daily via cron or other scheduler
 */
export async function executeDailyMaintenance(): Promise<void> {
    try {
        console.log('🕒 Iniciando execução de manutenção diária...');
        
        const result = await PlanMaintenanceService.executarManutencaoCompleta();
        
        console.log('✅ Manutenção diária concluída com sucesso:', {
            planosExpirados: result.plansExpired,
            tokensExpirados: result.tokensExpired,
            alunosDesativados: result.studentsDeactivated,
            timestamp: result.timestamp.toISOString()
        });

        // Optionally send notification or log to external system
        if (result.plansExpired > 0 || result.tokensExpired > 0 || result.studentsDeactivated > 0) {
            console.log('📧 Notificação: Itens foram expirados/desativados na manutenção diária');
        }

    } catch (error) {
        console.error('❌ Erro durante manutenção diária:', error);
        throw error;
    }
}

/**
 * Cron job para verificar expiração em 7 dias
 */
export async function checkExpirationWarnings(): Promise<void> {
    try {
        console.log('🔔 Verificando avisos de expiração...');
        
        const [planWarnings, tokenWarnings] = await Promise.all([
            PlanMaintenanceService.verificarPlanosProximosVencimento(7),
            PlanMaintenanceService.verificarTokensProximosVencimento(7)
        ]);

        if (planWarnings.personalsComPlanosVencendo.length > 0) {
            console.log(`⚠️  ${planWarnings.personalsComPlanosVencendo.length} personal trainers com planos vencendo em 7 dias`);
            
            planWarnings.personalsComPlanosVencendo.forEach(warning => {
                console.log(`  - ${warning.personalNome} (${warning.personalEmail}): ${warning.planoNome} vence em ${warning.diasRestantes} dias`);
            });
        }

        if (tokenWarnings.personalsComTokensVencendo.length > 0) {
            console.log(`⚠️  ${tokenWarnings.personalsComTokensVencendo.length} personal trainers com tokens vencendo em 7 dias`);
            
            tokenWarnings.personalsComTokensVencendo.forEach(warning => {
                console.log(`  - ${warning.personalNome} (${warning.personalEmail}): ${warning.tokensVencendo} tokens vencem em ${warning.diasRestantes} dias`);
            });
        }

        console.log('✅ Verificação de avisos concluída');

    } catch (error) {
        console.error('❌ Erro ao verificar avisos de expiração:', error);
        throw error;
    }
}

/**
 * Cron job para gerar relatório semanal
 */
export async function generateWeeklyReport(): Promise<void> {
    try {
        console.log('📊 Gerando relatório semanal...');
        
        const relatorio = await PlanMaintenanceService.gerarRelatorioUso();
        
        console.log('📈 Relatório semanal:', {
            totalPersonals: relatorio.totalPersonals,
            personalsComPlanoAtivo: relatorio.personalsComPlanoAtivo,
            personalsComPlanoExpirado: relatorio.personalsComPlanoExpirado,
            totalAlunosAtivos: relatorio.totalAlunosAtivos,
            totalTokensDisponiveis: relatorio.totalTokensDisponiveis,
            totalTokensUtilizados: relatorio.totalTokensUtilizados,
            totalTokensExpirados: relatorio.totalTokensExpirados,
            timestamp: relatorio.timestamp.toISOString()
        });

        console.log('✅ Relatório semanal gerado com sucesso');

    } catch (error) {
        console.error('❌ Erro ao gerar relatório semanal:', error);
        throw error;
    }
}

// If running directly (not imported)
if (process.argv[1].endsWith('cronJobs.ts') || process.argv[1].endsWith('cronJobs.js')) {
    const action = process.argv[2];
    
    switch (action) {
        case 'daily':
            executeDailyMaintenance()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
        case 'warnings':
            checkExpirationWarnings()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
        case 'report':
            generateWeeklyReport()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
        default:
            console.log('Usage: node cronJobs.js [daily|warnings|report]');
            process.exit(1);
    }
}