// server/services/TokenService.ts
import Token, { IToken } from '../models/Token.js';
import PersonalPlano from '../models/PersonalPlano.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

export interface TokenAssignmentResult {
    success: boolean;
    message: string;
    assignedToken?: IToken;
    errorCode?: string;
}

export interface TokenDetails {
    id: string;
    tipo: 'plano' | 'avulso';
    dataExpiracao: Date;
    status: string;
    alunoId?: string;
    alunoNome?: string;
    planoId?: string;
    quantidade: number;
}

export interface TokenStatus {
    availableTokens: number;
    consumedTokens: number;
    totalTokens: number;
    planTokens: number;
    standaloneTokens: number;
    tokenDetails: TokenDetails[];
}

export interface TokenRenewalRequest {
    planoId: string;
    novaDataExpiracao: string;
    tokensRenovados: string[]; // Array of token IDs to renew
}

export interface TokenRenewalResult {
    success: boolean;
    message: string;
    renovatedCount: number;
    liberatedCount: number;
    errors: string[];
}

export class TokenService {
    /**
     * Assign a token to a student
     */
    async assignTokenToStudent(
        personalTrainerId: string,
        studentId: string,
        requiredTokens: number = 1
    ): Promise<TokenAssignmentResult> {
        try {
            console.log(`[TokenService] 🎯 Assigning ${requiredTokens} token(s) to student ${studentId} for personal ${personalTrainerId}`);
            
            const now = new Date();
            
            // Find available tokens (not assigned, active, and not expired)
            const availableTokens = await Token.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataExpiracao: { $gt: now },
                alunoId: null // Only unassigned tokens
            }).sort({ dataExpiracao: 1 }); // Assign tokens that expire first
            
            console.log(`[TokenService] 📊 Found ${availableTokens.length} available token records`);
            
            // Calculate total available token quantity
            const totalAvailableQuantity = availableTokens.reduce((sum, token) => sum + token.quantidade, 0);
            
            console.log(`[TokenService] 🔢 Total available token quantity: ${totalAvailableQuantity}`);
            
            if (totalAvailableQuantity < requiredTokens) {
                return {
                    success: false,
                    message: `Não há tokens suficientes disponíveis. Necessário: ${requiredTokens}, Disponível: ${totalAvailableQuantity}`,
                    errorCode: 'INSUFFICIENT_TOKENS'
                };
            }
            
            // Find the best token to assign
            let assignedToken: IToken | null = null;
            
            // First, try to find a token with exact or more quantity needed
            for (const token of availableTokens) {
                if (token.quantidade >= requiredTokens) {
                    assignedToken = token;
                    break;
                }
            }
            
            if (!assignedToken && requiredTokens === 1) {
                assignedToken = availableTokens[0];
            }
            
            if (!assignedToken) {
                return {
                    success: false,
                    message: 'Não foi possível encontrar um token adequado para atribuição',
                    errorCode: 'NO_SUITABLE_TOKEN'
                };
            }
            
            // Assign the token to the student
            if (assignedToken.quantidade === requiredTokens) {
                // Assign entire token to student
                assignedToken.alunoId = new mongoose.Types.ObjectId(studentId);
                assignedToken.dateAssigned = now;
                await assignedToken.save();
                
                console.log(`[TokenService] ✅ Assigned entire token ${assignedToken.id} (quantity: ${assignedToken.quantidade}) to student ${studentId}`);
            } else if (assignedToken.quantidade > requiredTokens) {
                // Split token: reduce original and create new assigned token
                const originalQuantity = assignedToken.quantidade;
                assignedToken.quantidade = originalQuantity - requiredTokens;
                await assignedToken.save();
                
                // Create new token assigned to student
                const assignedTokenRecord = new Token({
                    tipo: assignedToken.tipo,
                    personalTrainerId: assignedToken.personalTrainerId,
                    alunoId: new mongoose.Types.ObjectId(studentId),
                    planoId: assignedToken.planoId,
                    dataExpiracao: assignedToken.dataExpiracao,
                    ativo: true,
                    quantidade: requiredTokens,
                    dateAssigned: now,
                    adicionadoPorAdmin: assignedToken.adicionadoPorAdmin,
                    motivoAdicao: `Token atribuído ao aluno ${studentId}`
                });
                
                await assignedTokenRecord.save();
                assignedToken = assignedTokenRecord;
                
                console.log(`[TokenService] ✅ Split token: reduced original token to ${originalQuantity - requiredTokens}, created new assigned token ${assignedToken.id} (quantity: ${requiredTokens}) for student ${studentId}`);
            }
            
            return {
                success: true,
                message: `Token ${assignedToken.id} atribuído com sucesso ao aluno`,
                assignedToken
            };
            
        } catch (error) {
            console.error('❌ Error assigning token to student:', error);
            return {
                success: false,
                message: 'Erro interno ao atribuir token',
                errorCode: 'INTERNAL_ERROR'
            };
        }
    }
    
    /**
     * Get token details for a specific student
     * Enhanced to check both Token and TokenAvulso models for dual compatibility
     */
    async getStudentTokenDetails(studentId: string): Promise<TokenDetails | null> {
        try {
            console.log(`[TokenService] 🔍 Getting token details for student ${studentId}`);
            
            // Check both legacy TokenAvulso and new Token models
            const [legacyToken, newToken] = await Promise.all([
                import('../models/TokenAvulso.js').then(module => 
                    module.default.findOne({
                        assignedToStudentId: studentId,
                        ativo: true
                    }).populate('assignedToStudentId', 'nome')
                ),
                Token.findOne({
                    alunoId: studentId,
                    ativo: true
                }).populate('alunoId', 'nome')
            ]);
            
            // Prefer legacy token if both exist (consistency with assignment logic)
            const assignedToken = legacyToken || newToken;
            
            if (!assignedToken) {
                console.log(`[TokenService] ℹ️ No token found for student ${studentId} in either model`);
                return null;
            }
            
            const isLegacyToken = !!legacyToken;
            
            // Convert to standardized TokenDetails format
            let tokenDetails: TokenDetails;
            
            if (isLegacyToken) {
                // Handle TokenAvulso model
                const legacyTokenData = assignedToken as any;
                tokenDetails = {
                    id: (legacyTokenData._id as mongoose.Types.ObjectId).toString(),
                    tipo: 'avulso', // Legacy tokens are typically standalone
                    dataExpiracao: legacyTokenData.dataVencimento,
                    status: legacyTokenData.dataVencimento <= new Date() ? 'Expirado' : 'Ativo',
                    alunoId: studentId,
                    alunoNome: legacyTokenData.assignedToStudentId?.nome,
                    planoId: undefined, // Legacy tokens typically don't have planoId
                    quantidade: legacyTokenData.quantidade
                };
            } else {
                // Handle new Token model
                const newTokenData = assignedToken as any;
                tokenDetails = {
                    id: newTokenData.id,
                    tipo: newTokenData.tipo,
                    dataExpiracao: newTokenData.dataExpiracao,
                    status: newTokenData.status || 'Ativo',
                    alunoId: studentId,
                    alunoNome: newTokenData.alunoId?.nome,
                    planoId: newTokenData.planoId?.toString(),
                    quantidade: newTokenData.quantidade
                };
            }
            
            console.log(`[TokenService] ✅ Found token for student ${studentId}:`, {
                tokenModel: isLegacyToken ? 'TokenAvulso' : 'Token',
                tokenId: tokenDetails.id,
                tipo: tokenDetails.tipo,
                dataExpiracao: tokenDetails.dataExpiracao,
                status: tokenDetails.status,
                quantidade: tokenDetails.quantidade
            });
            
            return tokenDetails;
            
        } catch (error) {
            console.error('❌ Error getting student token details:', error);
            return null;
        }
    }
    
    /**
     * Get complete token status for a personal trainer
     */
    async getTokenStatus(personalTrainerId: string): Promise<TokenStatus> {
        try {
            const now = new Date();
            
            // Get all active tokens for this personal trainer
            const allTokens = await Token.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataExpiracao: { $gt: now }
            }).populate('alunoId', 'nome status');
            
            const tokenDetails: TokenDetails[] = allTokens.map(token => ({
                id: token.id,
                tipo: token.tipo,
                dataExpiracao: token.dataExpiracao,
                status: token.status,
                alunoId: token.alunoId?.toString(),
                alunoNome: (token.alunoId as any)?.nome,
                planoId: token.planoId?.toString(),
                quantidade: token.quantidade
            }));
            
            const availableTokens = allTokens.filter(token => !token.alunoId);
            const consumedTokens = allTokens.filter(token => token.alunoId);
            const planTokens = allTokens.filter(token => token.tipo === 'plano');
            const standaloneTokens = allTokens.filter(token => token.tipo === 'avulso');
            
            const availableCount = availableTokens.reduce((sum, token) => sum + token.quantidade, 0);
            const consumedCount = consumedTokens.reduce((sum, token) => sum + token.quantidade, 0);
            const totalCount = availableCount + consumedCount;
            const planCount = planTokens.reduce((sum, token) => sum + token.quantidade, 0);
            const standaloneCount = standaloneTokens.reduce((sum, token) => sum + token.quantidade, 0);
            
            return {
                availableTokens: availableCount,
                consumedTokens: consumedCount,
                totalTokens: totalCount,
                planTokens: planCount,
                standaloneTokens: standaloneCount,
                tokenDetails
            };
            
        } catch (error) {
            console.error('❌ Error getting token status:', error);
            return {
                availableTokens: 0,
                consumedTokens: 0,
                totalTokens: 0,
                planTokens: 0,
                standaloneTokens: 0,
                tokenDetails: []
            };
        }
    }
    
    /**
     * Get available token count (backward compatibility)
     */
    async getAvailableTokensCount(personalTrainerId: string): Promise<number> {
        const status = await this.getTokenStatus(personalTrainerId);
        return status.availableTokens;
    }
    
    /**
     * Check if student has assigned token (backward compatibility)
     */
    async getStudentAssignedToken(studentId: string): Promise<IToken | null> {
        try {
            return await Token.findOne({
                alunoId: studentId,
                ativo: true
            });
        } catch (error) {
            console.error('❌ Error checking student assigned token:', error);
            return null;
        }
    }
    
    /**
     * Renew selected plan tokens
     */
    async renewPlanTokens(request: TokenRenewalRequest): Promise<TokenRenewalResult> {
        try {
            console.log(`[TokenService] 🔄 Starting token renewal for plan ${request.planoId}`);
            
            const novaDataExpiracao = new Date(request.novaDataExpiracao);
            
            // Get all plan tokens for this plan
            const planTokens = await Token.find({
                planoId: request.planoId,
                tipo: 'plano',
                ativo: true
            }).populate('alunoId', 'nome');
            
            console.log(`[TokenService] 📊 Found ${planTokens.length} plan tokens for renewal`);
            
            let renovatedCount = 0;
            let liberatedCount = 0;
            const errors: string[] = [];
            
            for (const token of planTokens) {
                try {
                    if (request.tokensRenovados.includes(token.id)) {
                        // Renew this token
                        token.dataExpiracao = novaDataExpiracao;
                        token.renovado = true;
                        token.dataUltimaRenovacao = new Date();
                        await token.save();
                        
                        renovatedCount++;
                        console.log(`[TokenService] ✅ Renewed token ${token.id}`);
                    } else {
                        // Liberate this token (remove student assignment)
                        if (token.alunoId) {
                            token.alunoId = undefined;
                            token.dateAssigned = undefined;
                            await token.save();
                            
                            liberatedCount++;
                            console.log(`[TokenService] 🔓 Liberated token ${token.id} from student`);
                        }
                    }
                } catch (error) {
                    const errorMsg = `Error processing token ${token.id}: ${error}`;
                    console.error(`[TokenService] ❌ ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }
            
            console.log(`[TokenService] 🎉 Token renewal completed. Renewed: ${renovatedCount}, Liberated: ${liberatedCount}, Errors: ${errors.length}`);
            
            return {
                success: true,
                message: `Renovação concluída: ${renovatedCount} tokens renovados, ${liberatedCount} tokens liberados`,
                renovatedCount,
                liberatedCount,
                errors
            };
            
        } catch (error) {
            console.error('❌ Error during token renewal:', error);
            return {
                success: false,
                message: 'Erro interno durante renovação de tokens',
                renovatedCount: 0,
                liberatedCount: 0,
                errors: [`Critical error: ${error}`]
            };
        }
    }
    
    /**
     * Get tokens available for renewal for a specific plan
     */
    async getTokensForRenewal(planoId: string): Promise<{
        tokens: Array<{
            id: string;
            alunoNome?: string;
            alunoId?: string;
            dataExpiracao: Date;
            status: string;
        }>;
        planInfo: {
            nome: string;
            limiteAlunos: number;
            novaDataExpiracao: Date;
        };
    }> {
        try {
            // Get plan information
            const personalPlano = await PersonalPlano.findById(planoId).populate('planoId');
            if (!personalPlano) {
                throw new Error('Plano não encontrado');
            }
            
            const plano = personalPlano.planoId as any;
            
            // Get all plan tokens
            const planTokens = await Token.find({
                planoId: planoId,
                tipo: 'plano',
                ativo: true
            }).populate('alunoId', 'nome');
            
            const tokens = planTokens.map(token => ({
                id: token.id,
                alunoNome: (token.alunoId as any)?.nome,
                alunoId: token.alunoId?.toString(),
                dataExpiracao: token.dataExpiracao,
                status: token.status
            }));
            
            return {
                tokens,
                planInfo: {
                    nome: plano.nome,
                    limiteAlunos: plano.limiteAlunos,
                    novaDataExpiracao: personalPlano.dataVencimento
                }
            };
            
        } catch (error) {
            console.error('❌ Error getting tokens for renewal:', error);
            throw error;
        }
    }
}

export default new TokenService();