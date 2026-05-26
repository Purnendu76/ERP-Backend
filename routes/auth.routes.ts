import { Router } from 'express';
import { registerUser, loginUser, getUsers, updateUser, deleteUser, logoutUser } from '../controllers/auth.controller.js';
import { authenticate, authorize, loginRateLimiter } from '../middleware/auth.middleware.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginRateLimiter, loginUser);
router.post('/logout', authenticate, logoutUser);
router.get('/users', authenticate, authorize(['Admin', 'Manager']), getUsers);

// Allow Admin to update any user, and allow any user (Staff, Manager) to update their own profile
router.put('/users/:id', authenticate, (req, res, next) => {
  if (!req.user) {
    throw AppError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }
  
  if (req.user.role === 'Admin' || req.user.id === req.params.id) {
    return next();
  }
  
  throw AppError.forbidden('Access forbidden: Insufficient permissions to modify other accounts', 'INSUFFICIENT_PERMISSIONS');
}, updateUser);

router.delete('/users/:id', authenticate, authorize(['Admin']), deleteUser);

export default router;
