import express from 'express';

import * as statusControllers from '../controllers/status.controllers.js';    

const router = express.Router();

router.get('/', statusControllers.getAllStatus);
router.post('/', statusControllers.createStatus);
router.put('/:status_id', statusControllers.updateStatus);
router.delete('/:status_id', statusControllers.deleteStatus);

export default router;