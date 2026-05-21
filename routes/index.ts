import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import expenseRoutes from './expense.routes.js';
import invoiceRoutes from './invoice.routes.js';
import auditRoutes from './audit.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/expenses', expenseRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
