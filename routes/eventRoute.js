import express from 'express';
import upload from '../config/multer.js';
import {
    getAllEvents,
    getEventsByCategory,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleEventCompletion,
    toggleFeaturedStatus,
    getEventStats
} from '../controllers/eventController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllEvents);
router.get('/by-category', getEventsByCategory); // New route for EventSection
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

router.put(
    '/:id/featured',
    authenticateAdmin,
    toggleFeaturedStatus
);

router.delete(
    '/:id',
    authenticateAdmin,
    deleteEvent
);

export default router;
