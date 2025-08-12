// server/services/TokenManagementService.ts
import mongoose from 'mongoose';
import TokenAvulso, { ITokenAvulso } from '../models/TokenAvulso.js';

export interface TokenCreationData {
    personalId: string;
    quantidade: number;
    validade: number; // days
    adminId: string;
    motivo?: string;
    preco?: number;
}

export interface TokenStatusSummary {
    totalTokens: number;
    tokensDisponiveis: number;
    tokensUtilizados: number;
    tokensExpirados: number;
    tokens: ITokenAvulso[];
}

export class TokenManagementService {
    /**
     * Cria tokens individuais para um personal trainer
     */
    async criarTokensParaPersonal(data: TokenCreationData): Promise<ITokenAvulso[]> {
        try {
            console.log(`🎫 Criando ${data.quantidade} tokens para personal ${data.personalId}`);

            if (!data.personalId || !data.quantidade || !data.adminId) {
                throw new Error('Personal ID, quantidade e admin ID são obrigatórios');
            }

            if (data.quantidade < 1 || data.quantidade > 100) {
                throw new Error('Quantidade deve ser entre 1 e 100 tokens');
            }

            const dataExpiracao = new Date();
            dataExpiracao.setDate(dataExpiracao.getDate() + data.validade);

            const tokensParaCriar = [];
            for (let i = 0; i < data.quantidade; i++) {
                tokensParaCriar.push({
                    personalId: new mongoose.Types.ObjectId(data.personalId),
                    status: 'disponivel',
                    dataEmissao: new Date(),
                    dataExpiracao: dataExpiracao,
                    preco: data.preco,
                    adicionadoPorAdmin: new mongoose.Types.ObjectId(data.adminId),
                    motivoAdicao: data.motivo
                });
            }

            const tokensCriados = await TokenAvulso.insertMany(tokensParaCriar);

            console.log(`✅ ${tokensCriados.length} tokens criados com sucesso para personal ${data.personalId}`);
            return tokensCriados as ITokenAvulso[];

        } catch (error) {
            console.error('❌ Erro ao criar tokens:', error);
            throw error;
        }
    }

    /**
     * Marca um token como utilizado por um aluno
     */
    async utilizarToken(tokenId: string, alunoId: string): Promise<ITokenAvulso> {
        try {
            console.log(`🎫 Utilizando token ${tokenId} para aluno ${alunoId}`);

            if (!tokenId || !alunoId) {
                throw new Error('Token ID e aluno ID são obrigatórios');
            }

            const token = await TokenAvulso.findById(tokenId);
            if (!token) {
                throw new Error('Token não encontrado');
            }

            if (token.status !== 'disponivel') {
                throw new Error(`Token não está disponível. Status atual: ${token.status}`);
            }

            const agora = new Date();
            if (token.dataExpiracao < agora) {
                // Mark as expired
                await TokenAvulso.findByIdAndUpdate(tokenId, { status: 'expirado' });
                throw new Error('Token expirado');
            }

            const tokenAtualizado = await TokenAvulso.findByIdAndUpdate(
                tokenId,
                {
                    status: 'utilizado',
                    alunoId: new mongoose.Types.ObjectId(alunoId)
                },
                { new: true }
            );

            if (!tokenAtualizado) {
                throw new Error('Erro ao atualizar token');
            }

            console.log(`✅ Token ${tokenId} utilizado com sucesso pelo aluno ${alunoId}`);
            return tokenAtualizado;

        } catch (error) {
            console.error('❌ Erro ao utilizar token:', error);
            throw error;
        }
    }

    /**
     * Libera um token (marca como disponível novamente)
     */
    async liberarToken(tokenId: string): Promise<ITokenAvulso> {
        try {
            console.log(`🔓 Liberando token ${tokenId}`);

            if (!tokenId) {
                throw new Error('Token ID é obrigatório');
            }

            const token = await TokenAvulso.findById(tokenId);
            if (!token) {
                throw new Error('Token não encontrado');
            }

            if (token.status === 'expirado') {
                throw new Error('Token expirado não pode ser liberado');
            }

            const agora = new Date();
            if (token.dataExpiracao < agora) {
                // Mark as expired instead of freeing
                const tokenExpirado = await TokenAvulso.findByIdAndUpdate(
                    tokenId,
                    { status: 'expirado', alunoId: undefined },
                    { new: true }
                );
                throw new Error('Token expirado durante liberação');
            }

            const tokenLiberado = await TokenAvulso.findByIdAndUpdate(
                tokenId,
                {
                    status: 'disponivel',
                    alunoId: undefined
                },
                { new: true }
            );

            if (!tokenLiberado) {
                throw new Error('Erro ao liberar token');
            }

            console.log(`✅ Token ${tokenId} liberado com sucesso`);
            return tokenLiberado;

        } catch (error) {
            console.error('❌ Erro ao liberar token:', error);
            throw error;
        }
    }

    /**
     * Lista tokens de um personal com status detalhado
     */
    async listarTokensPersonal(personalId: string, incluirExpirados: boolean = false): Promise<TokenStatusSummary> {
        try {
            console.log(`📋 Listando tokens para personal ${personalId}`);

            if (!personalId) {
                throw new Error('Personal ID é obrigatório');
            }

            const query: any = { personalId: new mongoose.Types.ObjectId(personalId) };
            
            if (!incluirExpirados) {
                query.status = { $ne: 'expirado' };
            }

            const tokens = await TokenAvulso.find(query)
                .populate('alunoId', 'nome email')
                .populate('adicionadoPorAdmin', 'nome')
                .sort({ dataEmissao: -1 });

            const summary: TokenStatusSummary = {
                totalTokens: tokens.length,
                tokensDisponiveis: tokens.filter(t => t.status === 'disponivel').length,
                tokensUtilizados: tokens.filter(t => t.status === 'utilizado').length,
                tokensExpirados: tokens.filter(t => t.status === 'expirado').length,
                tokens
            };

            console.log(`✅ Encontrados ${summary.totalTokens} tokens para personal ${personalId}`);
            return summary;

        } catch (error) {
            console.error('❌ Erro ao listar tokens:', error);
            throw error;
        }
    }

    /**
     * Conta tokens disponíveis para um personal
     */
    async contarTokensDisponiveis(personalId: string): Promise<number> {
        try {
            if (!personalId) {
                return 0;
            }

            const agora = new Date();
            const count = await TokenAvulso.countDocuments({
                personalId: new mongoose.Types.ObjectId(personalId),
                status: 'disponivel',
                dataExpiracao: { $gt: agora }
            });

            return count;

        } catch (error) {
            console.error('❌ Erro ao contar tokens disponíveis:', error);
            return 0;
        }
    }

    /**
     * Expira tokens que passaram da data de expiração
     */
    async expirarTokensVencidos(): Promise<{ tokensExpirados: number }> {
        try {
            console.log('🔄 Verificando tokens vencidos...');

            const agora = new Date();
            
            const result = await TokenAvulso.updateMany(
                {
                    dataExpiracao: { $lt: agora },
                    status: { $ne: 'expirado' }
                },
                {
                    status: 'expirado',
                    alunoId: undefined
                }
            );

            console.log(`✅ ${result.modifiedCount} tokens marcados como expirados`);
            
            return { tokensExpirados: result.modifiedCount };

        } catch (error) {
            console.error('❌ Erro ao expirar tokens vencidos:', error);
            throw error;
        }
    }

    /**
     * Obtém detalhes de um token específico
     */
    async obterDetalhesToken(tokenId: string): Promise<ITokenAvulso> {
        try {
            if (!tokenId) {
                throw new Error('Token ID é obrigatório');
            }

            const token = await TokenAvulso.findById(tokenId)
                .populate('personalId', 'nome email')
                .populate('alunoId', 'nome email')
                .populate('adicionadoPorAdmin', 'nome');

            if (!token) {
                throw new Error('Token não encontrado');
            }

            return token;

        } catch (error) {
            console.error('❌ Erro ao obter detalhes do token:', error);
            throw error;
        }
    }

    /**
     * Atualiza o status de um token (admin only)
     */
    async atualizarStatusToken(tokenId: string, novoStatus: 'disponivel' | 'utilizado' | 'expirado', adminId: string): Promise<ITokenAvulso> {
        try {
            console.log(`🔄 Atualizando status do token ${tokenId} para ${novoStatus}`);

            if (!tokenId || !novoStatus || !adminId) {
                throw new Error('Token ID, novo status e admin ID são obrigatórios');
            }

            const updateData: any = { status: novoStatus };

            // If marking as available, clear alunoId
            if (novoStatus === 'disponivel') {
                updateData.alunoId = undefined;
            }

            const tokenAtualizado = await TokenAvulso.findByIdAndUpdate(
                tokenId,
                updateData,
                { new: true }
            );

            if (!tokenAtualizado) {
                throw new Error('Token não encontrado');
            }

            console.log(`✅ Status do token ${tokenId} atualizado para ${novoStatus}`);
            return tokenAtualizado;

        } catch (error) {
            console.error('❌ Erro ao atualizar status do token:', error);
            throw error;
        }
    }
}

export default new TokenManagementService();