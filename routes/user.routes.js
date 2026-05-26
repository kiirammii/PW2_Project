import express from 'express';

import * as userControllers from '../controllers/user.controllers.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js'

const router = express.Router();

router.post('/', userControllers.registerUser);
router.post('/login', userControllers.loginUser);
router.get('/', verifyToken, isAdmin, userControllers.getAllUsers);
router.patch('/:user_id', verifyToken, userControllers.updateUser);
router.delete('/:user_id', verifyToken, isAdmin, userControllers.deleteUser);

export default router;   