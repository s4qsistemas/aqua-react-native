import { Router } from 'express';
import { getHistorialTelemetria } from './telemetria.controller';
import { verifyToken } from '../../middlewares/auth.middleware';

const router = Router();

// Endpoint: GET /api/telemetria/historico/1?horas=24
router.get('/historico/:tenantId', verifyToken, getHistorialTelemetria);

export default router;