import { Router } from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expense.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getExpenses);
router.post('/', authenticate, createExpense);
router.put('/:id', authenticate, authorize(['Admin', 'Manager', 'Staff']), updateExpense);
router.delete('/:id', authenticate, authorize(['Admin']), deleteExpense);

export default router;
