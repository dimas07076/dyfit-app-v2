// server/services/TokenService.ts
import Token, { IToken } from '../models/Token.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

export interface AvailableTokensResponse {
    plan: {
        total: number;
        available: number;
        expirationDate?: string;
    };
    avulso: {
        total: number;
        available: number;
    };
    availableSlots: number;
    hasPlan: boolean;
}

export interface TokenAssignResult {
    tokenId: string;
    type: 'Plano' | 'Avulso';
    expirationDate: string;
    status: 'Ativo' | 'Expirado';
}

export interface TokenStatus {
    tokenId: string;
    type: 'Plano' | 'Avulso';
    expirationDate: string;
    status: 'Ativo' | 'Expirado';
}

export class TokenService {
    /**
     * Get available tokens for a personal trainer by type and totals
     */
    async getAvailableTokens(personalId: string): Promise<AvailableTokensResponse> {
        try {
            console.log(`[TokenService] 🎯 Getting available tokens for personal: ${personalId}`);
            
            // Update expired tokens first
            await (Token as any).updateExpiredTokens();
            
            const now = new Date();
            
            // Get plan tokens
            const planTokens = await Token.find({
                personalId: personalId,
                type: 'Plano',
                status: 'Ativo',
                expirationDate: { $gt: now }
            });
            
            // Get avulso tokens
            const avulsoTokens = await Token.find({
                personalId: personalId,
                type: 'Avulso',
                status: 'Ativo',
                expirationDate: { $gt: now }
            });
            
            // Calculate available (unassigned) tokens
            const availablePlanTokens = planTokens.filter(token => !token.studentId);
            const availableAvulsoTokens = avulsoTokens.filter(token => !token.studentId);
            
            // Get plan expiration date (earliest plan token expiration)
            const planExpirationDate = planTokens.length > 0 
                ? planTokens.reduce((earliest, token) => 
                    token.expirationDate < earliest ? token.expirationDate : earliest, 
                    planTokens[0].expirationDate
                ).toISOString()
                : undefined;
            
            const result: AvailableTokensResponse = {
                plan: {
                    total: planTokens.length,
                    available: availablePlanTokens.length,
                    expirationDate: planExpirationDate
                },
                avulso: {
                    total: avulsoTokens.length,
                    available: availableAvulsoTokens.length
                },
                availableSlots: availablePlanTokens.length + availableAvulsoTokens.length,
                hasPlan: planTokens.length > 0
            };
            
            console.log(`[TokenService] 📊 Available tokens result:`, result);
            return result;
            
        } catch (error) {
            console.error('❌ Error getting available tokens:', error);
            throw error;
        }
    }
    
    /**
     * Assign token to student with priority (Plan > Avulso)
     * Idempotent by studentId
     */
    async assignToken(studentId: string, type?: 'Plano' | 'Avulso'): Promise<TokenAssignResult> {
        try {
            console.log(`[TokenService] 🎯 Assigning token to student: ${studentId}, type: ${type || 'auto'}`);
            
            // Validate student exists and get personalId
            const student = await Aluno.findById(studentId).select('trainerId nome');
            if (!student) {
                throw new Error('Student not found');
            }
            
            const personalId = student.trainerId;
            
            // Check if student already has a token (idempotent behavior)
            const existingToken = await Token.findOne({
                personalId: personalId,
                studentId: studentId,
                status: 'Ativo'
            });
            
            if (existingToken) {
                console.log(`[TokenService] ✅ Student ${studentId} already has token ${existingToken.id}`);
                return {
                    tokenId: existingToken.id,
                    type: existingToken.type,
                    expirationDate: existingToken.expirationDate.toISOString(),
                    status: existingToken.status
                };
            }
            
            // Update expired tokens first
            await (Token as any).updateExpiredTokens();
            
            const now = new Date();
            let targetToken: IToken | null = null;
            
            if (type) {
                // Find specific type token
                targetToken = await Token.findOne({
                    personalId: personalId,
                    type: type,
                    studentId: null,
                    status: 'Ativo',
                    expirationDate: { $gt: now }
                }).sort({ expirationDate: 1 }); // Expire sooner first
                
                if (!targetToken) {
                    throw new Error(`No available ${type} tokens found`);
                }
            } else {
                // Apply priority: Plan > Avulso
                targetToken = await Token.findOne({
                    personalId: personalId,
                    type: 'Plano',
                    studentId: null,
                    status: 'Ativo',
                    expirationDate: { $gt: now }
                }).sort({ expirationDate: 1 });
                
                if (!targetToken) {
                    targetToken = await Token.findOne({
                        personalId: personalId,
                        type: 'Avulso',
                        studentId: null,
                        status: 'Ativo',
                        expirationDate: { $gt: now }
                    }).sort({ expirationDate: 1 });
                }
                
                if (!targetToken) {
                    throw new Error('No available tokens found');
                }
            }
            
            // Validate tenant (personal of student = personal of token)
            if (targetToken.personalId.toString() !== personalId.toString()) {
                throw new Error('Token tenant mismatch');
            }
            
            // Assign token to student
            targetToken.studentId = new mongoose.Types.ObjectId(studentId);
            await targetToken.save();
            
            console.log(`[TokenService] ✅ Assigned ${targetToken.type} token ${targetToken.id} to student ${student.nome}`);
            
            return {
                tokenId: targetToken.id,
                type: targetToken.type,
                expirationDate: targetToken.expirationDate.toISOString(),
                status: targetToken.status
            };
            
        } catch (error) {
            console.error('❌ Error assigning token:', error);
            throw error;
        }
    }
    
    /**
     * Consume token - alias for assignToken without forcing type
     */
    async consumeToken(studentId: string): Promise<TokenAssignResult> {
        return this.assignToken(studentId);
    }
    
    /**
     * Get token assigned to a specific student
     */
    async getStudentToken(studentId: string): Promise<TokenStatus | null> {
        try {
            console.log(`[TokenService] 🔍 Getting token for student: ${studentId}`);
            
            const token = await Token.findOne({
                studentId: studentId,
                status: 'Ativo'
            });
            
            if (!token) {
                console.log(`[TokenService] ❌ No token found for student: ${studentId}`);
                return null;
            }
            
            console.log(`[TokenService] ✅ Found ${token.type} token ${token.id} for student: ${studentId}`);
            
            return {
                tokenId: token.id,
                type: token.type,
                expirationDate: token.expirationDate.toISOString(),
                status: token.status
            };
            
        } catch (error) {
            console.error('❌ Error getting student token:', error);
            return null;
        }
    }
    
    /**
     * Utility function to check if a token is valid
     */
    isTokenValid(token: IToken): boolean {
        const now = new Date();
        return token.status === 'Ativo' && token.expirationDate > now;
    }
    
    /**
     * Create plan tokens when a plan is assigned to a personal trainer
     */
    async createPlanTokens(personalId: string, planLimit: number, expirationDate: Date): Promise<void> {
        try {
            console.log(`[TokenService] 🏗️ Creating ${planLimit} plan tokens for personal: ${personalId}`);
            
            // Remove existing plan tokens for this personal (in case of plan change)
            await Token.deleteMany({
                personalId: personalId,
                type: 'Plano'
            });
            
            // Create individual plan tokens
            const tokens = [];
            for (let i = 0; i < planLimit; i++) {
                tokens.push({
                    type: 'Plano',
                    personalId: personalId,
                    expirationDate: expirationDate,
                    status: 'Ativo'
                });
            }
            
            await Token.insertMany(tokens);
            console.log(`[TokenService] ✅ Created ${planLimit} plan tokens for personal: ${personalId}`);
            
        } catch (error) {
            console.error('❌ Error creating plan tokens:', error);
            throw error;
        }
    }
    
    /**
     * Create avulso tokens
     */
    async createAvulsoTokens(personalId: string, quantity: number, expirationDate: Date): Promise<void> {
        try {
            console.log(`[TokenService] 🏗️ Creating ${quantity} avulso tokens for personal: ${personalId}`);
            
            // Create individual avulso tokens
            const tokens = [];
            for (let i = 0; i < quantity; i++) {
                tokens.push({
                    type: 'Avulso',
                    personalId: personalId,
                    expirationDate: expirationDate,
                    status: 'Ativo'
                });
            }
            
            await Token.insertMany(tokens);
            console.log(`[TokenService] ✅ Created ${quantity} avulso tokens for personal: ${personalId}`);
            
        } catch (error) {
            console.error('❌ Error creating avulso tokens:', error);
            throw error;
        }
    }
    
    /**
     * Migrate existing TokenAvulso records to new Token system
     */
    async migrateFromTokenAvulso(personalId?: string): Promise<{ migrated: number; errors: number }> {
        try {
            console.log(`[TokenService] 🔄 Starting migration from TokenAvulso to Token system`);
            
            // Import old TokenAvulso model
            const TokenAvulso = (await import('../models/TokenAvulso.js')).default;
            
            const query = personalId ? { personalTrainerId: personalId } : {};
            const oldTokens = await TokenAvulso.find(query);
            
            let migrated = 0;
            let errors = 0;
            
            for (const oldToken of oldTokens) {
                try {
                    // Create individual tokens based on quantity
                    for (let i = 0; i < oldToken.quantidade; i++) {
                        const newToken = new Token({
                            type: 'Avulso',
                            personalId: oldToken.personalTrainerId,
                            studentId: oldToken.assignedToStudentId || null,
                            expirationDate: oldToken.dataVencimento,
                            status: oldToken.ativo && oldToken.dataVencimento > new Date() ? 'Ativo' : 'Expirado'
                        });
                        
                        await newToken.save();
                        migrated++;
                    }
                } catch (error) {
                    console.error(`❌ Error migrating token ${oldToken._id}:`, error);
                    errors++;
                }
            }
            
            console.log(`[TokenService] ✅ Migration complete: ${migrated} tokens migrated, ${errors} errors`);
            return { migrated, errors };
            
        } catch (error) {
            console.error('❌ Error during migration:', error);
            throw error;
        }
    }
    
    /**
     * Get comprehensive token statistics for a personal trainer
     */
    async getTokenStats(personalId: string): Promise<{
        total: number;
        available: number;
        consumed: number;
        expired: number;
        byType: {
            plan: { total: number; available: number; consumed: number; expired: number };
            avulso: { total: number; available: number; consumed: number; expired: number };
        };
    }> {
        try {
            const [allTokens] = await Promise.all([
                Token.find({ personalId: personalId }),
                (Token as any).updateExpiredTokens() // Update expired status
            ]);
            
            const now = new Date();
            
            const stats = {
                total: allTokens.length,
                available: 0,
                consumed: 0,
                expired: 0,
                byType: {
                    plan: { total: 0, available: 0, consumed: 0, expired: 0 },
                    avulso: { total: 0, available: 0, consumed: 0, expired: 0 }
                }
            };
            
            for (const token of allTokens) {
                const typeKey = token.type === 'Plano' ? 'plan' : 'avulso';
                stats.byType[typeKey].total++;
                
                if (token.expirationDate <= now || token.status === 'Expirado') {
                    stats.expired++;
                    stats.byType[typeKey].expired++;
                } else if (token.studentId) {
                    stats.consumed++;
                    stats.byType[typeKey].consumed++;
                } else {
                    stats.available++;
                    stats.byType[typeKey].available++;
                }
            }
            
            return stats;
            
        } catch (error) {
            console.error('❌ Error getting token stats:', error);
            throw error;
        }
    }
}

export default new TokenService();