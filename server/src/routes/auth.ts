// server/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer.js';
import Aluno, { IAluno } from '../../models/Aluno.js';
import jwt, { Secret } from 'jsonwebtoken';
import ms from 'ms';

const router = Router();

// Função para obter o JWT_SECRET de forma segura.
// Se não existir, lança um erro para que a aplicação pare com um log claro.
const getJwtSecret = (): Secret => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        // Este erro será visível nos logs da Vercel.
        console.error("FATAL_ERROR: A variável de ambiente JWT_SECRET não foi encontrada.");
        throw new Error("Configuração de segurança do servidor incompleta.");
    }
    return secret;
};

// Função para obter o tempo de expiração (sem alterações)
const getExpiresInSeconds = (durationString: string | undefined, defaultDuration: string): number => {
    try {
        const durationMs = ms(durationString || defaultDuration);
        return Math.floor(durationMs / 1000);
    } catch (e) {
        return Math.floor(ms(defaultDuration) / 1000);
    }
};

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;
    
    // Log inicial para confirmar que a rota foi chamada
    console.log(`[POST /login] Tentativa de login para o email: ${email}`);

    if (!email || !password) {
        console.log("[POST /login] Falha: Email ou senha não fornecidos.");
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const secret = getJwtSecret(); // Pega o segredo no início. Se falhar, lança erro.
        console.log("[POST /login] JWT_SECRET lido com sucesso.");

        const user: IPersonalTrainer | null = await PersonalTrainer.findOne({ email: email.toLowerCase() }).select('+passwordHash +role');
        
        if (!user || !user._id) {
            console.log(`[POST /login] Falha: Usuário com email ${email} não encontrado no banco.`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        console.log(`[POST /login] Usuário ${email} encontrado. Verificando senha...`);

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.log(`[POST /login] Falha: Senha inválida para o usuário ${email}.`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        console.log(`[POST /login] Senha válida para ${email}. Gerando token...`);
        
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
        const token = jwt.sign(tokenPayload, secret, { expiresIn });

        console.log(`[POST /login] SUCESSO: Token gerado para ${email}.`);
        res.json({ message: 'Login bem-sucedido!', token, user: { ...tokenPayload } });

    } catch (error) {
        console.error(`[POST /login] Erro catastrófico durante o processo de login para ${email}:`, error);
        next(error); // Passa para o errorHandler global.
    }
});

// A rota de login do aluno permanece a mesma
router.post('/aluno/login', async (req: Request, res: Response, next: NextFunction) => {
    // ... seu código existente ...
});

export default router;