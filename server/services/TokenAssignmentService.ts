// server/services/TokenAssignmentService.ts
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import Token, { IToken } from '../models/Token.js';
import mongoose from 'mongoose';
import PersonalPlano from '../models/PersonalPlano.js';

// Type guards
export function isTokenAvulso(token: any): token is ITokenAvulso {
    return token && typeof token.dataVencimento !== 'undefined';
}

export function isToken(token: any): token is IToken {
    return token && typeof token.dataExpiracao !== 'undefined';
}

// Funções utilitárias
export function getTokenExpirationDate(token: ITokenAvulso | IToken): Date {
    return isTokenAvulso(token) ? token.dataVencimento : token.dataExpiracao;
}

export function getTokenAssignedStudentId(token: ITokenAvulso | IToken): mongoose.Types.ObjectId | undefined {
    return isTokenAvulso(token) ? token.assignedToStudentId : token.alunoId;
}

export interface TokenAssignmentResult {
    success: boolean;
    message: string;
    assignedToken?: ITokenAvulso | IToken;
    errorCode?: string;
}

export class TokenAssignmentService {
    async assignPlanSlotToStudent(
        personalTrainerId: string,
        studentId: string
    ): Promise<TokenAssignmentResult> {
        try {
            console.log(`[TokenAssignment] 🅿️  Atribuindo SLOT DE PLANO ao aluno ${studentId}`);
            const personalPlano = await PersonalPlano.findOne({
                personalTrainerId: new mongoose.Types.ObjectId(personalTrainerId),
                ativo: true,
            }).populate('planoId');

            if (!personalPlano || !personalPlano.planoId) {
                return { success: false, message: 'Nenhum plano ativo encontrado.', errorCode: 'NO_ACTIVE_PLAN' };
            }

            const planoDetails = personalPlano.planoId as any;

            const planToken = new Token({
                tipo: 'plano',
                personalTrainerId: new mongoose.Types.ObjectId(personalTrainerId),
                alunoId: new mongoose.Types.ObjectId(studentId),
                planoId: personalPlano._id,
                dataExpiracao: personalPlano.dataVencimento,
                ativo: true,
                quantidade: 1,
                dateAssigned: new Date(),
                adicionadoPorAdmin: personalPlano.atribuidoPorAdmin,
                motivoAdicao: `Slot do plano '${planoDetails.nome}' atribuído ao aluno.`,
            });

            await planToken.save();
            console.log(`[TokenAssignment] ✅ Slot de plano materializado como Token ${planToken.id}`);
            return { success: true, message: 'Slot de plano atribuído com sucesso.', assignedToken: planToken };

        } catch (error) {
            console.error('❌ Erro ao atribuir slot de plano:', error);
            return { success: false, message: 'Erro interno ao registrar slot de plano.', errorCode: 'INTERNAL_ERROR' };
        }
    }

    async assignTokenToStudent(
        personalTrainerId: string, 
        studentId: string
    ): Promise<TokenAssignmentResult> {
        console.log(`[TokenAssignment] 🎟️  Atribuindo TOKEN AVULSO a ${studentId}`);
        const now = new Date();
        const availableToken = await Token.findOne({
            personalTrainerId: new mongoose.Types.ObjectId(personalTrainerId),
            ativo: true,
            dataExpiracao: { $gt: now },
            alunoId: null,
            tipo: 'avulso'
        });

        if (!availableToken) {
            return { success: false, message: 'Nenhum token avulso disponível.', errorCode: 'INSUFFICIENT_TOKENS' };
        }

        availableToken.alunoId = new mongoose.Types.ObjectId(studentId);
        availableToken.dateAssigned = now;
        await availableToken.save();

        return { success: true, message: "Token avulso atribuído com sucesso.", assignedToken: availableToken };
    }

    async getAvailableTokensCount(personalTrainerId: string): Promise<number> {
        const now = new Date();
        const tokens = await Token.find({
            personalTrainerId: new mongoose.Types.ObjectId(personalTrainerId),
            ativo: true,
            dataExpiracao: { $gt: now },
            alunoId: null,
            tipo: 'avulso'
        });
        return tokens.reduce((sum, token) => sum + token.quantidade, 0);
    }
    
    async getStudentAssignedToken(studentId: string): Promise<IToken | ITokenAvulso | null> {
        const objectIdStudentId = new mongoose.Types.ObjectId(studentId);
        
        const token = await Token.findOne({ alunoId: objectIdStudentId, ativo: true });
        if (token) {
            console.log(`[TokenAssignment] Token encontrado para aluno ${studentId} no modelo 'Token'`);
            return token;
        }

        const legacyToken = await TokenAvulso.findOne({ assignedToStudentId: objectIdStudentId, ativo: true });
        if (legacyToken) {
             console.log(`[TokenAssignment] Token encontrado para aluno ${studentId} no modelo legado 'TokenAvulso'`);
            return legacyToken;
        }
        
        console.log(`[TokenAssignment] Nenhum token encontrado para aluno ${studentId}`);
        return null;
    }
}

export default new TokenAssignmentService();