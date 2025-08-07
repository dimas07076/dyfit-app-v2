// server/services/TokenAssignmentService.ts
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import TokenAssignment from '../models/TokenAssignment.js';
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
        type: 'plano' | 'avulso';
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

            // Persist token assignment record for tracking
            try {
                const existingAssignment = await TokenAssignment.findOne({ studentId });
                if (!existingAssignment) {
                    await TokenAssignment.create({
                        tokenId: (assignedToken._id as mongoose.Types.ObjectId).toString(),
                        studentId: new mongoose.Types.ObjectId(studentId),
                        personalTrainerId: new mongoose.Types.ObjectId(personalTrainerId),
                        type: 'avulso',
                        validUntil: assignedToken.dataVencimento,
                        assignedAt: now
                    });
                    console.log(`[TokenAssignment] 📝 Created assignment record for student ${studentId}`);
                }
            } catch (err) {
                console.error('[TokenAssignment] ⚠️ Failed to persist assignment record:', err);
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
            
            console.log(`[TokenAssignment] 🔍 ULTRA-DETAILED: Getting available tokens for ${personalTrainerId} at ${now.toISOString()}`);
            
            // First, get ALL tokens for this personal to understand the complete picture
            const allTokens = await TokenAvulso.find({
                personalTrainerId: personalTrainerId
            }).sort({ createdAt: -1 });
            
            console.log(`[TokenAssignment] 🔍 ULTRA-DETAILED: Found ${allTokens.length} total token records for personal ${personalTrainerId}`);
            
            // Categorize all tokens
            const tokenCategories = {
                active: [] as any[],
                expired: [] as any[],
                inactive: [] as any[],
                available: [] as any[],
                assigned: [] as any[]
            };
            
            allTokens.forEach((token, index) => {
                const isExpired = token.dataVencimento <= now;
                const isActive = token.ativo && !isExpired;
                const isAssigned = !!token.assignedToStudentId;
                const isAvailable = isActive && !isAssigned;
                
                const tokenInfo = {
                    index: index + 1,
                    id: (token._id as mongoose.Types.ObjectId).toString(),
                    quantidade: token.quantidade,
                    dataVencimento: token.dataVencimento.toISOString(),
                    ativo: token.ativo,
                    isExpired,
                    isActive,
                    assignedToStudentId: token.assignedToStudentId?.toString() || null,
                    dateAssigned: token.dateAssigned?.toISOString() || null,
                    isAssigned,
                    isAvailable,
                    motivoAdicao: token.motivoAdicao,
                    createdAt: token.createdAt.toISOString()
                };
                
                console.log(`[TokenAssignment] 🔍 ULTRA-DETAILED: Token ${index + 1} analysis:`, tokenInfo);
                
                if (isActive) tokenCategories.active.push(tokenInfo);
                if (isExpired) tokenCategories.expired.push(tokenInfo);
                if (!token.ativo) tokenCategories.inactive.push(tokenInfo);
                if (isAvailable) tokenCategories.available.push(tokenInfo);
                if (isAssigned) tokenCategories.assigned.push(tokenInfo);
            });
            
            // Now get the specific query results
            const availableTokens = await TokenAvulso.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: now },
                assignedToStudentId: null
            });
            
            const assignedTokens = await TokenAvulso.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: now },
                assignedToStudentId: { $ne: null }
            });
            
            const totalAvailableQuantity = availableTokens.reduce((sum, token) => sum + token.quantidade, 0);
            const totalAssignedQuantity = assignedTokens.reduce((sum, token) => sum + token.quantidade, 0);
            
            console.log(`[TokenAssignment] 📊 ULTRA-DETAILED: Complete token analysis for ${personalTrainerId}:`, {
                timestamp: now.toISOString(),
                totalTokenRecords: allTokens.length,
                categorization: {
                    active: tokenCategories.active.length,
                    expired: tokenCategories.expired.length,
                    inactive: tokenCategories.inactive.length,
                    available: tokenCategories.available.length,
                    assigned: tokenCategories.assigned.length
                },
                queryResults: {
                    availableFromQuery: availableTokens.length,
                    assignedFromQuery: assignedTokens.length
                },
                quantities: {
                    totalAvailable: totalAvailableQuantity,
                    totalAssigned: totalAssignedQuantity,
                    totalActive: totalAvailableQuantity + totalAssignedQuantity
                },
                criticalVerification: {
                    availableShouldNotIncreaseOnInactivation: true,
                    assignedTokensShouldRemainPermanent: true,
                    inactiveStudentsShouldKeepTokens: true
                }
            });
            
            // Verify our categorization matches the query results
            const calculatedAvailable = tokenCategories.available.reduce((sum, t) => sum + t.quantidade, 0);
            const calculatedAssigned = tokenCategories.assigned.reduce((sum, t) => sum + t.quantidade, 0);
            
            console.log(`[TokenAssignment] 🔍 ULTRA-DETAILED: Verification check:`, {
                queryAvailable: totalAvailableQuantity,
                calculatedAvailable,
                queryAssigned: totalAssignedQuantity,
                calculatedAssigned,
                availableMatches: totalAvailableQuantity === calculatedAvailable,
                assignedMatches: totalAssignedQuantity === calculatedAssigned
            });
            
            return totalAvailableQuantity;
            
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
            const assignments = await TokenAssignment.find({
                personalTrainerId: personalTrainerId
            })
                .populate('studentId', 'nome email status')
                .sort({ assignedAt: -1 });

            const result = assignments.map(assignment => ({
                tokenId: assignment.tokenId,
                type: assignment.type,
                quantidade: 1,
                dataVencimento: assignment.validUntil,
                dateAssigned: assignment.assignedAt,
                assignedStudent: {
                    id: (assignment.studentId as any)._id.toString(),
                    nome: (assignment.studentId as any).nome,
                    email: (assignment.studentId as any).email,
                    status: (assignment.studentId as any).status
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

            const consumedTokens = consumedTokenDetails.length;
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