// server/src/routes/authRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer.js';
import jwt from 'jsonwebtoken';
import ms from 'ms';
import dbConnect from '../../lib/dbConnect.js'; // <<< IMPORTAÇÃO ADICIONADA

const router = Router();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const calculateExpiresInSeconds = (durationStr: string): number => {
  const msValue = ms(durationStr);
  return typeof msValue === 'number' ? Math.floor(msValue / 1000) : 3600;
};
const expiresInSeconds = calculateExpiresInSeconds(JWT_EXPIRES_IN);

// --- Login Personal/Admin ---
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  await dbConnect(); // <<< CHAMADA ADICIONADA
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });

  try {
    const user: IPersonalTrainer | null = await PersonalTrainer
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash +role');

    if (!user || !user._id) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const firstName = user.nome.split(' ')[0] || '';
    const lastName = user.nome.split(' ').slice(1).join(' ') || '';
    const role = user.role;

    const tokenPayload = {
      id: user._id.toString(),
      email: user.email,
      firstName,
      lastName,
      role,
    };

    if(!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET não está definido nas variáveis de ambiente.");
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: expiresInSeconds,
    });

    res.json({
      message: 'Login bem-sucedido!',
      token,
      user: {
        id: user._id.toString(),
        trainerId: user._id.toString(),
        username: user.email,
        firstName,
        lastName,
        email: user.email,
        role,
      },
    });

  } catch (error) {
    console.error("Erro no login:", error);
    next(error);
  }
});

export default router;