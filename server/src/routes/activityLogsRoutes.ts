// server/src/routes/activityLogsRoutes.ts
import express, { Request, Response, NextFunction } from 'express';
import dbConnect from '../../lib/dbConnect.js'; // Importação que você já fez (correto!)
import { authenticateToken } from '../../middlewares/authenticateToken.js';

const router = express.Router();

console.log("--- [server/src/routes/activityLogsRoutes.ts] Ficheiro carregado ---");

// GET /api/activity-logs - Placeholder
router.get('/', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
    
    await dbConnect(); // <<< ADICIONE A CHAMADA BEM AQUI

    const trainerId = req.user?.id;
    const limitParam = req.query.limit;
    const limit = typeof limitParam === 'string' && parseInt(limitParam) > 0 ? parseInt(limitParam) : 5;

    if (!trainerId) {
        return res.status(401).json({ mensagem: "Usuário não autenticado." });
    }

    console.log(`[GET /api/activity-logs] (Placeholder) Buscando logs para trainerId: ${trainerId} com limite: ${limit}`);

    try {
        const mockActivities: any[] = [];
        
        res.json(mockActivities);

    } catch (error) {
        console.error("[GET /api/activity-logs] (Placeholder) Erro:", error);
        next(error);
    }
});

export default router;