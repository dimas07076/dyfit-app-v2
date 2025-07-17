// server/src/routes/profile.ts
import { Router, Request, Response, NextFunction } from 'express';
import PersonalTrainer, { IPersonalTrainer } from '../../models/PersonalTrainer';
import { authenticateToken } from '../../middlewares/authenticateToken';

const router = Router();

router.patch('/me', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    // O resto do arquivo permanece EXATAMENTE igual
    const userId = req.user?.id;
    const { firstName, lastName } = req.body;

    if (!userId) {
        return res.status(401).json({ message: 'Não autorizado: ID do usuário não encontrado no token.' });
    }

    if (!firstName || !lastName) {
        return res.status(400).json({ message: 'Nome e Sobrenome são obrigatórios.' });
    }
    if (typeof firstName !== 'string' || typeof lastName !== 'string') {
         return res.status(400).json({ message: 'Nome e Sobrenome devem ser strings.' });
    }

    try {
        const nomeCompleto = `${firstName.trim()} ${lastName.trim()}`.trim();
        const updatedUser = await PersonalTrainer.findByIdAndUpdate(
            userId,
            { nome: nomeCompleto },
            { new: true, runValidators: true, select: '-passwordHash' }
        ).exec() as IPersonalTrainer | null; 

        if (!updatedUser || !updatedUser._id) {
            console.warn(`[SERVER] Usuário ${userId} não encontrado para atualização de perfil.`);
            return res.status(404).json({ message: 'Personal Trainer não encontrado.' });
        }

        const responseUser = {
            id: updatedUser._id.toString(),
            username: updatedUser.email,
            firstName: updatedUser.nome.split(' ')[0] || '',
            lastName: updatedUser.nome.split(' ').slice(1).join(' ') || '',
            email: updatedUser.email,
            role: updatedUser.role
        };

        console.log(`[SERVER] Perfil atualizado para usuário ${userId}: ${nomeCompleto}`);
        res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: responseUser });

    } catch (error: any) {
        console.error(`[SERVER] Erro ao atualizar perfil para usuário ${userId}:`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e: any) => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        next(error);
    }
});

export default router;