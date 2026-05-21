import { Router } from 'express';
import { registerUser, loginUser, getUsers, updateUser, deleteUser } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/users', authenticate, authorize(['Admin', 'Manager']), getUsers);
router.put('/users/:id', authenticate, authorize(['Admin']), updateUser);
router.delete('/users/:id', authenticate, authorize(['Admin']), deleteUser);

export default router;
