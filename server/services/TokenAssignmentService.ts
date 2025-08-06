// server/services/TokenAssignmentService.ts
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

export interface TokenAssignmentResult {
    success: boolean;
    message: string;
    assignedToken?: ITokenAvulso;
    errorCode?: string;
}

export interface TokenAssignmentStatus {
    availableTokens: number;
    consumedTokens: number;
    totalTokens: number;
    consumedTokenDetails: Array<{
        tokenId: string;
        quantidade: number;
        dataVencimento: Date;
        dateAssigned: Date;
        assignedStudent: {
            id: string;
            nome: string;
            email: string;
            status: 'active' | 'inactive';
        };
    }>;
}

export class TokenAssignmentService {
    /**
     * Assign a token to a student when they are created or activated
     */
    async assignTokenToStudent(
        personalTrainerId: string, 
        studentId: string,
        requiredTokens: number = 1
    ): Promise<TokenAssignmentResult> {
        try {
            console.log(`[TokenAssignment] 🎯 Assigning ${requiredTokens} token(s) to student ${studentId} for personal ${personalTrainerId}`);
            
            const now = new Date();
            
            // Find available tokens (not assigned, active, and not expired)
            const availableTokens = await TokenAvulso.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: now },
                assignedToStudentId: null // Only unassigned tokens
            }).sort({ dataVencimento: 1 }); // Assign tokens that expire first
            
            console.log(`[TokenAssignment] 📊 Found ${availableTokens.length} available token records`);
            
            // Calculate total available token quantity
            const totalAvailableQuantity = availableTokens.reduce((sum, token) => sum + token.quantidade, 0);
            
            console.log(`[TokenAssignment] 🔢 Total available token quantity: ${totalAvailableQuantity}`);
            
            if (totalAvailableQuantity < requiredTokens) {
                return {
                    success: false,
                    message: `Não há tokens suficientes disponíveis. Necessário: ${requiredTokens}, Disponível: ${totalAvailableQuantity}`,
                    errorCode: 'INSUFFICIENT_TOKENS'
                };
            }
            
            // Find the best token to assign (one that has enough quantity)
            let assignedToken: ITokenAvulso | null = null;
            
            // First, try to find a token with exact or more quantity needed
            for (const token of availableTokens) {
                if (token.quantidade >= requiredTokens) {
                    assignedToken = token;
                    break;
                }
            }
            
            // If no single token has enough quantity, we'll use the first available token
            // and reduce its quantity (for simplicity, assuming requiredTokens = 1 for now)
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
                assignedToken.assignedToStudentId = new mongoose.Types.ObjectId(studentId);
                assignedToken.dateAssigned = now;
                await assignedToken.save();
                
                console.log(`[TokenAssignment] ✅ Assigned entire token ${assignedToken._id} (quantity: ${assignedToken.quantidade}) to student ${studentId}`);
            } else if (assignedToken.quantidade > requiredTokens) {
                // Split token: reduce original and create new assigned token
                const originalQuantity = assignedToken.quantidade;
                assignedToken.quantidade = originalQuantity - requiredTokens;
                await assignedToken.save();
                
                // Create new token assigned to student
                const assignedTokenRecord = new TokenAvulso({
                    personalTrainerId: assignedToken.personalTrainerId,
                    quantidade: requiredTokens,
                    dataVencimento: assignedToken.dataVencimento,
                    ativo: true,
                    motivoAdicao: `Token atribuído ao aluno ${studentId}`,
                    adicionadoPorAdmin: assignedToken.adicionadoPorAdmin,
                    assignedToStudentId: new mongoose.Types.ObjectId(studentId),
                    dateAssigned: now
                });
                
                await assignedTokenRecord.save();
                assignedToken = assignedTokenRecord;
                
                console.log(`[TokenAssignment] ✅ Split token: reduced original token to ${originalQuantity - requiredTokens}, created new assigned token ${assignedToken._id} (quantity: ${requiredTokens}) for student ${studentId}`);
            }
            
            return {
                success: true,
                message: `Token atribuído com sucesso ao aluno`,
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
     * Get available (unassigned) tokens for a personal trainer
     */
    async getAvailableTokensCount(personalTrainerId: string): Promise<number> {
        try {
            const now = new Date();
            
            console.log(`[TokenAssignment] 🔍 DETAILED: Getting available tokens for ${personalTrainerId}`);
            console.log(`[TokenAssignment] 🔍 DETAILED: Current time: ${now.toISOString()}`);
            
            const availableTokens = await TokenAvulso.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: now },
                assignedToStudentId: null
            });
            
            console.log(`[TokenAssignment] 🔍 DETAILED: Query for available tokens found ${availableTokens.length} records`);
            
            // Also get assigned tokens for comparison
            const assignedTokens = await TokenAvulso.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: now },
                assignedToStudentId: { $ne: null }
            });
            
            console.log(`[TokenAssignment] 🔍 DETAILED: Query for assigned tokens found ${assignedTokens.length} records`);
            
            // Log details of each token for debugging
            availableTokens.forEach((token, index) => {
                console.log(`[TokenAssignment] 🔍 DETAILED: Available token ${index + 1}:`, {
                    id: (token._id as mongoose.Types.ObjectId).toString(),
                    quantidade: token.quantidade,
                    dataVencimento: token.dataVencimento.toISOString(),
                    assignedToStudentId: token.assignedToStudentId,
                    dateAssigned: token.dateAssigned,
                    isAssigned: !!token.assignedToStudentId
                });
            });
            
            assignedTokens.forEach((token, index) => {
                console.log(`[TokenAssignment] 🔍 DETAILED: Assigned token ${index + 1}:`, {
                    id: (token._id as mongoose.Types.ObjectId).toString(),
                    quantidade: token.quantidade,
                    dataVencimento: token.dataVencimento.toISOString(),
                    assignedToStudentId: token.assignedToStudentId?.toString(),
                    dateAssigned: token.dateAssigned?.toISOString()
                });
            });
            
            const totalQuantity = availableTokens.reduce((sum, token) => sum + token.quantidade, 0);
            const assignedQuantity = assignedTokens.reduce((sum, token) => sum + token.quantidade, 0);
            
            console.log(`[TokenAssignment] 📊 DETAILED: Token calculation summary for ${personalTrainerId}:`, {
                availableTokensCount: availableTokens.length,
                availableQuantity: totalQuantity,
                assignedTokensCount: assignedTokens.length,
                assignedQuantity: assignedQuantity,
                totalQuantity: totalQuantity + assignedQuantity
            });
            
            return totalQuantity;
            
        } catch (error) {
            console.error('❌ Error getting available tokens count:', error);
            return 0;
        }
    }
    
    /**
     * Get consumed (assigned) tokens for a personal trainer with student details
     */
    async getConsumedTokensWithDetails(personalTrainerId: string): Promise<TokenAssignmentStatus['consumedTokenDetails']> {
        try {
            const consumedTokens = await TokenAvulso.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                assignedToStudentId: { $ne: null }
            }).populate('assignedToStudentId', 'nome email status').sort({ dateAssigned: -1 });
            
            const result = consumedTokens.map(token => ({
                tokenId: (token._id as mongoose.Types.ObjectId).toString(),
                quantidade: token.quantidade,
                dataVencimento: token.dataVencimento,
                dateAssigned: token.dateAssigned!,
                assignedStudent: {
                    id: (token.assignedToStudentId as any)._id.toString(),
                    nome: (token.assignedToStudentId as any).nome,
                    email: (token.assignedToStudentId as any).email,
                    status: (token.assignedToStudentId as any).status
                }
            }));
            
            console.log(`[TokenAssignment] 📋 Found ${result.length} consumed tokens for ${personalTrainerId}`);
            return result;
            
        } catch (error) {
            console.error('❌ Error getting consumed tokens details:', error);
            return [];
        }
    }
    
    /**
     * Get complete token assignment status for a personal trainer
     */
    async getTokenAssignmentStatus(personalTrainerId: string): Promise<TokenAssignmentStatus> {
        try {
            const [availableTokens, consumedTokenDetails] = await Promise.all([
                this.getAvailableTokensCount(personalTrainerId),
                this.getConsumedTokensWithDetails(personalTrainerId)
            ]);
            
            const consumedTokens = consumedTokenDetails.reduce((sum, token) => sum + token.quantidade, 0);
            const totalTokens = availableTokens + consumedTokens;
            
            console.log(`[TokenAssignment] 📊 Token status for ${personalTrainerId}:`, {
                available: availableTokens,
                consumed: consumedTokens,
                total: totalTokens
            });
            
            return {
                availableTokens,
                consumedTokens,
                totalTokens,
                consumedTokenDetails
            };
            
        } catch (error) {
            console.error('❌ Error getting token assignment status:', error);
            return {
                availableTokens: 0,
                consumedTokens: 0,
                totalTokens: 0,
                consumedTokenDetails: []
            };
        }
    }
    
    /**
     * Check if a student has an assigned token (for reactivation)
     */
    async getStudentAssignedToken(studentId: string): Promise<ITokenAvulso | null> {
        try {
            console.log(`[TokenAssignment] 🔍 DETAILED: Checking assigned token for student ${studentId}`);
            
            const assignedToken = await TokenAvulso.findOne({
                assignedToStudentId: studentId,
                ativo: true
            });
            
            if (assignedToken) {
                const now = new Date();
                const isExpired = assignedToken.dataVencimento <= now;
                console.log(`[TokenAssignment] 🔍 DETAILED: Student ${studentId} has assigned token:`, {
                    tokenId: (assignedToken._id as mongoose.Types.ObjectId).toString(),
                    quantidade: assignedToken.quantidade,
                    dataVencimento: assignedToken.dataVencimento.toISOString(),
                    isExpired: isExpired,
                    dateAssigned: assignedToken.dateAssigned?.toISOString(),
                    personalTrainerId: assignedToken.personalTrainerId.toString()
                });
                
                return assignedToken;
            }
            
            console.log(`[TokenAssignment] 🔍 DETAILED: Student ${studentId} has no assigned token`);
            return null;
            
        } catch (error) {
            console.error('❌ Error checking student assigned token:', error);
            return null;
        }
    }
}

export default new TokenAssignmentService();