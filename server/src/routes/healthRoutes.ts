// server/src/routes/healthRoutes.ts
import express from 'express';
import dbConnect from '../../lib/dbConnect.js';
import PlanoService from '../../services/PlanoService.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * GET /api/health - Health check endpoint
 */
router.get('/health', async (req, res) => {
    const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'disconnected',
        plans: 'unknown',
        checks: {
            database: false,
            plans: false,
            connection: false
        }
    };

    try {
        // Check database connection
        await dbConnect();
        healthStatus.database = 'connected';
        healthStatus.checks.database = true;
        healthStatus.checks.connection = mongoose.connection.readyState === 1;

        // Check plans availability
        try {
            const planos = await PlanoService.getAllPlans();
            healthStatus.plans = `${planos.length} plans available`;
            healthStatus.checks.plans = planos.length > 0;
        } catch (planError) {
            console.error('Health check - Plans error:', planError);
            healthStatus.plans = 'error checking plans';
        }

        // Overall status
        const allChecksPass = Object.values(healthStatus.checks).every(check => check === true);
        healthStatus.status = allChecksPass ? 'healthy' : 'degraded';

        res.status(allChecksPass ? 200 : 503).json(healthStatus);

    } catch (error) {
        console.error('Health check failed:', error);
        
        healthStatus.status = 'unhealthy';
        healthStatus.database = 'error';
        
        res.status(503).json({
            ...healthStatus,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/health/detailed - Detailed system status
 */
router.get('/health/detailed', async (req, res) => {
    try {
        await dbConnect();
        
        const detailedStatus = {
            timestamp: new Date().toISOString(),
            database: {
                connected: mongoose.connection.readyState === 1,
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host,
                name: mongoose.connection.name
            },
            plans: {
                available: 0,
                initialized: false,
                status: 'unknown'
            },
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            uptime: Math.round(process.uptime())
        };

        // Check plans in detail
        try {
            const planos = await PlanoService.getAllPlans();
            detailedStatus.plans.available = planos.length;
            detailedStatus.plans.initialized = planos.length > 0;
            detailedStatus.plans.status = planos.length > 0 ? 'ready' : 'needs_initialization';
        } catch (error) {
            detailedStatus.plans.status = 'error';
        }

        res.json(detailedStatus);
        
    } catch (error) {
        console.error('Detailed health check failed:', error);
        res.status(503).json({
            error: 'Health check failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

export default router;