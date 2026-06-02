import express from 'express';

import * as commentControllers from '../controllers/comment.controllers.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:occurrence_id', verifyToken, commentControllers.getCommentsByOccurrence);
router.post('/:occurrence_id', verifyToken, commentControllers.createComment);
router.patch('/:comment_id', verifyToken, commentControllers.flagComment);
router.delete('/:comment_id', verifyToken, commentControllers.deleteComment);

export default router;