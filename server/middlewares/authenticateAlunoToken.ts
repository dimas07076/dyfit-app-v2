// server/middlewares/authenticateAlunoToken.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

// <<< LÓGICA CORRIGIDA E COMPLETA >>>
// Este middleware agora é AUTÔNOMO e responsável por autenticar o ALUNO.
export const authenticateAlunoToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ message: 'Acesso não autorizado. Token de aluno não fornecido.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET as Secret;
    if (!JWT_SECRET) {
        console.error("[Auth Aluno Middleware] ERRO CRÍTICO: JWT_SECRET não está definido.");
        return res.status(500).json({ message: 'Erro interno de configuração do servidor.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        // Este middleware SÓ deve aceitar tokens com a role 'aluno'.
        if (decoded.role?.toLowerCase() === 'aluno') {
            req.aluno = {
                id: decoded.id,
                role: 'aluno',
                nome: decoded.nome,
                email: decoded.email,
                personalId: decoded.personalId,
            };
            console.log(`[Auth Aluno Middleware] Sucesso: Aluno autenticado - ID: ${decoded.id}`);
            return next();
        }

        // Se o token for válido mas não for de um aluno (ex: um personal tentando acessar), nega o acesso.
        console.warn(`[Auth Aluno Middleware] Falha: Token de ${decoded.role} inválido para rota de aluno.`);
        return res.status(403).json({ message: 'Acesso proibido. Esta rota é exclusiva para alunos.' });

    } catch (err: any) {
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