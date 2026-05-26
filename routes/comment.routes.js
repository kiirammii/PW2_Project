import express from 'express';

import * as commentControllers from '../controllers/comment.controllers.js';

const router = express.Router();

router.get('/:occurrence_id/comments', commentControllers.getCommentsByOccurrence);
router.post('/:occurrence_id/comments', commentControllers.createComment);
router.patch('/:occurrence_id/comments/:comment_id', commentControllers.flagComment);
router.delete('/:occurrence_id/comments/:comment_id', commentControllers.deleteComment);

export default router;