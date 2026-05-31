import express from 'express';

import * as commentControllers from '../controllers/comment.controllers.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:occurrence_id/comments', verifyToken, commentControllers.getCommentsByOccurrence);
router.post('/:occurrence_id/comments', verifyToken, commentControllers.createComment);
router.patch('/:comment_id', verifyToken, commentControllers.flagComment);
router.delete('/:comment_id', verifyToken, commentControllers.deleteComment);

export default router;