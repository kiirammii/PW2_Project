import express from 'express';

import * as authControllers from '../controllers/auth.controllers.js';    

const router = express.Router();

router.post('/', authControllers.registerUser);
router.post('/login', authControllers.loginUser);

export default router;