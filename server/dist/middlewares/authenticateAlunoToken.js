import jwt from 'jsonwebtoken';
import Aluno from '../models/Aluno.js';
// <<< INÍCIO DA CORREÇÃO >>>
// 1. Importar a função de conexão com o banco de dados.
import dbConnect from '../lib/dbConnect.js';
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
        return res.status(500).json({ message: 'Erro interno de conexão com o serviço.' });
    }
    // <<< FIM DA CORREÇÃO >>>
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        return res.status(401).json({ message: 'Acesso não autorizado. Token de aluno não fornecido.' });
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        console.error("[Auth Aluno Middleware] ERRO CRÍTICO: JWT_SECRET não está definido.");
        return res.status(500).json({ message: 'Erro interno de configuração do servidor.' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.id) {
            console.warn(`[Auth Aluno Middleware] Falha: Token válido, mas sem 'id' no payload.`);
            return res.status(403).json({ message: 'Acesso proibido. Token de aluno com formato inválido.' });
        }
        if (decoded.role?.toLowerCase() === 'aluno') {
            // Agora esta chamada ao banco de dados é segura, pois a conexão já foi garantida.
            const aluno = await Aluno.findById(decoded.id).select('status').lean();
            if (!aluno || aluno.status !== 'active') {
                console.warn(`[Auth Aluno Middleware] Falha: Tentativa de acesso do aluno inativo ou não encontrado - ID: ${decoded.id}`);
                return res.status(403).json({ message: 'Sua conta está inativa. Fale com seu personal trainer.', code: 'ACCOUNT_INACTIVE' });
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
        console.warn(`[Auth Aluno Middleware] Falha: Token de ${decoded.role} inválido para rota de aluno.`);
        return res.status(403).json({ message: 'Acesso proibido. Esta rota é exclusiva para alunos.' });
    }
    catch (err) {
        // O bloco de erro original foi mantido, mas o erro de Mongoose agora será prevenido.
        console.warn(`[Auth Aluno Middleware] Falha na verificação do token - ${err.name}: ${err.message}`);
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Sessão de aluno expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Acesso proibido. Token de aluno inválido.' });
        }
        return res.status(500).json({ message: 'Erro interno ao processar o token de aluno.' });
    }
};
