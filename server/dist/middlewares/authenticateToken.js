import jwt from 'jsonwebtoken';
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        console.log("[Auth Middleware] Falha: Token não fornecido no cabeçalho. IP:", req.ip, "User-Agent:", req.get('User-Agent'));
        // Adicionado código de erro específico para token não fornecido
        return res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.', code: 'TOKEN_NOT_PROVIDED' });
    }
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        console.error("[Auth Middleware] ERRO CRÍTICO: JWT_SECRET não está definido no .env");
        return res.status(500).json({
            message: 'Erro interno de configuração do servidor.',
            code: 'SERVER_CONFIGURATION_ERROR'
        });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Converte a role para minúsculo antes de comparar
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
        console.warn(`[Auth Middleware] Falha: Token válido, mas com role não autorizada ('${decoded.role}') para esta rota. IP:`, req.ip);
        // Adicionado código de erro específico para role não autorizada
        return res.status(403).json({ message: 'Acesso proibido. Você não tem permissão para acessar este recurso.', code: 'UNAUTHORIZED_ROLE' });
    }
    catch (err) {
        console.warn(`[Auth Middleware] Falha na verificação do token - ${err.name}: ${err.message}. IP:`, req.ip);
        if (err instanceof jwt.TokenExpiredError) {
            // Código de erro para token expirado já existia
            return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.', code: 'TOKEN_EXPIRED' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            // Adicionado código de erro específico para token inválido (genérico)
            return res.status(403).json({ message: 'Acesso proibido. Token inválido.', code: 'INVALID_TOKEN' });
        }
        // Código de erro genérico para outros erros de processamento do token
        return res.status(500).json({ message: 'Erro interno ao processar o token.', code: 'TOKEN_PROCESSING_ERROR' });
    }
};
