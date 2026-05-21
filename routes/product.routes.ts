import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getProducts);
router.post('/', authenticate, authorize(['Admin', 'Manager']), createProduct);
router.put('/:id', authenticate, authorize(['Admin', 'Manager']), updateProduct);
router.delete('/:id', authenticate, authorize(['Admin']), deleteProduct);

export default router;
