import express from 'express';

import * as occurrenceControllers from '../controllers/occurrence.controllers.js';
import * as statisticControllers from '../controllers/statistic.controllers.js'

const router = express.Router();

router.get('/statistics', statisticControllers.getGlobalStatistics);

router.get('/', occurrenceControllers.getAllOccurrences);
router.get('/:occurrence_id', occurrenceControllers.getOneOccurrence);
router.post('/', occurrenceControllers.createOccurrence);
router.patch('/:occurrence_id', occurrenceControllers.updateOccurrence);
router.delete('/:occurrence_id', occurrenceControllers.deleteOccurrence);

router.get('/:occurrence_id/photos', occurrenceControllers.getPhotos);
router.post('/:occurrence_id/photos', occurrenceControllers.uploadPhoto);
router.delete('/:occurrence_id/photos/:photo_id', occurrenceControllers.deletePhoto);

router.get('/:occurrence_id/status_history', occurrenceControllers.getStatusHistory);
router.post('/:occurrence_id/status_history', occurrenceControllers.createStatusHistory);

export default router;