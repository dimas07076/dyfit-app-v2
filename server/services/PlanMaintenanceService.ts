// server/services/PlanMaintenanceService.ts
import PlanoService from './PlanoService.js';
import TokenManagementService from './TokenManagementService.js';
import SlotManagementService from './SlotManagementService.js';

export interface MaintenanceResult {
    plansExpired: number;
    tokensExpired: number;
    studentsDeactivated: number;
    timestamp: Date;
}

export class PlanMaintenanceService {
    /**
     * Executa manutenção completa: expira planos, tokens e desativa alunos
     */
    async executarManutencaoCompleta(): Promise<MaintenanceResult> {
        try {
            console.log('🔄 Iniciando manutenção automática do sistema...');

            const timestamp = new Date();

            // 1. Cleanup expired plans and tokens
            const cleanupResult = await PlanoService.cleanupExpired();
            
            // 2. Expire individual tokens
            const tokenResult = await TokenManagementService.expirarTokensVencidos();
            
            // 3. Deactivate students with expired associations
            const studentResult = await SlotManagementService.desativarAlunosComAssociacaoExpirada();

            const result: MaintenanceResult = {
                plansExpired: cleanupResult.plansDeactivated,
                tokensExpired: Math.max(cleanupResult.tokensDeactivated, tokenResult.tokensExpirados),
                studentsDeactivated: studentResult.alunosDesativados,
                timestamp
            };

            console.log('✅ Manutenção automática concluída:', result);
            
            return result;

        } catch (error) {
            console.error('❌ Erro durante manutenção automática:', error);
            throw error;
        }
    }

    /**
     * Verifica planos próximos do vencimento (para notificações)
     */
    async verificarPlanosProximosVencimento(diasAntecedencia: number = 7): Promise<{
        personalsComPlanosVencendo: Array<{
            personalId: string;
            personalNome?: string;
            personalEmail?: string;
            planoNome: string;
            dataVencimento: Date;
            diasRestantes: number;
        }>;
    }> {
        try {
            console.log(`🔔 Verificando planos que vencem em ${diasAntecedencia} dias...`);

            const agora = new Date();
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

            // Import models
            const { default: PersonalPlano } = await import('../models/PersonalPlano.js');
            const { default: PersonalTrainer } = await import('../models/PersonalTrainer.js');

            const planosVencendo = await PersonalPlano.find({
                status: 'ativo',
                dataFim: {
                    $gte: agora,
                    $lte: dataLimite
                }
            }).populate('personalId', 'nome email');

            const personalsComPlanosVencendo = planosVencendo.map(plano => {
                const personal = plano.personalId as any;
                const diasRestantes = Math.ceil((plano.dataFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
                
                return {
                    personalId: plano.personalId.toString(),
                    personalNome: personal?.nome,
                    personalEmail: personal?.email,
                    planoNome: plano.planoTipo,
                    dataVencimento: plano.dataFim,
                    diasRestantes
                };
            });

            console.log(`📊 Encontrados ${personalsComPlanosVencendo.length} planos vencendo em ${diasAntecedencia} dias`);

            return { personalsComPlanosVencendo };

        } catch (error) {
            console.error('❌ Erro ao verificar planos próximos do vencimento:', error);
            return { personalsComPlanosVencendo: [] };
        }
    }

    /**
     * Verifica tokens próximos do vencimento (para notificações)
     */
    async verificarTokensProximosVencimento(diasAntecedencia: number = 7): Promise<{
        personalsComTokensVencendo: Array<{
            personalId: string;
            personalNome?: string;
            personalEmail?: string;
            tokensVencendo: number;
            dataVencimento: Date;
            diasRestantes: number;
        }>;
    }> {
        try {
            console.log(`🎫 Verificando tokens que vencem em ${diasAntecedencia} dias...`);

            const agora = new Date();
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

            // Import models
            const { default: TokenAvulso } = await import('../models/TokenAvulso.js');

            const tokensVencendo = await TokenAvulso.aggregate([
                {
                    $match: {
                        status: 'disponivel',
                        dataExpiracao: {
                            $gte: agora,
                            $lte: dataLimite
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            personalId: '$personalId',
                            dataExpiracao: '$dataExpiracao'
                        },
                        tokensVencendo: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'personaltrainers',
                        localField: '_id.personalId',
                        foreignField: '_id',
                        as: 'personal'
                    }
                }
            ]);

            const personalsComTokensVencendo = tokensVencendo.map((group: any) => {
                const personal = group.personal[0];
                const diasRestantes = Math.ceil((group._id.dataExpiracao.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
                
                return {
                    personalId: group._id.personalId.toString(),
                    personalNome: personal?.nome,
                    personalEmail: personal?.email,
                    tokensVencendo: group.tokensVencendo,
                    dataVencimento: group._id.dataExpiracao,
                    diasRestantes
                };
            });

            console.log(`📊 Encontrados ${personalsComTokensVencendo.length} grupos de tokens vencendo em ${diasAntecedencia} dias`);

            return { personalsComTokensVencendo };

        } catch (error) {
            console.error('❌ Erro ao verificar tokens próximos do vencimento:', error);
            return { personalsComTokensVencendo: [] };
        }
    }

    /**
     * Gera relatório de uso para admins
     */
    async gerarRelatorioUso(): Promise<{
        totalPersonals: number;
        personalsComPlanoAtivo: number;
        personalsComPlanoExpirado: number;
        totalAlunosAtivos: number;
        totalTokensDisponiveis: number;
        totalTokensUtilizados: number;
        totalTokensExpirados: number;
        timestamp: Date;
    }> {
        try {
            console.log('📊 Gerando relatório de uso do sistema...');

            // Import models
            const { default: PersonalTrainer } = await import('../models/PersonalTrainer.js');
            const { default: Aluno } = await import('../models/Aluno.js');
            const { default: TokenAvulso } = await import('../models/TokenAvulso.js');
            const { default: PersonalPlano } = await import('../models/PersonalPlano.js');

            const agora = new Date();

            const [
                totalPersonals,
                personalsComPlanoAtivo,
                personalsComPlanoExpirado,
                totalAlunosAtivos,
                tokenStats
            ] = await Promise.all([
                PersonalTrainer.countDocuments({ role: 'Personal Trainer' }),
                PersonalPlano.countDocuments({ 
                    status: 'ativo',
                    dataFim: { $gt: agora }
                }),
                PersonalPlano.countDocuments({ 
                    status: 'ativo',
                    dataFim: { $lte: agora }
                }),
                Aluno.countDocuments({ status: 'active' }),
                TokenAvulso.aggregate([
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ])
            ]);

            // Parse token stats
            const tokenStatsMap = tokenStats.reduce((acc: any, stat: any) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {});

            const relatorio = {
                totalPersonals,
                personalsComPlanoAtivo,
                personalsComPlanoExpirado,
                totalAlunosAtivos,
                totalTokensDisponiveis: tokenStatsMap.disponivel || 0,
                totalTokensUtilizados: tokenStatsMap.utilizado || 0,
                totalTokensExpirados: tokenStatsMap.expirado || 0,
                timestamp: agora
            };

            console.log('✅ Relatório de uso gerado:', relatorio);
            
            return relatorio;

        } catch (error) {
            console.error('❌ Erro ao gerar relatório de uso:', error);
            throw error;
        }
    }
}

export default new PlanMaintenanceService();