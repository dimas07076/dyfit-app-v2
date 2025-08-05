import jwt from 'jsonwebtoken';
import Aluno from '../models/Aluno.js';
// <<< INÍCIO DA CORREÇÃO >>>
// 1. Importar a função de conexão com o banco de dados.
import dbConnect from '../lib/dbConnect.js';
// Importar PlanoService para verificar status do personal trainer
import PlanoService from '../services/PlanoService.js';
// <<< FIM DA CORREÇÃO >>>
export const authenticateAlunoToken = async (req, res, next) => {
    // <<< INÍCIO DA CORREÇÃO >>>
    // 2. Garantir que a conexão com o banco esteja estabelecida ANTES de qualquer operação.
    // Esta linha resolve o erro "Cannot call 'alunos.findOne()' before initial connection".
    try {
        await dbConnect();
    }
    catch (dbError) {
        console.error("[Auth Aluno Middleware] ERRO CRÍTICO: Falha ao conectar ao banco de dados.", dbError);
        return res.status(500).json({
            message: 'Erro interno de conexão com o serviço.',
            code: 'DATABASE_CONNECTION_ERROR'
        });
    }
    // <<< FIM DA CORREÇÃO >>>
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        console.log("[Auth Aluno Middleware] Falha: Token não fornecido. IP:", req.ip, "User-Agent:", req.get('User-Agent'));
        return res.status(401).json({
            message: 'Acesso não autorizado. Token de aluno não fornecido.',
            code: 'TOKEN_NOT_PROVIDED'
        });
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        console.error("[Auth Aluno Middleware] ERRO CRÍTICO: JWT_SECRET não está definido.");
        return res.status(500).json({
            message: 'Erro interno de configuração do servidor.',
            code: 'SERVER_CONFIGURATION_ERROR'
        });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.id) {
            console.warn(`[Auth Aluno Middleware] Falha: Token válido, mas sem 'id' no payload. IP:`, req.ip);
            return res.status(403).json({
                message: 'Acesso proibido. Token de aluno com formato inválido.',
                code: 'INVALID_TOKEN_PAYLOAD'
            });
        }
        if (decoded.role?.toLowerCase() === 'aluno') {
            // Agora esta chamada ao banco de dados é segura, pois a conexão já foi garantida.
            const aluno = await Aluno.findById(decoded.id).select('status trainerId').lean();
            if (!aluno || aluno.status !== 'active') {
                console.warn(`[Auth Aluno Middleware] Falha: Tentativa de acesso do aluno inativo ou não encontrado - ID: ${decoded.id}, IP:`, req.ip);
                return res.status(403).json({ message: 'Sua conta está inativa. Fale com seu personal trainer.', code: 'ACCOUNT_INACTIVE' });
            }
            // NEW: Check if the student's trainer has an active plan or tokens
            if (aluno.trainerId) {
                try {
                    const trainerStatus = await PlanoService.getPersonalCurrentPlan(aluno.trainerId.toString());
                    // Check if trainer has any active capacity (plan + tokens)
                    const hasActiveCapacity = trainerStatus.limiteAtual > 0;
                    if (!hasActiveCapacity) {
                        console.warn(`[Auth Aluno Middleware] Falha: Aluno ${decoded.id} tentou acessar, mas seu personal trainer ${aluno.trainerId} não possui plano ou tokens ativos.`);
                        return res.status(403).json({
                            message: 'Seu acesso foi encerrado. Entre em contato com seu personal trainer para reativar sua conta.',
                            code: 'TRAINER_NO_ACTIVE_PLAN'
                        });
                    }
                    // Additional check: If trainer has expired plan and no tokens
                    if (trainerStatus.isExpired && trainerStatus.tokensAvulsos === 0) {
                        console.warn(`[Auth Aluno Middleware] Falha: Aluno ${decoded.id} tentou acessar, mas o plano do personal trainer ${aluno.trainerId} expirou e não há tokens ativos.`);
                        return res.status(403).json({
                            message: 'Seu acesso foi encerrado devido ao vencimento do plano do seu personal trainer. Entre em contato com ele para renovação.',
                            code: 'TRAINER_PLAN_EXPIRED'
                        });
                    }
                    console.log(`✅ [Auth Aluno Middleware] Aluno ${decoded.id} autorizado - Trainer ${aluno.trainerId} possui limite ativo: ${trainerStatus.limiteAtual}`);
                }
                catch (trainerError) {
                    console.error(`[Auth Aluno Middleware] Erro ao verificar status do trainer ${aluno.trainerId}:`, trainerError);
                    // In case of error checking trainer status, allow access but log the error
                    // This prevents students from being locked out due to temporary server issues
                    console.warn(`[Auth Aluno Middleware] Permitindo acesso do aluno ${decoded.id} devido a erro na verificação do trainer.`);
                }
            }
            req.aluno = {
                id: decoded.id,
                role: 'aluno',
                nome: decoded.nome,
                email: decoded.email,
                personalId: decoded.personalId,
            };
            return next();
        }
        console.warn(`[Auth Aluno Middleware] Falha: Token de ${decoded.role} inválido para rota de aluno. IP:`, req.ip);
        return res.status(403).json({
            message: 'Acesso proibido. Esta rota é exclusiva para alunos.',
            code: 'UNAUTHORIZED_ROLE'
        });
    }
    catch (err) {
        // O bloco de erro original foi mantido, mas o erro de Mongoose agora será prevenido.
        console.warn(`[Auth Aluno Middleware] Falha na verificação do token - ${err.name}: ${err.message}. IP:`, req.ip);
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Sessão de aluno expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({
                message: 'Acesso proibido. Token de aluno inválido.',
                code: 'INVALID_TOKEN'
            });
        }
        return res.status(500).json({
            message: 'Erro interno ao processar o token de aluno.',
            code: 'TOKEN_PROCESSING_ERROR'
        });
    }
};
