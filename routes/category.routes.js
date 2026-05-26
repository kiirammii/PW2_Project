import express from 'express';

import * as categoryControllers from '../controllers/category.controllers.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js'

const router = express.Router();

router.get('/', verifyToken, categoryControllers.getAllCategory);
router.post('/', verifyToken, isAdmin, categoryControllers.createCategory);
router.put('/:category_id', verifyToken, isAdmin, categoryControllers.updateCategory);
router.delete('/:category_id', verifyToken, isAdmin, categoryControllers.deleteCategory);

export default router;