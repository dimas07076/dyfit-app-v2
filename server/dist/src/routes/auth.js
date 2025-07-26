// server/src/routes/auth.ts
import { Router } from 'express';
import PersonalTrainer from '../../models/PersonalTrainer.js';
import Aluno from '../../models/Aluno.js';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import dbConnect from '../../lib/dbConnect.js';
const router = Router();
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("FATAL_ERROR: A variável de ambiente JWT_SECRET não foi encontrada.");
        throw new Error("Configuração de segurança do servidor incompleta.");
    }
    return secret;
};
const getExpiresInSeconds = (durationString, defaultDuration) => {
    try {
        const durationMs = ms(durationString || defaultDuration);
        return Math.floor(durationMs / 1000);
    }
    catch (e) {
        return Math.floor(ms(defaultDuration) / 1000);
    }
};
router.post('/login', async (req, res, next) => {
    await dbConnect();
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }
    try {
        const user = await PersonalTrainer.findOne({ email: email.toLowerCase() }).select('+passwordHash +role');
        if (!user || !user._id) {
            // Adicionado código de erro para credenciais inválidas
            return res.status(401).json({ message: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Adicionado código de erro para credenciais inválidas
            return res.status(401).json({ message: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
        }
        const firstName = user.nome.split(' ')[0] || '';
        const lastName = user.nome.split(' ').slice(1).join(' ') || '';
        let role = user.role?.toLowerCase() === 'admin' ? 'admin' : 'personal';
        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            firstName,
            lastName,
            role: role
        };
        const secret = getJwtSecret();
        const expiresIn = getExpiresInSeconds(process.env.JWT_EXPIRES_IN, '1h');
        const refreshExpiresIn = getExpiresInSeconds(process.env.JWT_REFRESH_EXPIRES_IN, '7d');
        const token = jwt.sign(tokenPayload, secret, { expiresIn });
        const refreshToken = jwt.sign({ id: tokenPayload.id, type: 'refresh' }, secret, { expiresIn: refreshExpiresIn });
        console.log(`[POST /login] SUCESSO: Token gerado para ${email}.`);
        res.json({
            message: 'Login bem-sucedido!',
            token,
            refreshToken,
            user: { ...tokenPayload }
        });
    }
    catch (error) {
        console.error(`[POST /login] Erro catastrófico durante o processo de login para ${email}:`, error);
        next(error);
    }
});
router.post('/aluno/login', async (req, res, next) => {
    await dbConnect();
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    try {
        // <<< ALTERAÇÃO: Agora buscamos o status junto com o hash da senha >>>
        const aluno = await Aluno.findOne({ email: email.toLowerCase() }).select('+passwordHash +status');
        if (!aluno || !aluno._id) {
            // Adicionado código de erro para credenciais inválidas
            return res.status(401).json({ message: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
        }
        const isPasswordValid = await aluno.comparePassword(password);
        if (!isPasswordValid) {
            // Adicionado código de erro para credenciais inválidas
            return res.status(401).json({ message: 'Credenciais inválidas.', code: 'INVALID_CREDENTIALS' });
        }
        // <<< ADIÇÃO: Verificação de status ANTES de gerar o token >>>
        if (aluno.status !== 'active') {
            console.warn(`[POST /aluno/login] Falha: Tentativa de login de aluno inativo - Email: ${aluno.email}`);
            // Retorna o erro 403 com a mensagem e o código que o frontend espera
            return res.status(403).json({
                message: 'Sua conta está inativa. Fale com seu personal trainer.',
                code: 'ACCOUNT_INACTIVE'
            });
        }
        const tokenPayload = {
            id: aluno._id.toString(),
            nome: aluno.nome,
            email: aluno.email,
            personalId: aluno.trainerId?.toString(),
            role: 'aluno',
        };
        const secret = getJwtSecret();
        const expiresIn = getExpiresInSeconds(process.env.JWT_ALUNO_EXPIRES_IN, '7d');
        const refreshExpiresIn = getExpiresInSeconds(process.env.JWT_ALUNO_REFRESH_EXPIRES_IN, '30d');
        const token = jwt.sign(tokenPayload, secret, { expiresIn });
        const refreshToken = jwt.sign({ id: tokenPayload.id, type: 'refresh' }, secret, { expiresIn: refreshExpiresIn });
        console.log(`✅ Login de Aluno bem-sucedido para: ${aluno.email}`);
        res.json({
            message: 'Login de aluno bem-sucedido!',
            token,
            refreshToken,
            aluno: tokenPayload
        });
    }
    catch (error) {
        next(error);
    }
});
// Endpoint para renovar token de Personal/Admin
router.post('/refresh', async (req, res, next) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token é obrigatório.' });
    }
    try {
        const secret = getJwtSecret();
        const decoded = jwt.verify(refreshToken, secret);
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Token inválido.', code: 'INVALID_REFRESH_TOKEN' });
        }
        // Buscar o usuário no banco
        const user = await PersonalTrainer.findById(decoded.id).select('+role');
        if (!user) {
            return res.status(401).json({ message: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' });
        }
        const firstName = user.nome.split(' ')[0] || '';
        const lastName = user.nome.split(' ').slice(1).join(' ') || '';
        let role = user.role?.toLowerCase() === 'admin' ? 'admin' : 'personal';
        const tokenPayload = {
            id: user._id.toString(),
            email: user.email,
            firstName,
            lastName,
            role: role
        };
        const expiresIn = getExpiresInSeconds(process.env.JWT_EXPIRES_IN, '1h');
        const newToken = jwt.sign(tokenPayload, secret, { expiresIn });
        res.json({
            message: 'Token renovado com sucesso!',
            token: newToken,
            user: { ...tokenPayload }
        });
    }
    catch (error) {
        console.error('[POST /refresh] Erro ao renovar token:', error);
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Refresh token inválido ou expirado.', code: 'INVALID_REFRESH_TOKEN' });
        }
        next(error);
    }
});
// Endpoint para renovar token de Aluno
router.post('/aluno/refresh', async (req, res, next) => {
    await dbConnect();
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token é obrigatório.' });
    }
    try {
        const secret = getJwtSecret();
        const decoded = jwt.verify(refreshToken, secret);
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Token inválido.', code: 'INVALID_REFRESH_TOKEN' });
        }
        // Buscar o aluno no banco
        const aluno = await Aluno.findById(decoded.id).select('+status');
        if (!aluno) {
            return res.status(401).json({ message: 'Aluno não encontrado.', code: 'USER_NOT_FOUND' });
        }
        if (aluno.status !== 'active') {
            return res.status(403).json({
                message: 'Sua conta está inativa. Fale com seu personal trainer.',
                code: 'ACCOUNT_INACTIVE'
            });
        }
        const tokenPayload = {
            id: aluno._id.toString(),
            nome: aluno.nome,
            email: aluno.email,
            personalId: aluno.trainerId?.toString(),
            role: 'aluno',
        };
        const expiresIn = getExpiresInSeconds(process.env.JWT_ALUNO_EXPIRES_IN, '7d');
        const newToken = jwt.sign(tokenPayload, secret, { expiresIn });
        res.json({
            message: 'Token de aluno renovado com sucesso!',
            token: newToken,
            aluno: tokenPayload
        });
    }
    catch (error) {
        console.error('[POST /aluno/refresh] Erro ao renovar token:', error);
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: 'Refresh token inválido ou expirado.', code: 'INVALID_REFRESH_TOKEN' });
        }
        next(error);
    }
});
export default router;
