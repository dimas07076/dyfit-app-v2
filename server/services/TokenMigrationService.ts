// server/services/TokenMigrationService.ts
import Token, { IToken } from '../models/Token.js';
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import PersonalPlano from '../models/PersonalPlano.js';
import mongoose from 'mongoose';

export class TokenMigrationService {
    /**
     * Migrate existing TokenAvulso records to new Token model
     */
    async migrateTokenAvulsoToToken(): Promise<{ migrated: number; errors: string[] }> {
        try {
            console.log('[TokenMigration] 🔄 Starting migration of TokenAvulso to Token model...');
            
            // Get all existing TokenAvulso records
            const tokenAvulsoRecords = await TokenAvulso.find({});
            console.log(`[TokenMigration] 📊 Found ${tokenAvulsoRecords.length} TokenAvulso records to migrate`);
            
            let migrated = 0;
            const errors: string[] = [];
            
            for (const tokenAvulso of tokenAvulsoRecords) {
                try {
                    // Check if this token has already been migrated
                    const existingToken = await Token.findOne({
                        personalTrainerId: tokenAvulso.personalTrainerId,
                        quantidade: tokenAvulso.quantidade,
                        dataExpiracao: tokenAvulso.dataVencimento,
                        alunoId: tokenAvulso.assignedToStudentId || null,
                        createdAt: tokenAvulso.createdAt
                    });
                    
                    if (existingToken) {
                        console.log(`[TokenMigration] ⏭️ Skipping already migrated token: ${tokenAvulso._id}`);
                        continue;
                    }
                    
                    // Determine token type (plano vs avulso)
                    // For now, we'll assume all tokens are 'avulso' type
                    // Later, we can enhance this to detect plan-based tokens
                    const tipo = 'avulso';
                    
                    // Create new Token record
                    const newToken = new Token({
                        tipo,
                        personalTrainerId: tokenAvulso.personalTrainerId,
                        alunoId: tokenAvulso.assignedToStudentId || null,
                        planoId: null, // Will be set later for plan tokens
                        dataExpiracao: tokenAvulso.dataVencimento,
                        ativo: tokenAvulso.ativo,
                        quantidade: tokenAvulso.quantidade,
                        dateAssigned: tokenAvulso.dateAssigned || null,
                        adicionadoPorAdmin: tokenAvulso.adicionadoPorAdmin,
                        motivoAdicao: tokenAvulso.motivoAdicao || 'Migração automática de TokenAvulso',
                        createdAt: tokenAvulso.createdAt,
                        updatedAt: tokenAvulso.updatedAt
                    });
                    
                    await newToken.save();
                    migrated++;
                    
                    console.log(`[TokenMigration] ✅ Migrated token ${tokenAvulso._id} -> ${newToken.id}`);
                    
                } catch (error) {
                    const errorMsg = `Failed to migrate token ${tokenAvulso._id}: ${error}`;
                    console.error(`[TokenMigration] ❌ ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
            
            console.log(`[TokenMigration] 🎉 Migration completed. Migrated: ${migrated}, Errors: ${errors.length}`);
            
            return { migrated, errors };
            
        } catch (error) {
            console.error('[TokenMigration] ❌ Critical error during migration:', error);
            return { migrated: 0, errors: [`Critical migration error: ${error}`] };
        }
    }
    
    /**
     * Generate plan-based tokens for existing active plans
     */
    async generatePlanTokens(): Promise<{ generated: number; errors: string[] }> {
        try {
            console.log('[TokenMigration] 🔄 Generating plan-based tokens for existing plans...');
            
            // Get all active PersonalPlano records
            const activePersonalPlans = await PersonalPlano.find({
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).populate('planoId');
            
            console.log(`[TokenMigration] 📊 Found ${activePersonalPlans.length} active plans`);
            
            let generated = 0;
            const errors: string[] = [];
            
            for (const personalPlano of activePersonalPlans) {
                try {
                    const plano = personalPlano.planoId as any;
                    if (!plano || !plano.limiteAlunos) {
                        console.log(`[TokenMigration] ⏭️ Skipping plan without limit: ${personalPlano._id}`);
                        continue;
                    }
                    
                    // Check if tokens already exist for this plan
                    const existingTokens = await Token.find({
                        personalTrainerId: personalPlano.personalTrainerId,
                        planoId: personalPlano._id,
                        tipo: 'plano'
                    });
                    
                    if (existingTokens.length > 0) {
                        console.log(`[TokenMigration] ⏭️ Tokens already exist for plan: ${personalPlano._id}`);
                        continue;
                    }
                    
                    // Create plan tokens based on plan limit
                    for (let i = 0; i < plano.limiteAlunos; i++) {
                        const planToken = new Token({
                            tipo: 'plano',
                            personalTrainerId: personalPlano.personalTrainerId,
                            planoId: personalPlano._id,
                            dataExpiracao: personalPlano.dataVencimento,
                            ativo: true,
                            quantidade: 1,
                            adicionadoPorAdmin: personalPlano.atribuidoPorAdmin,
                            motivoAdicao: `Token de plano gerado automaticamente - ${plano.nome}`,
                        });
                        
                        await planToken.save();
                        generated++;
                        
                        console.log(`[TokenMigration] ✅ Generated plan token ${planToken.id} for plan ${plano.nome}`);
                    }
                    
                } catch (error) {
                    const errorMsg = `Failed to generate tokens for plan ${personalPlano._id}: ${error}`;
                    console.error(`[TokenMigration] ❌ ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
            
            console.log(`[TokenMigration] 🎉 Plan token generation completed. Generated: ${generated}, Errors: ${errors.length}`);
            
            return { generated, errors };
            
        } catch (error) {
            console.error('[TokenMigration] ❌ Critical error during plan token generation:', error);
            return { generated: 0, errors: [`Critical plan token generation error: ${error}`] };
        }
    }
    
    /**
     * Run complete migration process
     */
    async runCompleteMigration(): Promise<{
        tokensMigrated: number;
        planTokensGenerated: number;
        totalErrors: string[];
    }> {
        console.log('[TokenMigration] 🚀 Starting complete migration process...');
        
        const migrationResult = await this.migrateTokenAvulsoToToken();
        const planTokenResult = await this.generatePlanTokens();
        
        const result = {
            tokensMigrated: migrationResult.migrated,
            planTokensGenerated: planTokenResult.generated,
            totalErrors: [...migrationResult.errors, ...planTokenResult.errors]
        };
        
        console.log('[TokenMigration] 🏁 Complete migration summary:', result);
        
        return result;
    }
}

export default new TokenMigrationService();