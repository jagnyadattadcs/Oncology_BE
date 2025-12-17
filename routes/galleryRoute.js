// routes/galleryRoute.js
import express from 'express';
import upload from '../config/multer.js';
import {
  getAllGalleryImages,
  getGalleryImageById,
  uploadGalleryImage,
  uploadMultipleGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
  deleteMultipleGalleryImages,
  getGalleryStats
} from '../controllers/galleryController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllGalleryImages);
router.get('/stats', getGalleryStats);
router.get('/:id', getGalleryImageById);

// Protected admin routes
router.post(
  '/upload',
  authenticateAdmin,
  upload.single('image'),
  uploadGalleryImage
);

router.post(
  '/upload-multiple',
  authenticateAdmin,
  upload.array('images', 20), // Max 20 images at once
  uploadMultipleGalleryImages
);

router.put(
  '/:id',
  authenticateAdmin,
  upload.single('image'),
  updateGalleryImage
);

router.delete(
  '/:id',
  authenticateAdmin,
  deleteGalleryImage
);

router.post(
  '/delete-multiple',
  authenticateAdmin,
  deleteMultipleGalleryImages
);

export default router;
