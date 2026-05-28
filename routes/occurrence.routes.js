import express from 'express';

import * as occurrenceControllers from '../controllers/occurrence.controllers.js';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware.js';
import { upload } from '../models/cloudinary.config.js';

const router = express.Router();

router.get('/', verifyToken, occurrenceControllers.getAllOccurrences);
router.get('/:occurrence_id', verifyToken, occurrenceControllers.getOneOccurrence);
router.post('/', verifyToken, occurrenceControllers.createOccurrence);
router.patch('/:occurrence_id', verifyToken, occurrenceControllers.updateOccurrence);
router.delete('/:occurrence_id', verifyToken, occurrenceControllers.deleteOccurrence);

router.get('/:occurrence_id/photos', verifyToken, occurrenceControllers.getPhotos);
router.post('/:occurrence_id/photos', verifyToken, upload.single('photo'), occurrenceControllers.uploadPhoto);
router.delete('/:occurrence_id/photos/:photo_id', verifyToken, occurrenceControllers.deletePhoto);

export default router;