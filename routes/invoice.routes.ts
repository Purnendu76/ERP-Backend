import { Router } from 'express';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice } from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getInvoices);
router.post('/', authenticate, authorize(['Admin', 'Manager', 'Staff']), createInvoice);
router.put('/:id', authenticate, authorize(['Admin', 'Manager', 'Staff']), updateInvoice);
router.delete('/:id', authenticate, authorize(['Admin']), deleteInvoice);

export default router;
