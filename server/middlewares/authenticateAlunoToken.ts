// server/middlewares/authenticateAlunoToken.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import Aluno from '../models/Aluno.js'; 
// <<< INÍCIO DA CORREÇÃO >>>
// 1. Importar a função de conexão com o banco de dados.
import dbConnect from '../lib/dbConnect.js';
// <<< FIM DA CORREÇÃO >>>

export const authenticateAlunoToken = async (req: Request, res: Response, next: NextFunction) => {
    // <<< INÍCIO DA CORREÇÃO >>>
    // 2. Garantir que a conexão com o banco esteja estabelecida ANTES de qualquer operação.
    // Esta linha resolve o erro "Cannot call 'alunos.findOne()' before initial connection".
    try {
        await dbConnect();
    } catch (dbError) {
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

    const JWT_SECRET = process.env.JWT_SECRET as Secret;
    if (!JWT_SECRET) {
        console.error("[Auth Aluno Middleware] ERRO CRÍTICO: JWT_SECRET não está definido.");
        return res.status(500).json({ 
            message: 'Erro interno de configuração do servidor.', 
            code: 'SERVER_CONFIGURATION_ERROR' 
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        
        if (!decoded.id) {
            console.warn(`[Auth Aluno Middleware] Falha: Token válido, mas sem 'id' no payload. IP:`, req.ip);
            return res.status(403).json({ 
                message: 'Acesso proibido. Token de aluno com formato inválido.', 
                code: 'INVALID_TOKEN_PAYLOAD' 
            });
        }
        
        if (decoded.role?.toLowerCase() === 'aluno') {
            // Agora esta chamada ao banco de dados é segura, pois a conexão já foi garantida.
            const aluno = await Aluno.findById(decoded.id).select('status').lean();

            if (!aluno || aluno.status !== 'active') {
                console.warn(`[Auth Aluno Middleware] Falha: Tentativa de acesso do aluno inativo ou não encontrado - ID: ${decoded.id}, IP:`, req.ip);
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

        console.warn(`[Auth Aluno Middleware] Falha: Token de ${decoded.role} inválido para rota de aluno. IP:`, req.ip);
        return res.status(403).json({ 
            message: 'Acesso proibido. Esta rota é exclusiva para alunos.', 
            code: 'UNAUTHORIZED_ROLE' 
        });

    } catch (err: any) {
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