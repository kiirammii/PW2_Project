import express from 'express';

import * as statusControllers from '../controllers/status.controllers.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js'

const router = express.Router();

router.get('/', verifyToken, statusControllers.getAllStatus);
router.post('/', verifyToken, isAdmin, statusControllers.createStatus);
router.put('/:status_id', verifyToken, isAdmin, statusControllers.updateStatus);
router.delete('/:status_id', verifyToken, isAdmin, statusControllers.deleteStatus);

export default router;