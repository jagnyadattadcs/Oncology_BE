// routes/eventRoute.js
import express from 'express';
import upload from '../config/multer.js';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventCompletion,
  getEventStats
} from '../controllers/eventController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllEvents);
router.get('/stats', getEventStats);
router.get('/:id', getEventById);

// Protected admin routes
router.post(
  '/create',
  authenticateAdmin,
  upload.single('image'),
  createEvent
);

router.put(
  '/:id',
  authenticateAdmin,
  upload.single('image'),
  updateEvent
);

router.put(
  '/:id/status',
  authenticateAdmin,
  toggleEventCompletion
);

router.delete(
  '/:id',
  authenticateAdmin,
  deleteEvent
);

export default router;
