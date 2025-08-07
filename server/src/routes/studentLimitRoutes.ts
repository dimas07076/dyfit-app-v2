// server/src/routes/studentLimitRoutes.ts
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import StudentLimitService from '../../services/StudentLimitService.js';
import { authenticateToken } from '../../middlewares/authenticateToken.js';
import { getTokenAssignedStudentId, getTokenExpirationDate } from '../../services/TokenAssignmentService.js';
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

/**
 * POST /api/student-limit/test-scenario
 * Test endpoint to simulate the problematic scenario
 */
router.post('/test-scenario', authenticateToken, async (req: Request, res: Response) => {
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

        console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Starting test for personal: ${personalTrainerId}`);
        
        // Import required services
        const TokenAssignmentService = (await import('../../services/TokenAssignmentService.js')).default;
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        const Aluno = (await import('../../models/Aluno.js')).default;
        
        const { action, studentId } = req.body;
        
        if (!action) {
            return res.status(400).json({
                success: false,
                message: 'Action is required (test-create, test-activate, test-deactivate, test-status)',
                code: 'MISSING_ACTION'
            });
        }
        
        const results: any = {
            action,
            timestamp: new Date().toISOString(),
            personalTrainerId
        };
        
        // Get initial state
        const initialTokenStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        const initialCanActivate = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
        
        results.initial = {
            tokens: {
                available: initialTokenStatus.availableTokens,
                consumed: initialTokenStatus.consumedTokens,
                total: initialTokenStatus.totalTokens
            },
            canActivate: {
                canActivate: initialCanActivate.canActivate,
                availableSlots: initialCanActivate.availableSlots,
                currentLimit: initialCanActivate.currentLimit,
                activeStudents: initialCanActivate.activeStudents
            }
        };
        
        console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Initial state:`, results.initial);
        
        // Execute action
        if (action === 'test-status') {
            // Just return current status
            results.action = 'Status check only';
            
        } else if (action === 'test-create' && studentId) {
            // Test token assignment to existing student
            console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Testing token assignment to student ${studentId}`);
            
            const student = await Aluno.findOne({
                _id: studentId,
                trainerId: personalTrainerId
            });
            
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found',
                    code: 'STUDENT_NOT_FOUND'
                });
            }
            
            const existingToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
            results.studentBefore = {
                name: student.nome,
                status: student.status,
                hasToken: !!existingToken,
                tokenId: existingToken?._id?.toString()
            };
            
            if (!existingToken && initialTokenStatus.availableTokens > 0) {
                const assignmentResult = await TokenAssignmentService.assignTokenToStudent(personalTrainerId, studentId, 1);
                results.assignment = assignmentResult;
                console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Assignment result:`, assignmentResult);
            } else {
                results.assignment = { skipped: true, reason: existingToken ? 'Student already has token' : 'No available tokens' };
            }
            
        } else if (action === 'test-deactivate' && studentId) {
            // Test student deactivation impact on tokens
            console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Testing student deactivation impact for ${studentId}`);
            
            const student = await Aluno.findOne({
                _id: studentId,
                trainerId: personalTrainerId
            });
            
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found',
                    code: 'STUDENT_NOT_FOUND'
                });
            }
            
            const existingToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
            results.studentBefore = {
                name: student.nome,
                status: student.status,
                hasToken: !!existingToken,
                tokenId: existingToken?._id?.toString()
            };
            
            // Simulate deactivation
            if (student.status === 'active') {
                await Aluno.findByIdAndUpdate(studentId, { status: 'inactive' });
                results.statusChange = 'active -> inactive';
                console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Student ${studentId} deactivated`);
            } else {
                results.statusChange = 'Student was already inactive';
            }
            
        } else if (action === 'test-activate' && studentId) {
            // Test student activation
            console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Testing student activation for ${studentId}`);
            
            const student = await Aluno.findOne({
                _id: studentId,
                trainerId: personalTrainerId
            });
            
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found',
                    code: 'STUDENT_NOT_FOUND'
                });
            }
            
            const existingToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
            results.studentBefore = {
                name: student.nome,
                status: student.status,
                hasToken: !!existingToken,
                tokenId: existingToken?._id?.toString()
            };
            
            // Simulate activation
            if (student.status === 'inactive') {
                await Aluno.findByIdAndUpdate(studentId, { status: 'active' });
                results.statusChange = 'inactive -> active';
                console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Student ${studentId} activated`);
            } else {
                results.statusChange = 'Student was already active';
            }
        }
        
        // Get final state
        const finalTokenStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        const finalCanActivate = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
        
        if (studentId) {
            const finalStudentToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
            results.studentAfter = {
                hasToken: !!finalStudentToken,
                tokenId: finalStudentToken?._id?.toString(),
                tokenPermanentlyBound: finalStudentToken ? !!getTokenAssignedStudentId(finalStudentToken) : false
            };
        }
        
        results.final = {
            tokens: {
                available: finalTokenStatus.availableTokens,
                consumed: finalTokenStatus.consumedTokens,
                total: finalTokenStatus.totalTokens
            },
            canActivate: {
                canActivate: finalCanActivate.canActivate,
                availableSlots: finalCanActivate.availableSlots,
                currentLimit: finalCanActivate.currentLimit,
                activeStudents: finalCanActivate.activeStudents
            }
        };
        
        results.changes = {
            availableTokensChange: finalTokenStatus.availableTokens - initialTokenStatus.availableTokens,
            consumedTokensChange: finalTokenStatus.consumedTokens - initialTokenStatus.consumedTokens,
            availableSlotsChange: finalCanActivate.availableSlots - initialCanActivate.availableSlots,
            activeStudentsChange: finalCanActivate.activeStudents - initialCanActivate.activeStudents
        };
        
        results.validation = {
            expectedBehavior: {
                deactivation: 'Available tokens should NOT increase when student is deactivated',
                tokens: 'Tokens should remain permanently assigned to students',
                slots: 'Available slots should only be based on unassigned tokens'
            },
            actualBehavior: {
                availableIncreasedOnDeactivation: action === 'test-deactivate' && results.changes.availableTokensChange > 0,
                tokenRemainsAssigned: studentId ? results.studentAfter?.tokenPermanentlyBound : null,
                slotsBasedOnUnassignedTokens: finalCanActivate.availableSlots === finalTokenStatus.availableTokens
            }
        };
        
        console.log(`[StudentLimitRoutes] 🧪 TEST SCENARIO - Final results:`, results);
        
        return res.json({
            success: true,
            data: results
        });
        
    } catch (error) {
        console.error('❌ Error in test scenario endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro no teste de cenário',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/student-limit/verify-token-binding
 * Endpoint to verify that tokens remain permanently bound to students even when deactivated
 */
router.post('/verify-token-binding', authenticateToken, async (req: Request, res: Response) => {
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

        console.log(`[StudentLimitRoutes] 🔒 TOKEN BINDING VERIFICATION - Starting for personal: ${personalTrainerId}`);
        
        // Import required services
        const TokenAssignmentService = (await import('../../services/TokenAssignmentService.js')).default;
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        const Aluno = (await import('../../models/Aluno.js')).default;
        
        // Get all students and their current token assignments
        const allStudents = await Aluno.find({
            trainerId: personalTrainerId
        }).select('nome email status');
        
        const verification = {
            timestamp: new Date().toISOString(),
            personalTrainerId,
            studentsAnalyzed: allStudents.length,
            tokenBindingVerification: [] as any[],
            tokenStatusSummary: null as any,
            canActivateStatus: null as any,
            potentialIssues: [] as string[],
            summary: null as any
        };
        
        // Check each student's token binding
        for (const student of allStudents) {
            const studentId = (student._id as any).toString();
            const assignedToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
            
            const studentVerification = {
                studentId,
                name: student.nome,
                email: student.email,
                status: student.status,
                hasAssignedToken: !!assignedToken,
                tokenDetails: assignedToken ? {
                    tokenId: (assignedToken._id as any).toString(),
                    quantity: assignedToken.quantidade,
                    assignedDate: assignedToken.dateAssigned?.toISOString(),
                    expirationDate: getTokenExpirationDate(assignedToken).toISOString(),
                    isExpired: getTokenExpirationDate(assignedToken) <= new Date(),
                    isPermanentlyBound: !!getTokenAssignedStudentId(assignedToken)
                } : null
            };
            
            // Check for potential issues
            if (student.status === 'inactive' && assignedToken) {
                console.log(`[StudentLimitRoutes] 🔒 VERIFICATION - Inactive student ${student.nome} has assigned token ${assignedToken._id} - this is CORRECT`);
            } else if (student.status === 'active' && !assignedToken) {
                verification.potentialIssues.push(`Active student ${student.nome} has no assigned token`);
                console.log(`[StudentLimitRoutes] 🔒 VERIFICATION - ISSUE: Active student ${student.nome} has no assigned token`);
            } else if (student.status === 'inactive' && !assignedToken) {
                console.log(`[StudentLimitRoutes] 🔒 VERIFICATION - Inactive student ${student.nome} has no assigned token - this may be normal`);
            }
            
            (verification.tokenBindingVerification as any[]).push(studentVerification);
        }
        
        // Get current token status
        const tokenStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        verification.tokenStatusSummary = {
            availableTokens: tokenStatus.availableTokens,
            consumedTokens: tokenStatus.consumedTokens,
            totalTokens: tokenStatus.totalTokens,
            consumedTokenDetails: tokenStatus.consumedTokenDetails.map(detail => ({
                tokenId: detail.tokenId,
                studentName: detail.assignedStudent.nome,
                studentStatus: detail.assignedStudent.status,
                assignedDate: detail.dateAssigned.toISOString()
            }))
        };
        
        // Get can activate status
        const canActivate = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
        verification.canActivateStatus = {
            canActivate: canActivate.canActivate,
            currentLimit: canActivate.currentLimit,
            activeStudents: canActivate.activeStudents,
            availableSlots: canActivate.availableSlots
        };
        
        // Additional verification checks
        const activeStudents = allStudents.filter(s => s.status === 'active');
        const inactiveStudents = allStudents.filter(s => s.status === 'inactive');
        const inactiveStudentsWithTokens = (verification.tokenBindingVerification as any[]).filter(v => 
            v.status === 'inactive' && v.hasAssignedToken
        );
        
        // Check if available slots correctly reflect only unassigned tokens
        const expectedAvailableSlots = tokenStatus.availableTokens;
        if (canActivate.availableSlots !== expectedAvailableSlots) {
            verification.potentialIssues.push(
                `Available slots (${canActivate.availableSlots}) != Available tokens (${expectedAvailableSlots}). This suggests phantom slots!`
            );
        }
        
        // Check if deactivated students still have their tokens
        if (inactiveStudentsWithTokens.length > 0) {
            console.log(`[StudentLimitRoutes] 🔒 VERIFICATION - ✅ GOOD: ${inactiveStudentsWithTokens.length} inactive students still have assigned tokens (permanent binding working)`);
        }
        
        verification.summary = {
            totalStudents: allStudents.length,
            activeStudents: activeStudents.length,
            inactiveStudents: inactiveStudents.length,
            inactiveStudentsWithTokens: inactiveStudentsWithTokens.length,
            availableTokens: tokenStatus.availableTokens,
            consumedTokens: tokenStatus.consumedTokens,
            availableSlots: canActivate.availableSlots,
            expectedAvailableSlots,
            slotCalculationCorrect: canActivate.availableSlots === expectedAvailableSlots,
            permanentBindingWorking: inactiveStudentsWithTokens.length > 0
        };
        
        console.log(`[StudentLimitRoutes] 🔒 TOKEN BINDING VERIFICATION - Complete:`, verification.summary);
        
        return res.json({
            success: true,
            data: verification
        });
        
    } catch (error) {
        console.error('❌ Error in token binding verification:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na verificação de vinculação de tokens',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/student-limit/simulate-fraud-scenario
 * Simulate the exact fraud scenario described by the user
 */
router.post('/simulate-fraud-scenario', authenticateToken, async (req: Request, res: Response) => {
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

        console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - Starting for personal: ${personalTrainerId}`);
        
        // Import required services
        const TokenAssignmentService = (await import('../../services/TokenAssignmentService.js')).default;
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        const Aluno = (await import('../../models/Aluno.js')).default;
        
        const simulation = {
            timestamp: new Date().toISOString(),
            personalTrainerId,
            scenario: 'Personal trainer has 2 tokens, assigns to 2 students, deactivates 1 student',
            steps: [] as any[],
            fraudAnalysis: null as any
        };
        
        // Helper function to capture current state
        const captureState = async (stepName: string) => {
            const tokenStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
            const canActivate = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
            const students = await Aluno.find({ trainerId: personalTrainerId }).select('nome email status');
            
            const studentsWithTokens = [];
            for (const student of students) {
                const studentToken = await TokenAssignmentService.getStudentAssignedToken((student._id as any).toString());
                studentsWithTokens.push({
                    id: (student._id as any).toString(),
                    name: student.nome,
                    status: student.status,
                    hasToken: !!studentToken,
                    tokenId: studentToken?._id?.toString()
                });
            }
            
            const state = {
                stepName,
                timestamp: new Date().toISOString(),
                tokens: {
                    available: tokenStatus.availableTokens,
                    consumed: tokenStatus.consumedTokens,
                    total: tokenStatus.totalTokens
                },
                slots: {
                    canActivate: canActivate.canActivate,
                    availableSlots: canActivate.availableSlots,
                    currentLimit: canActivate.currentLimit,
                    activeStudents: canActivate.activeStudents
                },
                students: studentsWithTokens,
                analysis: {
                    totalStudents: students.length,
                    activeStudents: students.filter(s => s.status === 'active').length,
                    inactiveStudents: students.filter(s => s.status === 'inactive').length,
                    studentsWithTokens: studentsWithTokens.filter(s => s.hasToken).length,
                    fraudPossible: canActivate.availableSlots > tokenStatus.availableTokens
                }
            };
            
            console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - ${stepName}:`, state);
            simulation.steps.push(state);
            return state;
        };
        
        // Step 1: Initial state
        await captureState('1. Initial State');
        
        // Step 2: Check if we have enough students to simulate
        const allStudents = await Aluno.find({ trainerId: personalTrainerId }).select('nome email status');
        
        if (allStudents.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient students to simulate scenario. Need at least 2 students.',
                code: 'INSUFFICIENT_DATA',
                data: { currentStudents: allStudents.length }
            });
        }
        
        // Find students to use for simulation
        const activeStudents = allStudents.filter(s => s.status === 'active');
        const inactiveStudents = allStudents.filter(s => s.status === 'inactive');
        
        let student1, student2;
        
        if (activeStudents.length >= 2) {
            student1 = activeStudents[0];
            student2 = activeStudents[1];
        } else if (activeStudents.length === 1 && inactiveStudents.length >= 1) {
            student1 = activeStudents[0];
            student2 = inactiveStudents[0];
            // Activate the second student for simulation
            await Aluno.findByIdAndUpdate(student2._id, { status: 'active' });
        } else {
            // Activate two students for simulation
            student1 = allStudents[0];
            student2 = allStudents[1];
            await Aluno.findByIdAndUpdate(student1._id, { status: 'active' });
            await Aluno.findByIdAndUpdate(student2._id, { status: 'active' });
        }
        
        // Step 3: Ensure both students are active and have tokens
        await captureState('2. After ensuring 2 active students');
        
        const student1Id = (student1._id as any).toString();
        const student2Id = (student2._id as any).toString();
        
        // Check if students need token assignment
        let student1Token = await TokenAssignmentService.getStudentAssignedToken(student1Id);
        let student2Token = await TokenAssignmentService.getStudentAssignedToken(student2Id);
        
        if (!student1Token) {
            const assignment1 = await TokenAssignmentService.assignTokenToStudent(personalTrainerId, student1Id, 1);
            console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - Assigned token to student 1:`, assignment1);
            student1Token = await TokenAssignmentService.getStudentAssignedToken(student1Id);
        }
        
        if (!student2Token) {
            const assignment2 = await TokenAssignmentService.assignTokenToStudent(personalTrainerId, student2Id, 1);
            console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - Assigned token to student 2:`, assignment2);
            student2Token = await TokenAssignmentService.getStudentAssignedToken(student2Id);
        }
        
        // Step 4: State after both students have tokens
        await captureState('3. After both students have tokens');
        
        // Step 5: CRITICAL TEST - Deactivate student 1
        console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - CRITICAL: Deactivating student 1 (${student1.nome})`);
        await Aluno.findByIdAndUpdate(student1Id, { status: 'inactive' });
        
        // Step 6: Check state after deactivation - THIS IS THE CRITICAL STEP
        const postDeactivationState = await captureState('4. CRITICAL: After deactivating student 1');
        
        // Check if token remains assigned
        const student1TokenAfterDeactivation = await TokenAssignmentService.getStudentAssignedToken(student1Id);
        
        console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - Token check after deactivation:`, {
            student1Id,
            student1Name: student1.nome,
            tokenStillAssigned: !!student1TokenAfterDeactivation,
            tokenId: student1TokenAfterDeactivation?._id?.toString(),
            fraudIssue: postDeactivationState.analysis.fraudPossible,
            availableSlots: postDeactivationState.slots.availableSlots,
            availableTokens: postDeactivationState.tokens.available
        });
        
        // Step 7: Try to add a third student (this should fail if tokens are properly bound)
        console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - Checking if can add 3rd student (should be blocked)`);
        const canAddThirdStudent = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
        
        await captureState('5. Final state - checking fraud possibility');
        
        simulation.fraudAnalysis = {
            tokenRemainsAssignedAfterDeactivation: !!student1TokenAfterDeactivation,
            canAddThirdStudentWhenShouldNot: canAddThirdStudent.canActivate,
            fraudScenarioPossible: canAddThirdStudent.canActivate && postDeactivationState.tokens.available === 0,
            expectedBehavior: {
                tokenShouldRemainAssigned: true,
                canAddThirdStudent: false,
                availableSlotsShouldBe: 0
            },
            actualBehavior: {
                tokenRemainsAssigned: !!student1TokenAfterDeactivation,
                canAddThirdStudent: canAddThirdStudent.canActivate,
                availableSlots: canAddThirdStudent.availableSlots
            },
            issue: canAddThirdStudent.canActivate ? 'FRAUD POSSIBLE: Can add 3rd student despite no available tokens' : 'CORRECT: Cannot add 3rd student'
        };
        
        console.log(`[StudentLimitRoutes] 🚨 FRAUD SIMULATION - FINAL ANALYSIS:`, simulation.fraudAnalysis);
        
        return res.json({
            success: true,
            data: simulation
        });
        
    } catch (error) {
        console.error('❌ Error in fraud scenario simulation:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na simulação do cenário de fraude',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/student-limit/test-plan-permanent-consumption
 * Test endpoint to verify permanent plan consumption behavior
 * ADMIN ONLY - FOR TESTING PURPOSES
 */
router.post('/test-plan-permanent-consumption', authenticateToken, async (req: Request, res: Response) => {
    try {
        await dbConnect();
        
        // Only allow admins to run this test
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem executar este teste',
                code: 'ADMIN_ONLY'
            });
        }
        
        const { personalTrainerId } = req.body;
        
        if (!personalTrainerId) {
            return res.status(400).json({
                success: false,
                message: 'personalTrainerId é obrigatório',
                code: 'MISSING_PARAM'
            });
        }
        
        console.log(`[StudentLimitRoutes] 🧪 Testing plan permanent consumption for personal: ${personalTrainerId}`);
        
        // Import required services and models
        const PlanoService = (await import('../../services/PlanoService.js')).default;
        const TokenAssignmentService = (await import('../../services/TokenAssignmentService.js')).default;
        const Aluno = (await import('../../models/Aluno.js')).default;
        
        // Get current status
        const initialStatus = await PlanoService.canActivateMoreStudents(personalTrainerId, 1);
        console.log(`[PlanTest] 📊 Initial status:`, initialStatus);
        
        // Get all students for this personal trainer
        const allStudents = await Aluno.find({ trainerId: personalTrainerId });
        
        // Analyze each student to determine if they're plan-based or token-based
        const studentAnalysis = [];
        for (const student of allStudents) {
            const assignedToken = await TokenAssignmentService.getStudentAssignedToken((student._id as any).toString());
            studentAnalysis.push({
                id: (student._id as any).toString(),
                nome: student.nome,
                email: student.email,
                status: student.status,
                type: assignedToken ? 'token-based' : 'plan-based',
                tokenId: assignedToken?._id?.toString() || null,
                createdAt: student.createdAt
            });
        }
        
        // Count plan-based vs token-based students
        const tokenBasedActive = studentAnalysis.filter(s => s.type === 'token-based' && s.status === 'active').length;
        const tokenBasedInactive = studentAnalysis.filter(s => s.type === 'token-based' && s.status === 'inactive').length;
        const planBasedActive = studentAnalysis.filter(s => s.type === 'plan-based' && s.status === 'active').length;
        const planBasedInactive = studentAnalysis.filter(s => s.type === 'plan-based' && s.status === 'inactive').length;
        
        // Get plan info
        const planStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
        const planLimit = planStatus.plano?.limiteAlunos || 0;
        const isExpired = planStatus.isExpired;
        
        // Calculate expected available slots according to permanent consumption rule
        const totalPlanBasedStudents = planBasedActive + planBasedInactive;
        const expectedPlanSlots = isExpired ? 0 : Math.max(0, planLimit - totalPlanBasedStudents);
        
        // Get token status
        const tokenStatus = await TokenAssignmentService.getTokenAssignmentStatus(personalTrainerId);
        const expectedTokenSlots = tokenStatus.availableTokens;
        
        const expectedTotalSlots = expectedPlanSlots + expectedTokenSlots;
        
        // Verify if the calculation matches our expectation
        const calculationCorrect = initialStatus.availableSlots === expectedTotalSlots;
        
        console.log(`[PlanTest] 🔍 Plan permanent consumption analysis:`, {
            personalTrainerId,
            planInfo: {
                planName: planStatus.plano?.nome || 'No Plan',
                planLimit,
                isExpired
            },
            studentBreakdown: {
                tokenBasedActive,
                tokenBasedInactive,
                planBasedActive,
                planBasedInactive,
                totalPlanBased: totalPlanBasedStudents,
                totalStudents: allStudents.length
            },
            slotCalculation: {
                actualAvailableSlots: initialStatus.availableSlots,
                expectedPlanSlots,
                expectedTokenSlots,
                expectedTotalSlots,
                calculationCorrect,
                permanentConsumptionWorking: calculationCorrect
            }
        });
        
        const result = {
            timestamp: new Date().toISOString(),
            personalTrainerId,
            testResult: calculationCorrect ? 'PASSED' : 'FAILED',
            planInfo: {
                planName: planStatus.plano?.nome || 'No Plan',
                planLimit,
                isExpired
            },
            studentBreakdown: {
                tokenBasedActive,
                tokenBasedInactive,
                planBasedActive,
                planBasedInactive,
                totalPlanBased: totalPlanBasedStudents,
                totalTokenBased: tokenBasedActive + tokenBasedInactive,
                totalStudents: allStudents.length
            },
            slotCalculation: {
                actualAvailableSlots: initialStatus.availableSlots,
                expectedCalculation: {
                    planSlots: expectedPlanSlots,
                    tokenSlots: expectedTokenSlots,
                    totalSlots: expectedTotalSlots
                },
                explanation: {
                    planSlots: `${planLimit} (plan limit) - ${totalPlanBasedStudents} (total plan-based students) = ${expectedPlanSlots}`,
                    tokenSlots: `${tokenStatus.availableTokens} (available tokens only)`,
                    totalSlots: `${expectedPlanSlots} (plan) + ${expectedTokenSlots} (tokens) = ${expectedTotalSlots}`
                },
                permanentConsumptionImplemented: calculationCorrect
            },
            students: studentAnalysis,
            recommendations: calculationCorrect ? 
                ['✅ Plan permanent consumption is working correctly!'] :
                [
                    '❌ Plan permanent consumption is NOT working correctly',
                    'Expected plan slots to be calculated as: plan limit - ALL plan-based students (active + inactive)',
                    'But got different result. Check PlanoService.canActivateMoreStudents() logic.'
                ]
        };
        
        return res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('❌ Error in plan permanent consumption test:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro no teste de consumo permanente de plano',
            code: 'INTERNAL_ERROR'
        });
    }
});

export default router;