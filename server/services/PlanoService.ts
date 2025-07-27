// server/services/PlanoService.ts
import Plano, { IPlano } from '../models/Plano.js';
import PersonalPlano, { IPersonalPlano } from '../models/PersonalPlano.js';
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import Aluno from '../models/Aluno.js';
import mongoose from 'mongoose';

export class PlanoService {
    /**
     * Get current active plan for a personal trainer
     */
    async getPersonalCurrentPlan(personalTrainerId: string): Promise<{
        plano: IPlano | null;
        personalPlano: IPersonalPlano | null;
        limiteAtual: number;
        alunosAtivos: number;
        tokensAvulsos: number;
    }> {
        const personalPlanoAtivo = await PersonalPlano.findOne({
            personalTrainerId,
            ativo: true,
            dataVencimento: { $gt: new Date() }
        }).populate('planoId').sort({ dataInicio: -1 });

        const alunosAtivos = await Aluno.countDocuments({
            trainerId: personalTrainerId,
            status: 'active'
        });

        const tokensAtivos = await this.getTokensAvulsosAtivos(personalTrainerId);
        
        let limiteAtual = 0;
        let plano = null;

        if (personalPlanoAtivo && personalPlanoAtivo.planoId) {
            plano = personalPlanoAtivo.planoId as any;
            limiteAtual = plano.limiteAlunos;
        }

        limiteAtual += tokensAtivos;

        return {
            plano,
            personalPlano: personalPlanoAtivo,
            limiteAtual,
            alunosAtivos,
            tokensAvulsos: tokensAtivos
        };
    }

    /**
     * Check if personal trainer can activate more students
     */
    async canActivateMoreStudents(personalTrainerId: string, quantidadeDesejada: number = 1): Promise<{
        canActivate: boolean;
        currentLimit: number;
        activeStudents: number;
        availableSlots: number;
    }> {
        const status = await this.getPersonalCurrentPlan(personalTrainerId);
        const availableSlots = status.limiteAtual - status.alunosAtivos;
        
        return {
            canActivate: availableSlots >= quantidadeDesejada,
            currentLimit: status.limiteAtual,
            activeStudents: status.alunosAtivos,
            availableSlots
        };
    }

    /**
     * Get active tokens for a personal trainer
     */
    async getTokensAvulsosAtivos(personalTrainerId: string): Promise<number> {
        const tokens = await TokenAvulso.find({
            personalTrainerId,
            ativo: true,
            dataVencimento: { $gt: new Date() }
        });

        return tokens.reduce((total, token) => total + token.quantidade, 0);
    }

    /**
     * Assign a plan to a personal trainer
     */
    async assignPlanToPersonal(
        personalTrainerId: string,
        planoId: string,
        adminId: string,
        customDuration?: number,
        motivo?: string
    ): Promise<IPersonalPlano> {
        // Import PersonalTrainer model
        const PersonalTrainer = (await import('../models/PersonalTrainer.js')).default;
        
        // Deactivate current plan
        await PersonalPlano.updateMany(
            { personalTrainerId, ativo: true },
            { ativo: false }
        );

        const plano = await Plano.findById(planoId);
        if (!plano) {
            throw new Error('Plano não encontrado');
        }

        const dataInicio = new Date();
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + (customDuration || plano.duracao));

        const personalPlano = new PersonalPlano({
            personalTrainerId,
            planoId,
            dataInicio,
            dataVencimento,
            atribuidoPorAdmin: adminId,
            motivoAtribuicao: motivo,
            ativo: true
        });

        // Save the PersonalPlano first
        const savedPersonalPlano = await personalPlano.save();

        // Update PersonalTrainer model fields to keep them synchronized
        await PersonalTrainer.findByIdAndUpdate(personalTrainerId, {
            planoId: planoId,
            statusAssinatura: 'ativa',
            dataInicioAssinatura: dataInicio,
            dataFimAssinatura: dataVencimento,
            limiteAlunos: plano.limiteAlunos
        });

        return savedPersonalPlano;
    }

    /**
     * Add tokens to a personal trainer
     */
    async addTokensToPersonal(
        personalTrainerId: string,
        quantidade: number,
        adminId: string,
        customDays?: number,
        motivo?: string
    ): Promise<ITokenAvulso> {
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + (customDays || 30)); // Default 30 days

        const token = new TokenAvulso({
            personalTrainerId,
            quantidade,
            dataVencimento,
            adicionadoPorAdmin: adminId,
            motivoAdicao: motivo,
            ativo: true
        });

        return await token.save();
    }

    /**
     * Get all plans
     */
    async getAllPlans(): Promise<IPlano[]> {
        return await Plano.find({ ativo: true }).sort({ preco: 1 });
    }

    /**
     * Create or update a plan
     */
    async createOrUpdatePlan(planData: Partial<IPlano>): Promise<IPlano> {
        if (planData._id) {
            const plan = await Plano.findByIdAndUpdate(planData._id, planData, { new: true });
            if (!plan) throw new Error('Plano não encontrado');
            return plan;
        } else {
            return await Plano.create(planData);
        }
    }

    /**
     * Get personal trainer status for admin view
     */
    async getPersonalStatusForAdmin(personalTrainerId: string): Promise<{
        personalInfo: any;
        currentPlan: any;
        activeTokens: ITokenAvulso[];
        activeStudents: number;
        totalLimit: number;
        planHistory: IPersonalPlano[];
    }> {
        const [currentStatus, activeTokens, planHistory] = await Promise.all([
            this.getPersonalCurrentPlan(personalTrainerId),
            TokenAvulso.find({
                personalTrainerId,
                ativo: true,
                dataVencimento: { $gt: new Date() }
            }).populate('adicionadoPorAdmin', 'nome'),
            PersonalPlano.find({ personalTrainerId })
                .populate('planoId')
                .populate('atribuidoPorAdmin', 'nome')
                .sort({ createdAt: -1 })
                .limit(10)
        ]);

        return {
            personalInfo: null, // Will be populated by the controller
            currentPlan: currentStatus,
            activeTokens,
            activeStudents: currentStatus.alunosAtivos,
            totalLimit: currentStatus.limiteAtual,
            planHistory
        };
    }

    /**
     * Cleanup expired plans and tokens
     */
    async cleanupExpired(): Promise<{ plansDeactivated: number; tokensDeactivated: number }> {
        const now = new Date();
        
        const [plansResult, tokensResult] = await Promise.all([
            PersonalPlano.updateMany(
                { dataVencimento: { $lt: now }, ativo: true },
                { ativo: false }
            ),
            TokenAvulso.updateMany(
                { dataVencimento: { $lt: now }, ativo: true },
                { ativo: false }
            )
        ]);

        return {
            plansDeactivated: plansResult.modifiedCount,
            tokensDeactivated: tokensResult.modifiedCount
        };
    }
}

export default new PlanoService();