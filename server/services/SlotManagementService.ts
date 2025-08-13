// server/services/SlotManagementService.ts
import mongoose from 'mongoose';
import Aluno, { IAluno } from '../models/Aluno.js';
import PersonalPlano, { IPersonalPlano } from '../models/PersonalPlano.js';
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';
import PlanoService from './PlanoService.js';

export interface SlotInfo {
    fonte: 'plano' | 'token';
    planoId?: mongoose.Types.ObjectId;
    tokenId?: mongoose.Types.ObjectId;
    validadeAcesso: Date;
}

export interface SlotAvailabilityResult {
    slotsDisponiveis: boolean;
    slotInfo?: SlotInfo;
    message: string;
    details?: {
        planoAtivo: boolean;
        limiteBasePlano: number;
        alunosAtivos: number;
        tokensDisponiveis: number;
        limiteTotal: number;
    };
}

export class SlotManagementService {
    /**
     * Verifica se há slots disponíveis para o personal trainer
     */
    async verificarSlotDisponivel(personalId: string): Promise<SlotAvailabilityResult> {
        try {
            console.log(`🔍 Verificando slots disponíveis para personal ${personalId}`);

            if (!personalId) {
                throw new Error('Personal ID é obrigatório');
            }

            // Get current plan status
            const planStatus = await PlanoService.getPersonalCurrentPlan(personalId);
            
            if (planStatus.alunosAtivos >= planStatus.limiteAtual) {
                return {
                    slotsDisponiveis: false,
                    message: 'Limite de alunos ativos atingido. Considere fazer upgrade do plano ou adquirir tokens avulsos.',
                    details: {
                        planoAtivo: !planStatus.isExpired && !!planStatus.plano,
                        limiteBasePlano: planStatus.plano?.limiteAlunos || 0,
                        alunosAtivos: planStatus.alunosAtivos,
                        tokensDisponiveis: planStatus.tokensAvulsos,
                        limiteTotal: planStatus.limiteAtual
                    }
                };
            }

            // Try to allocate from plan first, then from tokens
            let slotInfo: SlotInfo;

            // Check if there's an active plan with available slots
            if (!planStatus.isExpired && planStatus.plano && planStatus.personalPlano) {
                const alunosConsumindoPlano = await Aluno.countDocuments({
                    trainerId: personalId,
                    status: 'active',
                    consumoFonte: 'plano',
                    consumidoDoPlanoId: planStatus.personalPlano._id
                });

                if (alunosConsumindoPlano < planStatus.plano.limiteAlunos) {
                    slotInfo = {
                        fonte: 'plano',
                        planoId: planStatus.personalPlano._id as mongoose.Types.ObjectId,
                        validadeAcesso: planStatus.personalPlano.dataFim || planStatus.personalPlano.dataVencimento || new Date()
                    };

                    console.log(`✅ Slot disponível no plano para personal ${personalId}`);
                    return {
                        slotsDisponiveis: true,
                        slotInfo,
                        message: 'Slot disponível no plano ativo',
                        details: {
                            planoAtivo: true,
                            limiteBasePlano: planStatus.plano.limiteAlunos,
                            alunosAtivos: planStatus.alunosAtivos,
                            tokensDisponiveis: planStatus.tokensAvulsos,
                            limiteTotal: planStatus.limiteAtual
                        }
                    };
                }
            }

            // If no plan slot available, try to get an available token
            const tokenDisponivel = await TokenAvulso.findOne({
                personalId: personalId,
                status: 'disponivel',
                dataExpiracao: { $gt: new Date() }
            }).sort({ dataExpiracao: 1 }); // Use token that expires first

            if (tokenDisponivel) {
                slotInfo = {
                    fonte: 'token',
                    tokenId: tokenDisponivel._id as mongoose.Types.ObjectId,
                    validadeAcesso: tokenDisponivel.dataExpiracao
                };

                console.log(`✅ Slot disponível via token para personal ${personalId}`);
                return {
                    slotsDisponiveis: true,
                    slotInfo,
                    message: 'Slot disponível via token avulso',
                    details: {
                        planoAtivo: !planStatus.isExpired && !!planStatus.plano,
                        limiteBasePlano: planStatus.plano?.limiteAlunos || 0,
                        alunosAtivos: planStatus.alunosAtivos,
                        tokensDisponiveis: planStatus.tokensAvulsos,
                        limiteTotal: planStatus.limiteAtual
                    }
                };
            }

            // No slots available
            return {
                slotsDisponiveis: false,
                message: 'Nenhum slot disponível. Plano lotado e sem tokens avulsos disponíveis.',
                details: {
                    planoAtivo: !planStatus.isExpired && !!planStatus.plano,
                    limiteBasePlano: planStatus.plano?.limiteAlunos || 0,
                    alunosAtivos: planStatus.alunosAtivos,
                    tokensDisponiveis: planStatus.tokensAvulsos,
                    limiteTotal: planStatus.limiteAtual
                }
            };

        } catch (error) {
            console.error('❌ Erro ao verificar slot disponível:', error);
            throw error;
        }
    }

    /**
     * Associa um aluno a um slot (plano ou token)
     */
    async associarAlunoASlot(alunoId: string, slotInfo: SlotInfo): Promise<IAluno> {
        try {
            console.log(`🔗 Associando aluno ${alunoId} ao slot:`, slotInfo);

            if (!alunoId || !slotInfo) {
                throw new Error('Aluno ID e slot info são obrigatórios');
            }

            // Update student with slot consumption info
            const updateData: Partial<IAluno> = {
                consumoFonte: slotInfo.fonte,
                validadeAcesso: slotInfo.validadeAcesso,
                dataAssociacao: new Date()
            };

            if (slotInfo.fonte === 'plano' && slotInfo.planoId) {
                updateData.consumidoDoPlanoId = slotInfo.planoId;
                updateData.consumidoDoTokenId = undefined;
            } else if (slotInfo.fonte === 'token' && slotInfo.tokenId) {
                updateData.consumidoDoTokenId = slotInfo.tokenId;
                updateData.consumidoDoPlanoId = undefined;

                // Mark token as utilized
                await TokenAvulso.findByIdAndUpdate(slotInfo.tokenId, {
                    status: 'utilizado',
                    alunoId: alunoId
                });
            }

            const alunoAtualizado = await Aluno.findByIdAndUpdate(
                alunoId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!alunoAtualizado) {
                throw new Error('Aluno não encontrado');
            }

            console.log(`✅ Aluno ${alunoId} associado com sucesso ao ${slotInfo.fonte}`);
            return alunoAtualizado;

        } catch (error) {
            console.error('❌ Erro ao associar aluno ao slot:', error);
            throw error;
        }
    }

    /**
     * Libera um slot por exclusão de aluno (configurable behavior)
     */
    async liberarSlotPorExclusao(alunoId: string, liberarToken: boolean = true): Promise<void> {
        try {
            console.log(`🔓 Liberando slot por exclusão do aluno ${alunoId}`);

            if (!alunoId) {
                throw new Error('Aluno ID é obrigatório');
            }

            const aluno = await Aluno.findById(alunoId);
            if (!aluno) {
                throw new Error('Aluno não encontrado');
            }

            // If student was consuming a token, free it
            if (aluno.consumoFonte === 'token' && aluno.consumidoDoTokenId && liberarToken) {
                await TokenAvulso.findByIdAndUpdate(aluno.consumidoDoTokenId, {
                    status: 'disponivel',
                    alunoId: undefined
                });
                console.log(`✅ Token ${aluno.consumidoDoTokenId} liberado`);
            }

            // Plan slots are automatically freed when student is deleted
            // No need to do anything special for plan consumption

            console.log(`✅ Slot liberado para exclusão do aluno ${alunoId}`);

        } catch (error) {
            console.error('❌ Erro ao liberar slot por exclusão:', error);
            throw error;
        }
    }

    /**
     * Verifica se um aluno pode ser reativado (se associação ainda é válida)
     */
    async podeReativarAluno(alunoId: string): Promise<{
        podeReativar: boolean;
        motivoNegacao?: string;
        novaAssociacaoNecessaria: boolean;
    }> {
        try {
            console.log(`🔍 Verificando se aluno ${alunoId} pode ser reativado`);

            const aluno = await Aluno.findById(alunoId);
            if (!aluno) {
                throw new Error('Aluno não encontrado');
            }

            // If student doesn't have consumption info, new association is needed
            if (!aluno.consumoFonte || !aluno.validadeAcesso) {
                return {
                    podeReativar: false,
                    motivoNegacao: 'Aluno não possui associação a plano ou token',
                    novaAssociacaoNecessaria: true
                };
            }

            // Check if access is still valid
            const agora = new Date();
            if (aluno.validadeAcesso < agora) {
                return {
                    podeReativar: false,
                    motivoNegacao: 'Associação expirada - nova associação necessária',
                    novaAssociacaoNecessaria: true
                };
            }

            // If consuming token, check if token is still valid and utilized by this student
            if (aluno.consumoFonte === 'token' && aluno.consumidoDoTokenId) {
                const token = await TokenAvulso.findById(aluno.consumidoDoTokenId);
                if (!token || token.status !== 'utilizado' || token.alunoId?.toString() !== alunoId) {
                    return {
                        podeReativar: false,
                        motivoNegacao: 'Token não encontrado ou não está associado a este aluno',
                        novaAssociacaoNecessaria: true
                    };
                }
            }

            // If consuming plan, check if plan is still active
            if (aluno.consumoFonte === 'plano' && aluno.consumidoDoPlanoId) {
                const plano = await PersonalPlano.findById(aluno.consumidoDoPlanoId);
                if (!plano || plano.status !== 'ativo' || (plano.dataFim && plano.dataFim < agora)) {
                    return {
                        podeReativar: false,
                        motivoNegacao: 'Plano não encontrado ou expirado',
                        novaAssociacaoNecessaria: true
                    };
                }
            }

            return {
                podeReativar: true,
                novaAssociacaoNecessaria: false
            };

        } catch (error) {
            console.error('❌ Erro ao verificar reativação do aluno:', error);
            throw error;
        }
    }

    /**
     * Desativa alunos com associações expiradas
     */
    async desativarAlunosComAssociacaoExpirada(): Promise<{ alunosDesativados: number }> {
        try {
            console.log('🔄 Verificando alunos com associações expiradas...');

            const agora = new Date();
            
            // Find active students with expired access
            const alunosParaDesativar = await Aluno.find({
                status: 'active',
                validadeAcesso: { $lt: agora }
            });

            let alunosDesativados = 0;

            for (const aluno of alunosParaDesativar) {
                try {
                    // Deactivate student
                    await Aluno.findByIdAndUpdate(aluno._id, {
                        status: 'inactive'
                    });

                    // If was consuming a token, mark token as expired
                    if (aluno.consumoFonte === 'token' && aluno.consumidoDoTokenId) {
                        await TokenAvulso.findByIdAndUpdate(aluno.consumidoDoTokenId, {
                            status: 'expirado',
                            alunoId: undefined
                        });
                    }

                    alunosDesativados++;
                    console.log(`✅ Aluno ${aluno.nome} desativado por associação expirada`);

                } catch (error) {
                    console.error(`❌ Erro ao desativar aluno ${aluno._id}:`, error);
                }
            }

            console.log(`✅ ${alunosDesativados} alunos desativados por associação expirada`);
            
            return { alunosDesativados };

        } catch (error) {
            console.error('❌ Erro ao desativar alunos com associação expirada:', error);
            throw error;
        }
    }
}

export default new SlotManagementService();