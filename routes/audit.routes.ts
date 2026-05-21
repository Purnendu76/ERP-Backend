import { Router } from 'express';
import { getAuditLogs, createAuditLog, clearAuditLogs } from '../controllers/audit.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, authorize(['Admin', 'Manager']), getAuditLogs);
router.post('/', authenticate, createAuditLog);
router.delete('/', authenticate, authorize(['Admin']), clearAuditLogs);

export default router;
