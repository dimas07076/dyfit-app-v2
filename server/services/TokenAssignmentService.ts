// server/services/TokenAssignmentService.ts
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import Token, { IToken } from '../models/Token.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

// Type guards for dual token model compatibility
export function isTokenAvulso(token: ITokenAvulso | IToken): token is ITokenAvulso {
    return 'dataVencimento' in token && 'assignedToStudentId' in token;
}

export function isToken(token: ITokenAvulso | IToken): token is IToken {
    return 'dataExpiracao' in token && 'alunoId' in token;
}

// Utility functions for dual token model access
export function getTokenExpirationDate(token: ITokenAvulso | IToken): Date {
    if (isTokenAvulso(token)) {
        return token.dataVencimento;
    }
    return token.dataExpiracao;
}

export function getTokenAssignedStudentId(token: ITokenAvulso | IToken): mongoose.Types.ObjectId | undefined {
    if (isTokenAvulso(token)) {
        return token.assignedToStudentId || undefined;
    }
    return token.alunoId || undefined;
}

export function setTokenAssignedStudentId(token: ITokenAvulso | IToken, studentId: mongoose.Types.ObjectId | null): void {
    if (isTokenAvulso(token)) {
        token.assignedToStudentId = studentId || undefined;
    } else {
        token.alunoId = studentId || undefined;
    }
}

export interface TokenAssignmentResult {
    success: boolean;
    message: string;
    assignedToken?: ITokenAvulso | IToken;
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
    private useNewTokenModel = true; // Feature flag to switch to new Token model

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
            
            if (this.useNewTokenModel) {
                return this.assignTokenToStudentNewModel(personalTrainerId, studentId, requiredTokens);
            } else {
                return this.assignTokenToStudentLegacy(personalTrainerId, studentId, requiredTokens);
            }
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
     * New Token model implementation
     */
    private async assignTokenToStudentNewModel(
        personalTrainerId: string, 
        studentId: string,
        requiredTokens: number = 1
    ): Promise<TokenAssignmentResult> {
        const now = new Date();
        
        // Check both new Token model and legacy TokenAvulso model for available tokens
        const [newModelTokens, legacyTokens] = await Promise.all([
            // New Token model
            Token.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataExpiracao: { $gt: now },
                alunoId: null
            }).sort({ dataExpiracao: 1 }),
            
            // Legacy TokenAvulso model
            TokenAvulso.find({
                personalTrainerId: personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: now },
                assignedToStudentId: null
            }).sort({ dataVencimento: 1 })
        ]);
        
        console.log(`[TokenAssignment] 📊 Enhanced token search for assignment:`, {
            newModelTokens: newModelTokens.length,
            legacyTokens: legacyTokens.length,
            personalTrainerId
        });
        
        // Calculate total available token quantity from both models
        const newModelQuantity = newModelTokens.reduce((sum, token) => sum + token.quantidade, 0);
        const legacyQuantity = legacyTokens.reduce((sum, token) => sum + token.quantidade, 0);
        const totalAvailableQuantity = newModelQuantity + legacyQuantity;
        
        console.log(`[TokenAssignment] 🔢 Enhanced availability check:`, {
            newModelQuantity,
            legacyQuantity,
            totalAvailable: totalAvailableQuantity,
            required: requiredTokens
        });
        
        if (totalAvailableQuantity < requiredTokens) {
            return {
                success: false,
                message: `Não há tokens suficientes disponíveis. Necessário: ${requiredTokens}, Disponível: ${totalAvailableQuantity}`,
                errorCode: 'INSUFFICIENT_TOKENS'
            };
        }
        
        // Prefer legacy tokens for assignment to maintain compatibility
        // This ensures existing standalone tokens are used first
        let assignedToken: ITokenAvulso | IToken | null = null;
        let isLegacyToken = false;
        
        // First, try to find a legacy token with exact or more quantity needed
        for (const token of legacyTokens) {
            if (token.quantidade >= requiredTokens) {
                assignedToken = token;
                isLegacyToken = true;
                break;
            }
        }
        
        // If no suitable legacy token, try new model tokens
        if (!assignedToken) {
            for (const token of newModelTokens) {
                if (token.quantidade >= requiredTokens) {
                    assignedToken = token;
                    isLegacyToken = false;
                    break;
                }
            }
        }
        
        // If no single token has enough quantity, use the first available token
        if (!assignedToken && requiredTokens === 1) {
            if (legacyTokens.length > 0) {
                assignedToken = legacyTokens[0];
                isLegacyToken = true;
            } else if (newModelTokens.length > 0) {
                assignedToken = newModelTokens[0];
                isLegacyToken = false;
            }
        }
        
        if (!assignedToken) {
            return {
                success: false,
                message: 'Não foi possível encontrar um token adequado para atribuição',
                errorCode: 'NO_SUITABLE_TOKEN'
            };
        }
        
        // Assign the token to the student based on the model type
        if (isLegacyToken) {
            const legacyToken = assignedToken as ITokenAvulso;
            
            if (legacyToken.quantidade === requiredTokens) {
                // Assign entire legacy token to student
                legacyToken.assignedToStudentId = new mongoose.Types.ObjectId(studentId);
                legacyToken.dateAssigned = now;
                await legacyToken.save();
                
                console.log(`[TokenAssignment] ✅ Assigned entire legacy token ${legacyToken._id} (quantity: ${legacyToken.quantidade}) to student ${studentId}`);
            } else if (legacyToken.quantidade > requiredTokens) {
                // Split legacy token: reduce original and create new assigned token
                const originalQuantity = legacyToken.quantidade;
                legacyToken.quantidade = originalQuantity - requiredTokens;
                await legacyToken.save();
                
                // Create new legacy token assigned to student
                const assignedTokenRecord = new TokenAvulso({
                    personalTrainerId: legacyToken.personalTrainerId,
                    quantidade: requiredTokens,
                    dataVencimento: legacyToken.dataVencimento,
                    ativo: true,
                    motivoAdicao: `Token atribuído ao aluno ${studentId}`,
                    adicionadoPorAdmin: legacyToken.adicionadoPorAdmin,
                    assignedToStudentId: new mongoose.Types.ObjectId(studentId),
                    dateAssigned: now
                });
                
                await assignedTokenRecord.save();
                assignedToken = assignedTokenRecord;
                
                console.log(`[TokenAssignment] ✅ Split legacy token: reduced original to ${originalQuantity - requiredTokens}, created new assigned token ${assignedToken._id} (quantity: ${requiredTokens}) for student ${studentId}`);
            }
        } else {
            // Handle new Token model assignment (existing logic)
            const newToken = assignedToken as IToken;
            
            if (newToken.quantidade === requiredTokens) {
                // Assign entire token to student
                newToken.alunoId = new mongoose.Types.ObjectId(studentId);
                newToken.dateAssigned = now;
                await newToken.save();
                
                console.log(`[TokenAssignment] ✅ Assigned entire new token ${newToken.id} (quantity: ${newToken.quantidade}) to student ${studentId}`);
            } else if (newToken.quantidade > requiredTokens) {
                // Split token: reduce original and create new assigned token
                const originalQuantity = newToken.quantidade;
                newToken.quantidade = originalQuantity - requiredTokens;
                await newToken.save();
                
                // Create new token assigned to student
                const assignedTokenRecord = new Token({
                    tipo: newToken.tipo,
                    personalTrainerId: newToken.personalTrainerId,
                    alunoId: new mongoose.Types.ObjectId(studentId),
                    planoId: newToken.planoId,
                    dataExpiracao: newToken.dataExpiracao,
                    ativo: true,
                    quantidade: requiredTokens,
                    dateAssigned: now,
                    adicionadoPorAdmin: newToken.adicionadoPorAdmin,
                    motivoAdicao: `Token atribuído ao aluno ${studentId}`
                });
                
                await assignedTokenRecord.save();
                assignedToken = assignedTokenRecord;
                
                console.log(`[TokenAssignment] ✅ Split new token: reduced original to ${originalQuantity - requiredTokens}, created new assigned token ${assignedTokenRecord.id} (quantity: ${requiredTokens}) for student ${studentId}`);
            }
        }
        
        return {
            success: true,
            message: `Token atribuído com sucesso ao aluno`,
            assignedToken
        };
    }

    /**
     * Legacy TokenAvulso implementation (for backward compatibility)
     */
    private async assignTokenToStudentLegacy(
        personalTrainerId: string, 
        studentId: string,
        requiredTokens: number = 1
    ): Promise<TokenAssignmentResult> {
        const now = new Date();
        
        // Find available tokens (not assigned, active, and not expired)
        const availableTokens = await TokenAvulso.find({
            personalTrainerId: personalTrainerId,
            ativo: true,
            dataVencimento: { $gt: now },
            assignedToStudentId: null // Only unassigned tokens
        }).sort({ dataVencimento: 1 }); // Assign tokens that expire first
        
        console.log(`[TokenAssignment] 📊 Found ${availableTokens.length} available token records (legacy model)`);
        
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
    }
    
    /**
     * Get available (unassigned) tokens for a personal trainer
     */
    async getAvailableTokensCount(personalTrainerId: string): Promise<number> {
        try {
            if (this.useNewTokenModel) {
                return this.getAvailableTokensCountNewModel(personalTrainerId);
            } else {
                return this.getAvailableTokensCountLegacy(personalTrainerId);
            }
        } catch (error) {
            console.error('❌ Error getting available tokens count:', error);
            return 0;
        }
    }

    /**
     * New Token model implementation for available tokens count
     * Enhanced to check both Token and TokenAvulso models for compatibility
     */
    private async getAvailableTokensCountNewModel(personalTrainerId: string): Promise<number> {
        const now = new Date();
        
        // Check new Token model first
        const newModelTokens = await Token.find({
            personalTrainerId: personalTrainerId,
            ativo: true,
            dataExpiracao: { $gt: now },
            alunoId: null
        });
        
        const newModelQuantity = newModelTokens.reduce((sum, token) => sum + token.quantidade, 0);
        
        // Also check legacy TokenAvulso model for backward compatibility
        const legacyTokens = await TokenAvulso.find({
            personalTrainerId: personalTrainerId,
            ativo: true,
            dataVencimento: { $gt: now },
            assignedToStudentId: null
        });
        
        const legacyQuantity = legacyTokens.reduce((sum, token) => sum + token.quantidade, 0);
        
        const totalAvailableQuantity = newModelQuantity + legacyQuantity;
        
        console.log(`[TokenAssignment] 📊 Enhanced new model check for ${personalTrainerId}:`, {
            newModelTokens: newModelQuantity,
            legacyTokens: legacyQuantity,
            totalAvailable: totalAvailableQuantity,
            newModelRecords: newModelTokens.length,
            legacyModelRecords: legacyTokens.length
        });
        
        return totalAvailableQuantity;
    }

    /**
     * Legacy implementation for available tokens count
     */
    private async getAvailableTokensCountLegacy(personalTrainerId: string): Promise<number> {
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
            // Check both legacy TokenAvulso and new Token models for consumed tokens
            const [legacyConsumedTokens, newConsumedTokens] = await Promise.all([
                // Legacy TokenAvulso model
                TokenAvulso.find({
                    personalTrainerId: personalTrainerId,
                    ativo: true,
                    assignedToStudentId: { $ne: null }
                }).populate('assignedToStudentId', 'nome email status').sort({ dateAssigned: -1 }),
                
                // New Token model
                Token.find({
                    personalTrainerId: personalTrainerId,
                    ativo: true,
                    alunoId: { $ne: null }
                }).populate('alunoId', 'nome email status').sort({ dateAssigned: -1 })
            ]);
            
            // Process legacy tokens
            const legacyResult = legacyConsumedTokens.map(token => ({
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
            
            // Process new tokens
            const newResult = newConsumedTokens.map(token => ({
                tokenId: token.id, // Use the formatted ID from new Token model
                quantidade: token.quantidade,
                dataVencimento: token.dataExpiracao,
                dateAssigned: token.dateAssigned!,
                assignedStudent: {
                    id: (token.alunoId as any)._id.toString(),
                    nome: (token.alunoId as any).nome,
                    email: (token.alunoId as any).email,
                    status: (token.alunoId as any).status
                }
            }));
            
            const result = [...legacyResult, ...newResult];
            
            console.log(`[TokenAssignment] 📋 Enhanced consumed tokens check for ${personalTrainerId}:`, {
                legacyConsumed: legacyResult.length,
                newConsumed: newResult.length,
                totalConsumed: result.length
            });
            
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
     * Enhanced to check both Token and TokenAvulso models
     */
    async getStudentAssignedToken(studentId: string): Promise<ITokenAvulso | IToken | null> {
        try {
            console.log(`[TokenAssignment] 🔍 ENHANCED: Checking assigned token for student ${studentId}`);
            
            // Check both legacy TokenAvulso and new Token models
            const [legacyToken, newToken] = await Promise.all([
                TokenAvulso.findOne({
                    assignedToStudentId: studentId,
                    ativo: true
                }),
                Token.findOne({
                    alunoId: studentId,
                    ativo: true
                })
            ]);
            
            // Prefer legacy token if both exist (should not happen but safety first)
            const assignedToken = legacyToken || newToken;
            
            if (assignedToken) {
                const now = new Date();
                const isLegacy = !!legacyToken;
                const isExpired = isLegacy 
                    ? (assignedToken as ITokenAvulso).dataVencimento <= now 
                    : (assignedToken as IToken).dataExpiracao <= now;
                
                console.log(`[TokenAssignment] 🔍 ENHANCED: Student ${studentId} has assigned token:`, {
                    tokenId: isLegacy 
                        ? (assignedToken._id as mongoose.Types.ObjectId).toString()
                        : (assignedToken as IToken).id,
                    tokenModel: isLegacy ? 'TokenAvulso' : 'Token',
                    quantidade: assignedToken.quantidade,
                    dataVencimento: isLegacy 
                        ? (assignedToken as ITokenAvulso).dataVencimento.toISOString()
                        : (assignedToken as IToken).dataExpiracao.toISOString(),
                    isExpired: isExpired,
                    dateAssigned: assignedToken.dateAssigned?.toISOString(),
                    personalTrainerId: assignedToken.personalTrainerId.toString()
                });
                
                return assignedToken;
            }
            
            console.log(`[TokenAssignment] 🔍 ENHANCED: Student ${studentId} has no assigned token in either model`);
            return null;
            
        } catch (error) {
            console.error('❌ Error checking student assigned token:', error);
            return null;
        }
    }
}

export default new TokenAssignmentService();