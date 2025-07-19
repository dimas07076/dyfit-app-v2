// server/middlewares/authenticateToken.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        console.log("[Auth Middleware] Falha: Token não fornecido no cabeçalho.");
        return res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET as Secret;
    if (!JWT_SECRET) {
        console.error("[Auth Middleware] ERRO CRÍTICO: JWT_SECRET não está definido no .env");
        return res.status(500).json({ message: 'Erro interno de configuração do servidor.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        // <<< CORREÇÃO DEFINITIVA: Converte a role para minúsculo antes de comparar >>>
        const userRole = decoded.role?.toLowerCase();

        if (userRole === 'personal' || userRole === 'admin') {
            req.user = {
                id: decoded.id,
                // Retorna a role original do token para consistência
                role: decoded.role, 
                firstName: decoded.firstName, 
                lastName: decoded.lastName,
                email: decoded.email
            };
            console.log(`[Auth Middleware] Sucesso: Usuário autenticado - ID: ${decoded.id}, Role: ${decoded.role}`);
            return next();
        }
        
        // Se o token for válido, mas a role for de Aluno ou outra inesperada, nega o acesso.
        console.warn(`[Auth Middleware] Falha: Token válido, mas com role não autorizada ('${decoded.role}') para esta rota.`);
        return res.status(403).json({ message: 'Acesso proibido. Você não tem permissão para acessar este recurso.' });

    } catch (err: any) {
        console.warn(`[Auth Middleware] Falha na verificação do token - ${err.name}: ${err.message}`);
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Acesso proibido. Token inválido.' });
        }
        return res.status(500).json({ message: 'Erro interno ao processar o token.' });
    }
};