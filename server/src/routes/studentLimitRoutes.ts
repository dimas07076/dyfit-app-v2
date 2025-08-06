// server/src/routes/studentLimitRoutes.ts
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import StudentLimitService from '../../services/StudentLimitService.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import dbConnect from '../../lib/dbConnect.js';

const router = express.Router();

/**
 * GET /api/student-limit/status
 * Get current student limit status for authenticated personal trainer
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        console.log(`[StudentLimitRoutes] GET /status - Personal Trainer ID: ${personalTrainerId}`);
        
        if (!personalTrainerId) {
            console.log(`[StudentLimitRoutes] Unauthorized access attempt`);
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const status = await StudentLimitService.getStudentLimitStatus(personalTrainerId);
        
        console.log(`[StudentLimitRoutes] Returning status for ${personalTrainerId}:`, {
            canActivate: status.canActivate,
            currentLimit: status.currentLimit,
            activeStudents: status.activeStudents,
            availableSlots: status.availableSlots,
            tokensAvulsos: status.planInfo?.tokensAvulsos
        });
        
        return res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('❌ Error getting student limit status:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/student-limit/validate-activation
 * Validate if personal trainer can activate specified number of students
 */
router.post('/validate-activation', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const { quantidade = 1 } = req.body;
        
        if (typeof quantidade !== 'number' || quantidade < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantidade deve ser um número positivo',
                code: 'INVALID_QUANTITY'
            });
        }

        const validation = await StudentLimitService.validateStudentActivation(personalTrainerId, quantidade);
        
        return res.json({
            success: validation.isValid,
            message: validation.message,
            code: validation.errorCode,
            data: validation.status
        });
    } catch (error) {
        console.error('Error validating student activation:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/student-limit/validate-invite
 * Validate if personal trainer can send student invite
 */
router.post('/validate-invite', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const validation = await StudentLimitService.validateSendInvite(personalTrainerId);
        
        return res.json({
            success: validation.isValid,
            message: validation.message,
            code: validation.errorCode,
            data: validation.status
        });
    } catch (error) {
        console.error('Error validating send invite:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/student-limit/detailed-breakdown
 * Get detailed limit breakdown (mainly for admin/debug purposes)
 */
router.get('/detailed-breakdown', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const breakdown = await StudentLimitService.getDetailedLimitBreakdown(personalTrainerId);
        
        return res.json({
            success: true,
            data: breakdown
        });
    } catch (error) {
        console.error('Error getting detailed breakdown:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/student-limit/debug-tokens
 * Debug endpoint to inspect token calculation (development only)
 */
router.get('/debug-tokens', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        // Import TokenAvulso directly for debug
        const TokenAvulso = (await import('../../models/TokenAvulso.js')).default;
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        
        console.log(`[DEBUG] Analyzing tokens for personal: ${personalTrainerId}`);
        console.log(`[DEBUG] Personal ID type: ${typeof personalTrainerId}`);
        
        const now = new Date();
        console.log(`[DEBUG] Current time: ${now.toISOString()}`);
        
        // Get all tokens for this personal (no filters)
        const allTokens = await TokenAvulso.find({
            personalTrainerId: personalTrainerId
        }).lean();
        
        console.log(`[DEBUG] Found ${allTokens.length} total tokens`);
        
        // Get active tokens using exact same query as service
        const activeTokens = await TokenAvulso.find({
            personalTrainerId: personalTrainerId,
            ativo: true,
            dataVencimento: { $gt: now }
        }).lean();
        
        console.log(`[DEBUG] Found ${activeTokens.length} active tokens`);
        
        // Get tokens using service method
        const serviceTokenCount = await PlanoService.getTokensAvulsosAtivos(personalTrainerId);
        console.log(`[DEBUG] Service returned: ${serviceTokenCount} tokens`);
        
        // Analysis
        const tokenAnalysis = allTokens.map(token => ({
            id: token._id.toString(),
            quantidade: token.quantidade,
            ativo: token.ativo,
            dataVencimento: token.dataVencimento,
            isExpired: token.dataVencimento <= now,
            personalTrainerId: token.personalTrainerId.toString(),
            isActive: token.ativo && token.dataVencimento > now,
            daysTillExpiry: Math.ceil((token.dataVencimento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }));
        
        const activeTokensSum = activeTokens.reduce((sum, token) => sum + (token.quantidade || 0), 0);
        
        return res.json({
            success: true,
            debug: {
                personalTrainerId,
                personalIdType: typeof personalTrainerId,
                currentTime: now.toISOString(),
                totalTokenRecords: allTokens.length,
                activeTokenRecords: activeTokens.length,
                activeTokensSum,
                serviceTokenCount,
                tokenAnalysis,
                queryResults: {
                    allTokensQuery: allTokens.length,
                    activeTokensQuery: activeTokens.length,
                    serviceMethod: serviceTokenCount
                },
                calculations: {
                    expectedActiveSum: activeTokensSum,
                    actualServiceResult: serviceTokenCount,
                    matches: activeTokensSum === serviceTokenCount
                }
            }
        });
    } catch (error) {
        console.error('Error in debug-tokens:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro no debug de tokens',
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
});

/**
 * POST /api/student-limit/force-refresh
 * Force refresh of student limit cache (useful after admin operations)
 */
router.post('/force-refresh', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        console.log(`[StudentLimit] 🔄 Force refresh requested for personal: ${personalTrainerId}`);
        
        // Force fresh calculation
        const status = await StudentLimitService.getStudentLimitStatus(personalTrainerId);
        
        console.log(`[StudentLimit] ✅ Force refresh completed:`, {
            canActivate: status.canActivate,
            currentLimit: status.currentLimit,
            availableSlots: status.availableSlots,
            tokensAvulsos: status.planInfo?.tokensAvulsos
        });
        
        return res.json({
            success: true,
            data: status,
            message: 'Status atualizado com sucesso',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in force refresh:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/student-limit/consumed-tokens
 * Get consumed tokens with student details for personal trainer
 */
router.get('/consumed-tokens', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        const TokenAssignmentService = (await import('../../services/TokenAssignmentService.js')).default;
        
        console.log(`[StudentLimitRoutes] GET /consumed-tokens - Personal Trainer ID: ${personalTrainerId}`);
        
        const tokenAssignmentStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        
        console.log(`[StudentLimitRoutes] Returning consumed tokens for ${personalTrainerId}:`, {
            consumedTokens: tokenAssignmentStatus.consumedTokens,
            totalConsumedRecords: tokenAssignmentStatus.consumedTokenDetails.length
        });
        
        return res.json({
            success: true,
            data: {
                summary: {
                    availableTokens: tokenAssignmentStatus.availableTokens,
                    consumedTokens: tokenAssignmentStatus.consumedTokens,
                    totalTokens: tokenAssignmentStatus.totalTokens,
                },
                consumedTokenDetails: tokenAssignmentStatus.consumedTokenDetails
            }
        });
    } catch (error) {
        console.error('❌ Error getting consumed tokens:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/student-limit/debug-assignment
 * Comprehensive debug endpoint for token assignment troubleshooting
 */
router.get('/debug-assignment', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        console.log(`[StudentLimitRoutes] 🔧 DEBUG - Starting comprehensive token assignment analysis for personal: ${personalTrainerId}`);
        
        // Import required services
        const TokenAssignmentService = (await import('../../services/TokenAssignmentService.js')).default;
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        const TokenAvulso = (await import('../../models/TokenAvulso.js')).default;
        const Aluno = (await import('../../models/Aluno.js')).default;
        
        // Get all tokens for this personal trainer
        const allTokens = await TokenAvulso.find({
            personalTrainerId: personalTrainerId
        }).sort({ createdAt: -1 });
        
        // Get all students for this personal trainer  
        const allStudents = await Aluno.find({
            trainerId: personalTrainerId
        }).select('nome email status createdAt').sort({ createdAt: -1 });
        
        // Get current status from services
        const tokenAssignmentStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
        const limitStatus = await StudentLimitService.getStudentLimitStatus(personalTrainerId);
        
        // Analyze current state
        const now = new Date();
        const tokenAnalysis = allTokens.map(token => ({
            tokenId: (token._id as any).toString(),
            quantidade: token.quantidade,
            dataVencimento: token.dataVencimento,
            isExpired: token.dataVencimento <= now,
            ativo: token.ativo,
            assignedToStudentId: token.assignedToStudentId?.toString() || null,
            dateAssigned: token.dateAssigned,
            motivoAdicao: token.motivoAdicao,
            createdAt: token.createdAt
        }));
        
        const studentAnalysis = allStudents.map(student => ({
            studentId: (student._id as any).toString(),
            nome: student.nome,
            email: student.email,
            status: student.status,
            createdAt: student.createdAt,
            hasAssignedToken: allTokens.some(t => t.assignedToStudentId?.toString() === (student._id as any).toString())
        }));
        
        console.log(`[StudentLimitRoutes] 🔧 DEBUG - Analysis complete:`, {
            totalTokens: allTokens.length,
            totalStudents: allStudents.length,
            availableTokens: tokenAssignmentStatus.availableTokens,
            consumedTokens: tokenAssignmentStatus.consumedTokens,
            activeStudents: allStudents.filter(s => s.status === 'active').length,
            canActivate: limitStatus.canActivate
        });
        
        return res.json({
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                personalTrainerId,
                overview: {
                    totalTokens: allTokens.length,
                    totalStudents: allStudents.length,
                    activeStudents: allStudents.filter(s => s.status === 'active').length,
                    inactiveStudents: allStudents.filter(s => s.status === 'inactive').length
                },
                tokenSummary: {
                    availableTokens: tokenAssignmentStatus.availableTokens,
                    consumedTokens: tokenAssignmentStatus.consumedTokens,
                    totalTokens: tokenAssignmentStatus.totalTokens,
                    expiredTokens: allTokens.filter(t => t.dataVencimento <= now).length
                },
                planInfo: {
                    planName: planStatus.plano?.nome || 'No Plan',
                    planLimit: planStatus.plano?.limiteAlunos || 0,
                    isExpired: planStatus.isExpired,
                    currentLimit: planStatus.limiteAtual
                },
                limitStatus: {
                    canActivate: limitStatus.canActivate,
                    availableSlots: limitStatus.availableSlots,
                    limitExceeded: limitStatus.limitExceeded,
                    message: limitStatus.message
                },
                tokenDetails: tokenAnalysis,
                studentDetails: studentAnalysis,
                possibleIssues: {
                    tokensWithoutStudents: tokenAnalysis.filter(t => t.assignedToStudentId && !studentAnalysis.some(s => s.studentId === t.assignedToStudentId)),
                    studentsWithoutTokens: studentAnalysis.filter(s => s.status === 'active' && !s.hasAssignedToken),
                    expiredAssignedTokens: tokenAnalysis.filter(t => t.assignedToStudentId && t.isExpired),
                    inactiveStudentsWithTokens: allStudents.filter(s => s.status === 'inactive').map(s => ({
                        studentId: (s._id as any).toString(),
                        nome: s.nome,
                        hasToken: allTokens.some(t => t.assignedToStudentId?.toString() === (s._id as any).toString())
                    })).filter(s => s.hasToken)
                }
            }
        });
    } catch (error) {
        console.error('❌ Error in debug assignment endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/student-limit/debug-real-time
 * Real-time debug endpoint to show live token and student status
 */
router.get('/debug-real-time', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        const personalTrainerId = req.user?.id;
        if (!personalTrainerId) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não autenticado',
                code: 'UNAUTHORIZED'
            });
        }

        console.log(`[StudentLimitRoutes] 🔧 REAL-TIME DEBUG - Starting analysis for personal: ${personalTrainerId}`);
        
        // Import required services
        const TokenAssignmentService = (await import('../../services/TokenAssignmentService.js')).default;
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        const TokenAvulso = (await import('../../models/TokenAvulso.js')).default;
        const Aluno = (await import('../../models/Aluno.js')).default;
        
        const now = new Date();
        
        // Get ALL tokens for this personal trainer - no filters
        const allTokensRaw = await TokenAvulso.find({
            personalTrainerId: personalTrainerId
        }).sort({ createdAt: -1 });
        
        // Get ALL students for this personal trainer
        const allStudentsRaw = await Aluno.find({
            trainerId: personalTrainerId
        }).select('nome email status createdAt').sort({ createdAt: -1 });
        
        // Process tokens
        const tokenDetails = allTokensRaw.map(token => {
            const isExpired = token.dataVencimento <= now;
            const isActive = token.ativo && !isExpired;
            const isAssigned = !!token.assignedToStudentId;
            const isAvailable = isActive && !isAssigned;
            
            return {
                tokenId: (token._id as mongoose.Types.ObjectId).toString(),
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
        });
        
        // Process students
        const studentDetails = allStudentsRaw.map(student => {
            const assignedToken = tokenDetails.find(t => t.assignedToStudentId === (student._id as mongoose.Types.ObjectId).toString());
            
            return {
                studentId: (student._id as mongoose.Types.ObjectId).toString(),
                nome: student.nome,
                email: student.email,
                status: student.status,
                createdAt: student.createdAt.toISOString(),
                hasAssignedToken: !!assignedToken,
                assignedTokenId: assignedToken?.tokenId || null,
                assignedTokenExpired: assignedToken ? assignedToken.isExpired : null
            };
        });;
        
        // Calculate summaries
        const activeTokens = tokenDetails.filter(t => t.isActive);
        const availableTokens = tokenDetails.filter(t => t.isAvailable);
        const assignedTokens = tokenDetails.filter(t => t.isAssigned && t.isActive);
        const expiredTokens = tokenDetails.filter(t => t.isExpired);
        
        const activeStudents = studentDetails.filter(s => s.status === 'active');
        const inactiveStudents = studentDetails.filter(s => s.status === 'inactive');
        const inactiveStudentsWithTokens = inactiveStudents.filter(s => s.hasAssignedToken);
        
        // Get service calculations
        const tokenAssignmentStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
        const canActivateStatus = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
        
        // Calculate totals
        const totalAvailableQuantity = availableTokens.reduce((sum, t) => sum + t.quantidade, 0);
        const totalAssignedQuantity = assignedTokens.reduce((sum, t) => sum + t.quantidade, 0);
        const totalActiveQuantity = activeTokens.reduce((sum, t) => sum + t.quantidade, 0);
        
        console.log(`[StudentLimitRoutes] 🔧 REAL-TIME DEBUG - Analysis complete:`, {
            totalTokenRecords: allTokensRaw.length,
            totalStudents: allStudentsRaw.length,
            availableTokens: totalAvailableQuantity,
            assignedTokens: totalAssignedQuantity,
            activeStudents: activeStudents.length,
            canActivate: canActivateStatus.canActivate,
            availableSlots: canActivateStatus.availableSlots
        });
        
        return res.json({
            success: true,
            data: {
                timestamp: now.toISOString(),
                personalTrainerId,
                summary: {
                    totalTokenRecords: allTokensRaw.length,
                    totalStudents: allStudentsRaw.length,
                    activeStudents: activeStudents.length,
                    inactiveStudents: inactiveStudents.length,
                    inactiveStudentsWithTokens: inactiveStudentsWithTokens.length
                },
                tokenSummary: {
                    totalTokenRecords: allTokensRaw.length,
                    activeTokenRecords: activeTokens.length,
                    availableTokenRecords: availableTokens.length,
                    assignedTokenRecords: assignedTokens.length,
                    expiredTokenRecords: expiredTokens.length,
                    totalAvailableQuantity,
                    totalAssignedQuantity,
                    totalActiveQuantity
                },
                serviceSummary: {
                    tokenAssignmentStatus: {
                        availableTokens: tokenAssignmentStatus.availableTokens,
                        consumedTokens: tokenAssignmentStatus.consumedTokens,
                        totalTokens: tokenAssignmentStatus.totalTokens
                    },
                    planStatus: {
                        planName: planStatus.plano?.nome || 'No Plan',
                        planLimit: planStatus.plano?.limiteAlunos || 0,
                        totalLimit: planStatus.limiteAtual,
                        activeStudents: planStatus.alunosAtivos,
                        isExpired: planStatus.isExpired
                    },
                    canActivateStatus: {
                        canActivate: canActivateStatus.canActivate,
                        currentLimit: canActivateStatus.currentLimit,
                        activeStudents: canActivateStatus.activeStudents,
                        availableSlots: canActivateStatus.availableSlots
                    }
                },
                detailedBreakdown: {
                    tokens: tokenDetails,
                    students: studentDetails,
                    inactiveStudentsWithTokens: inactiveStudentsWithTokens
                },
                validation: {
                    serviceVsRawTokensMatch: totalAvailableQuantity === tokenAssignmentStatus.availableTokens,
                    serviceVsRawAssignedMatch: totalAssignedQuantity === tokenAssignmentStatus.consumedTokens,
                    expectedBehavior: {
                        tokensShoudRemainAssignedWhenStudentInactive: true,
                        inactiveStudentsWithTokensCount: inactiveStudentsWithTokens.length,
                        shouldNotIncreaseAvailableSlots: 'When student goes inactive, assigned tokens should NOT become available'
                    }
                }
            }
        });
    } catch (error) {
        console.error('❌ Error in real-time debug endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            code: 'INTERNAL_ERROR'
        });
    }
});

export default router;