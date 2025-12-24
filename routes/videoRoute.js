import express from 'express';
import { body } from 'express-validator';
import {
  getAllVideos,
  getVideoById,
  getVideoStats,
  getFeaturedVideos,
  getVideosByCategory,
  searchVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  bulkUpdateVideoStatus,
  getAdminVideoList,
  incrementVideoMeta
} from '../controllers/videoController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation middleware
const videoValidation = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .trim()
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('youtubeUrl')
    .notEmpty().withMessage('YouTube URL is required')
    .isURL().withMessage('Please provide a valid URL'),
  body('duration')
    .notEmpty().withMessage('Duration is required')
    .matches(/^([0-9]+:)?[0-5]?[0-9]:[0-5][0-9]$/).withMessage('Duration must be in format HH:MM:SS or MM:SS'),
  body('eventDate')
    .notEmpty().withMessage('Event date is required')
    .isISO8601().withMessage('Please provide a valid date'),
  body('speaker')
    .notEmpty().withMessage('Speaker name is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Speaker name cannot exceed 100 characters'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn([
      'conference',
      'workshop',
      'seminar',
      'webinar',
      'symposium',
      'training',
      'lecture',
      'panel-discussion',
      'keynote',
      'other'
    ]).withMessage('Invalid category')
];

// Public routes
router.get('/', getAllVideos);
router.get('/stats/summary', getVideoStats);
router.get('/featured', getFeaturedVideos);
router.get('/category/:category', getVideosByCategory);
router.get('/search', searchVideos);
router.get('/:id', getVideoById);

// Meta actions (public)
router.post('/:id/meta/:field', incrementVideoMeta);

// Admin routes (protected)
router.get('/admin/list', authenticateAdmin, getAdminVideoList);
router.post('/', authenticateAdmin, videoValidation, createVideo);
router.put('/:id', authenticateAdmin, updateVideo);
router.delete('/:id', authenticateAdmin, deleteVideo);
router.put('/bulk/status', authenticateAdmin, bulkUpdateVideoStatus);

export default router;