// server/src/routes/auth.ts
import { Router, Request, Response, NextFunction } from 'express';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer.js';
import Aluno, { IAluno } from '../../models/Aluno.js';
import jwt, { Secret } from 'jsonwebtoken';
import ms from 'ms';
import dbConnect from '../../lib/dbConnect.js';

const router = Router();

const getJwtSecret = (): Secret => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("FATAL_ERROR: A variável de ambiente JWT_SECRET não foi encontrada.");
        throw new Error("Configuração de segurança do servidor incompleta.");
    }
    return secret;
};

const getExpiresInSeconds = (durationString: string | undefined, defaultDuration: string): number => {
    try {
        const durationMs = ms(durationString || defaultDuration);
        return Math.floor(durationMs / 1000);
    } catch (e) {
        return Math.floor(ms(defaultDuration) / 1000);
    }
};

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const user: IPersonalTrainer | null = await PersonalTrainer.findOne({ email: email.toLowerCase() }).select('+passwordHash +role');
        
        if (!user || !user._id) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
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
        const token = jwt.sign(tokenPayload, secret, { expiresIn });

        console.log(`[POST /login] SUCESSO: Token gerado para ${email}.`);
        res.json({ message: 'Login bem-sucedido!', token, user: { ...tokenPayload } });

    } catch (error) {
        console.error(`[POST /login] Erro catastrófico durante o processo de login para ${email}:`, error);
        next(error);
    }
});

router.post('/aluno/login', async (req: Request, res: Response, next: NextFunction) => {
    await dbConnect();
    
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });

    try {
        // <<< ALTERAÇÃO: Agora buscamos o status junto com o hash da senha >>>
        const aluno: IAluno | null = await Aluno.findOne({ email: email.toLowerCase() }).select('+passwordHash +status');
        if (!aluno || !aluno._id) return res.status(401).json({ message: 'Credenciais inválidas.' });
        
        const isPasswordValid = await aluno.comparePassword(password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Credenciais inválidas.' });

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
        const token = jwt.sign(tokenPayload, secret, { expiresIn });
        
        console.log(`✅ Login de Aluno bem-sucedido para: ${aluno.email}`);
        res.json({
            message: 'Login de aluno bem-sucedido!',
            token,
            aluno: tokenPayload
        });
    } catch (error) {
        next(error);
    }
});

export default router;