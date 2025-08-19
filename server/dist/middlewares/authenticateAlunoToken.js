import jwt from 'jsonwebtoken';
import Aluno from '../models/Aluno.js';
import dbConnect from '../lib/dbConnect.js';
export const authenticateAlunoToken = async (req, res, next) => {
    // Garante conexão com o banco ANTES de consultar
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
            console.warn(`[Auth Aluno Middleware] Token sem 'id'. IP:`, req.ip);
            return res.status(403).json({
                message: 'Acesso proibido. Token de aluno com formato inválido.',
                code: 'INVALID_TOKEN_PAYLOAD'
            });
        }
        // Apenas tokens com role 'aluno' podem passar neste middleware
        if ((decoded.role || '').toString().toLowerCase() === 'aluno') {
            const aluno = await Aluno.findById(decoded.id).select('status').lean();
            if (!aluno || aluno.status !== 'active') {
                console.warn(`[Auth Aluno Middleware] Aluno inativo ou não encontrado - ID: ${decoded.id}, IP:`, req.ip);
                return res.status(403).json({
                    message: 'Sua conta está inativa. Fale com seu personal trainer.',
                    code: 'ACCOUNT_INACTIVE'
                });
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
        console.warn(`[Auth Aluno Middleware] Token com role inválida ('${decoded.role}') para rota de aluno. IP:`, req.ip);
        return res.status(403).json({
            message: 'Acesso proibido. Esta rota é exclusiva para alunos.',
            code: 'UNAUTHORIZED_ROLE'
        });
    }
    catch (err) {
        console.warn(`[Auth Aluno Middleware] Falha na verificação do token - ${err.name}: ${err.message}. IP:`, req.ip);
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Sessão de aluno expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Acesso proibido. Token de aluno inválido.', code: 'INVALID_TOKEN' });
        }
        return res.status(500).json({ message: 'Erro interno ao processar o token de aluno.', code: 'TOKEN_PROCESSING_ERROR' });
    }
};
