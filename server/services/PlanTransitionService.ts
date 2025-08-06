// server/services/PlanTransitionService.ts
import mongoose from 'mongoose';
import StudentPlanHistory, { IStudentPlanHistory } from '../models/StudentPlanHistory.js';
import Aluno from '../models/Aluno.js';
import PersonalPlano from '../models/PersonalPlano.js';
import Plano, { IPlano } from '../models/Plano.js';
import { PlanTransitionType, EligibleStudentForReactivation, PlanTransitionResult } from '../../shared/types/planos.js';

export class PlanTransitionService {
    /**
     * Create history record when students become inactive
     */
    async createStudentHistory(
        personalTrainerId: string,
        studentId: string,
        planId: string,
        reason: IStudentPlanHistory['reason'],
        tokenId?: string,
        dateActivated?: Date
    ): Promise<IStudentPlanHistory> {
        try {
            console.log(`[PlanTransition] 📋 Creating student history for student ${studentId}, personal ${personalTrainerId}`);
            
            const student = await Aluno.findById(studentId);
            if (!student) {
                throw new Error('Student not found');
            }
            
            const wasActive = student.status === 'active';
            
            const history = new StudentPlanHistory({
                personalTrainerId: new mongoose.Types.ObjectId(personalTrainerId),
                studentId: new mongoose.Types.ObjectId(studentId),
                previousPlanId: new mongoose.Types.ObjectId(planId),
                tokenId: tokenId ? new mongoose.Types.ObjectId(tokenId) : undefined,
                dateActivated: dateActivated || student.createdAt,
                dateDeactivated: new Date(),
                reason,
                wasActive,
                canBeReactivated: reason === 'plan_expired' || reason === 'plan_changed' // Can reactivate if plan issue, not manual deactivation
            });
            
            await history.save();
            console.log(`[PlanTransition] ✅ Student history created: ${history._id}`);
            
            return history;
        } catch (error) {
            console.error('❌ Error creating student history:', error);
            throw error;
        }
    }
    
    /**
     * Get eligible students for reactivation based on history
     */
    async getEligibleStudentsForReactivation(
        personalTrainerId: string,
        excludeRecentDays: number = 30
    ): Promise<EligibleStudentForReactivation[]> {
        try {
            console.log(`[PlanTransition] 🔍 Finding eligible students for reactivation for personal ${personalTrainerId}`);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - excludeRecentDays);
            
            // Find recent history of students who were active and can be reactivated
            const histories = await StudentPlanHistory.find({
                personalTrainerId: new mongoose.Types.ObjectId(personalTrainerId),
                wasActive: true,
                canBeReactivated: true,
                dateDeactivated: { $gte: cutoffDate }
            })
            .populate('studentId', 'nome email status')
            .populate('previousPlanId', 'nome')
            .sort({ dateDeactivated: -1 });
            
            console.log(`[PlanTransition] 📊 Found ${histories.length} eligible history records`);
            
            // Group by student (get most recent history per student)
            const studentMap = new Map<string, typeof histories[0]>();
            for (const history of histories) {
                const studentId = (history.studentId as any)._id.toString();
                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, history);
                }
            }
            
            const eligibleStudents: EligibleStudentForReactivation[] = [];
            
            for (const [studentId, history] of studentMap) {
                const student = history.studentId as any;
                
                // Only include students that are currently inactive
                if (student.status === 'inactive') {
                    // Check if this student has an assigned token
                    const TokenAssignmentService = (await import('./TokenAssignmentService.js')).default;
                    const assignedToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
                    
                    eligibleStudents.push({
                        studentId,
                        studentName: student.nome,
                        studentEmail: student.email,
                        dateDeactivated: history.dateDeactivated,
                        previousPlanName: (history.previousPlanId as any).nome,
                        hasAssignedToken: !!assignedToken,
                        tokenId: assignedToken ? (assignedToken._id as mongoose.Types.ObjectId).toString() : undefined
                    });
                }
            }
            
            console.log(`[PlanTransition] ✅ Found ${eligibleStudents.length} eligible students for reactivation`);
            return eligibleStudents;
            
        } catch (error) {
            console.error('❌ Error getting eligible students:', error);
            return [];
        }
    }
    
    /**
     * Detect the type of plan transition
     */
    async detectTransitionType(
        personalTrainerId: string,
        newPlanId: string
    ): Promise<PlanTransitionType> {
        try {
            console.log(`[PlanTransition] 🔍 Detecting transition type for personal ${personalTrainerId}, new plan ${newPlanId}`);
            
            // Get current plan
            const currentPersonalPlano = await PersonalPlano.findOne({
                personalTrainerId,
                ativo: true
            }).populate({
                path: 'planoId',
                model: 'Plano'
            });
            
            const newPlan = await Plano.findById(newPlanId);
            if (!newPlan) {
                throw new Error('New plan not found');
            }
            
            // If no current plan, this is first time
            if (!currentPersonalPlano) {
                console.log(`[PlanTransition] 📋 No current plan found - first time assignment`);
                return {
                    type: 'first_time',
                    currentPlan: null,
                    newPlan: {
                        _id: (newPlan._id as mongoose.Types.ObjectId).toString(),
                        nome: newPlan.nome,
                        descricao: newPlan.descricao,
                        limiteAlunos: newPlan.limiteAlunos,
                        preco: newPlan.preco,
                        duracao: newPlan.duracao,
                        tipo: newPlan.tipo,
                        ativo: newPlan.ativo,
                        createdAt: newPlan.createdAt,
                        updatedAt: newPlan.updatedAt
                    },
                    limitDifference: newPlan.limiteAlunos
                };
            }
            
            // Type checking to ensure planoId is populated
            if (!currentPersonalPlano.planoId || typeof currentPersonalPlano.planoId === 'string') {
                throw new Error('Current plan not properly populated');
            }
            
            const currentPlan = currentPersonalPlano.planoId as unknown as IPlano;
            
            // Helper function to convert IPlano to Plano type
            const convertPlan = (plan: IPlano) => ({
                _id: (plan._id as mongoose.Types.ObjectId).toString(),
                nome: plan.nome,
                descricao: plan.descricao,
                limiteAlunos: plan.limiteAlunos,
                preco: plan.preco,
                duracao: plan.duracao,
                tipo: plan.tipo,
                ativo: plan.ativo,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt
            });
            
            const currentPlanConverted = convertPlan(currentPlan);
            const newPlanConverted = convertPlan(newPlan);
            
            // Check if same plan (renewal)
            if ((currentPlan._id as mongoose.Types.ObjectId).toString() === newPlanId) {
                console.log(`[PlanTransition] 🔄 Same plan detected - renewal`);
                return {
                    type: 'renewal',
                    currentPlan: currentPlanConverted,
                    newPlan: newPlanConverted,
                    limitDifference: 0
                };
            }
            
            // Compare limits to determine upgrade/downgrade
            const limitDifference = newPlan.limiteAlunos - currentPlan.limiteAlunos;
            
            if (limitDifference > 0) {
                console.log(`[PlanTransition] ⬆️ Upgrade detected - limit increase: ${limitDifference}`);
                return {
                    type: 'upgrade',
                    currentPlan: currentPlanConverted,
                    newPlan: newPlanConverted,
                    limitDifference
                };
            } else if (limitDifference < 0) {
                console.log(`[PlanTransition] ⬇️ Downgrade detected - limit decrease: ${limitDifference}`);
                return {
                    type: 'downgrade',
                    currentPlan: currentPlanConverted,
                    newPlan: newPlanConverted,
                    limitDifference
                };
            } else {
                console.log(`[PlanTransition] 🔄 Same limit detected - treating as renewal`);
                return {
                    type: 'renewal',
                    currentPlan: currentPlanConverted,
                    newPlan: newPlanConverted,
                    limitDifference: 0
                };
            }
            
        } catch (error) {
            console.error('❌ Error detecting transition type:', error);
            throw error;
        }
    }
    
    /**
     * Archive current active students before plan transition
     */
    async archiveCurrentActiveStudents(
        personalTrainerId: string,
        currentPlanId: string,
        reason: IStudentPlanHistory['reason'] = 'plan_changed'
    ): Promise<number> {
        try {
            console.log(`[PlanTransition] 📦 Archiving current active students for personal ${personalTrainerId}`);
            
            const activeStudents = await Aluno.find({
                trainerId: personalTrainerId,
                status: 'active'
            });
            
            console.log(`[PlanTransition] 📊 Found ${activeStudents.length} active students to archive`);
            
            // Get token assignment service
            const TokenAssignmentService = (await import('./TokenAssignmentService.js')).default;
            
            // Create history for each active student
            for (const student of activeStudents) {
                const studentId = (student._id as mongoose.Types.ObjectId).toString();
                
                // Check if student has an assigned token
                const assignedToken = await TokenAssignmentService.getStudentAssignedToken(studentId);
                const tokenId = assignedToken ? (assignedToken._id as mongoose.Types.ObjectId).toString() : undefined;
                
                await this.createStudentHistory(
                    personalTrainerId,
                    studentId,
                    currentPlanId,
                    reason,
                    tokenId,
                    student.createdAt
                );
                
                // Mark student as inactive
                student.status = 'inactive';
                await student.save();
            }
            
            console.log(`[PlanTransition] ✅ Archived ${activeStudents.length} students`);
            return activeStudents.length;
            
        } catch (error) {
            console.error('❌ Error archiving active students:', error);
            throw error;
        }
    }
    
    /**
     * Automatically reactivate eligible students (for renewal and upgrade)
     */
    async automaticallyReactivateStudents(
        personalTrainerId: string,
        transitionType: PlanTransitionType,
        maxStudentsToReactivate?: number
    ): Promise<number> {
        try {
            console.log(`[PlanTransition] 🔄 Auto-reactivating students for ${transitionType.type} transition`);
            
            if (transitionType.type === 'downgrade') {
                console.log(`[PlanTransition] ⚠️ Downgrade detected - no automatic reactivation`);
                return 0;
            }
            
            const eligibleStudents = await this.getEligibleStudentsForReactivation(personalTrainerId);
            
            const studentsToReactivate = maxStudentsToReactivate 
                ? eligibleStudents.slice(0, maxStudentsToReactivate)
                : eligibleStudents;
            
            console.log(`[PlanTransition] 📊 Reactivating ${studentsToReactivate.length} students`);
            
            let reactivatedCount = 0;
            
            // Use MongoDB session for transaction
            const session = await mongoose.startSession();
            
            try {
                await session.withTransaction(async () => {
                    for (const eligibleStudent of studentsToReactivate) {
                        try {
                            const student = await Aluno.findById(eligibleStudent.studentId).session(session);
                            if (student && student.status === 'inactive') {
                                student.status = 'active';
                                await student.save({ session });
                                reactivatedCount++;
                                
                                console.log(`[PlanTransition] ✅ Reactivated student ${eligibleStudent.studentName} (${eligibleStudent.studentId})`);
                            }
                        } catch (error) {
                            console.error(`❌ Error reactivating student ${eligibleStudent.studentId}:`, error);
                        }
                    }
                });
            } finally {
                await session.endSession();
            }
            
            console.log(`[PlanTransition] ✅ Successfully reactivated ${reactivatedCount} students`);
            return reactivatedCount;
            
        } catch (error) {
            console.error('❌ Error automatically reactivating students:', error);
            throw error;
        }
    }
    
    /**
     * Process plan transition with automatic logic
     */
    async processPlanTransition(
        personalTrainerId: string,
        newPlanId: string
    ): Promise<PlanTransitionResult> {
        try {
            console.log(`[PlanTransition] 🚀 Processing plan transition for personal ${personalTrainerId} to plan ${newPlanId}`);
            
            // Detect transition type
            const transitionType = await this.detectTransitionType(personalTrainerId, newPlanId);
            
            // Archive current students if not first time
            let archivedStudents = 0;
            if (transitionType.type !== 'first_time' && transitionType.currentPlan) {
                archivedStudents = await this.archiveCurrentActiveStudents(
                    personalTrainerId,
                    transitionType.currentPlan._id
                );
            }
            
            let studentsReactivated = 0;
            let eligibleStudents: EligibleStudentForReactivation[] = [];
            let studentsRequiringManualSelection = 0;
            
            if (transitionType.type === 'renewal' || transitionType.type === 'upgrade') {
                // Automatic reactivation
                studentsReactivated = await this.automaticallyReactivateStudents(
                    personalTrainerId,
                    transitionType
                );
            } else if (transitionType.type === 'downgrade') {
                // Get eligible students for manual selection
                eligibleStudents = await this.getEligibleStudentsForReactivation(personalTrainerId);
                studentsRequiringManualSelection = eligibleStudents.length;
            }
            
            // Calculate available slots
            const PlanoService = (await import('./PlanoService.js')).default;
            const currentStatus = await PlanoService.getPersonalCurrentPlan(personalTrainerId);
            const availableSlots = currentStatus.limiteAtual - currentStatus.alunosAtivos;
            
            const result: PlanTransitionResult = {
                success: true,
                transitionType: transitionType.type,
                studentsReactivated,
                studentsRequiringManualSelection,
                availableSlots,
                eligibleStudents: transitionType.type === 'downgrade' ? eligibleStudents : undefined,
                message: this.getTransitionMessage(transitionType, studentsReactivated, studentsRequiringManualSelection)
            };
            
            console.log(`[PlanTransition] ✅ Transition completed:`, result);
            return result;
            
        } catch (error) {
            console.error('❌ Error processing plan transition:', error);
            return {
                success: false,
                transitionType: 'first_time',
                studentsReactivated: 0,
                studentsRequiringManualSelection: 0,
                availableSlots: 0,
                message: `Erro ao processar transição: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * Generate appropriate message for transition result
     */
    private getTransitionMessage(
        transitionType: PlanTransitionType,
        studentsReactivated: number,
        studentsRequiringManualSelection: number
    ): string {
        switch (transitionType.type) {
            case 'first_time':
                return 'Plano atribuído com sucesso. Este é o primeiro plano para este personal.';
            
            case 'renewal':
                return studentsReactivated > 0
                    ? `Plano renovado com sucesso. ${studentsReactivated} aluno(s) foram reativados automaticamente.`
                    : 'Plano renovado com sucesso. Nenhum aluno para reativar.';
            
            case 'upgrade':
                return studentsReactivated > 0
                    ? `Upgrade realizado com sucesso. ${studentsReactivated} aluno(s) foram reativados automaticamente. Slots extras disponíveis para novos alunos.`
                    : 'Upgrade realizado com sucesso. Slots extras disponíveis para novos alunos.';
            
            case 'downgrade':
                return studentsRequiringManualSelection > 0
                    ? `Downgrade realizado. ${studentsRequiringManualSelection} aluno(s) estão disponíveis para seleção manual. Por favor, selecione quais alunos devem ser reativados.`
                    : 'Downgrade realizado com sucesso. Nenhum aluno para reativar.';
            
            default:
                return 'Transição de plano realizada com sucesso.';
        }
    }
    
    /**
     * Manually reactivate selected students (for downgrade scenarios)
     */
    async manuallyReactivateStudents(
        personalTrainerId: string,
        selectedStudentIds: string[]
    ): Promise<{ success: boolean; reactivatedCount: number; errors: string[] }> {
        try {
            console.log(`[PlanTransition] 👤 Manually reactivating ${selectedStudentIds.length} students for personal ${personalTrainerId}`);
            
            // Check current limits
            const PlanoService = (await import('./PlanoService.js')).default;
            const canActivate = await PlanoService.canActivateMoreStudents(personalTrainerId, selectedStudentIds.length);
            
            if (!canActivate.canActivate) {
                return {
                    success: false,
                    reactivatedCount: 0,
                    errors: [`Não é possível ativar ${selectedStudentIds.length} alunos. Disponível: ${canActivate.availableSlots}`]
                };
            }
            
            let reactivatedCount = 0;
            const errors: string[] = [];
            
            // Use MongoDB session for transaction
            const session = await mongoose.startSession();
            
            try {
                await session.withTransaction(async () => {
                    for (const studentId of selectedStudentIds) {
                        try {
                            const student = await Aluno.findById(studentId).session(session);
                            if (student && student.trainerId.toString() === personalTrainerId) {
                                if (student.status === 'inactive') {
                                    student.status = 'active';
                                    await student.save({ session });
                                    reactivatedCount++;
                                    
                                    console.log(`[PlanTransition] ✅ Manually reactivated student ${student.nome} (${studentId})`);
                                } else {
                                    errors.push(`Aluno ${student.nome} já está ativo`);
                                }
                            } else {
                                errors.push(`Aluno ${studentId} não encontrado ou não pertence a este personal`);
                            }
                        } catch (error) {
                            errors.push(`Erro ao reativar aluno ${studentId}: ${(error as Error).message}`);
                        }
                    }
                });
            } finally {
                await session.endSession();
            }
            
            console.log(`[PlanTransition] ✅ Manual reactivation completed: ${reactivatedCount} reactivated, ${errors.length} errors`);
            
            return {
                success: reactivatedCount > 0,
                reactivatedCount,
                errors
            };
            
        } catch (error) {
            console.error('❌ Error manually reactivating students:', error);
            return {
                success: false,
                reactivatedCount: 0,
                errors: [`Erro interno: ${(error as Error).message}`]
            };
        }
    }
}

export default new PlanTransitionService();