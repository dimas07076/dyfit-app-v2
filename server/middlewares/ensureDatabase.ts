// server/middlewares/ensureDatabase.ts
import dbConnect from '../lib/dbConnect.js';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure database connection is established before processing requests
 */
export async function ensureDatabase(req: Request, res: Response, next: NextFunction) {
    try {
        console.log(`🔌 Ensuring database connection for ${req.method} ${req.path}`);
        await dbConnect();
        next();
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        
        res.status(503).json({
            message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
            error: 'DATABASE_CONNECTION_FAILED',
            timestamp: new Date().toISOString()
        });
    }
}