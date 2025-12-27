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
  getGalleryStats,
  deleteImageFromGallery
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
  upload.single('image'), // Optional: for adding new images to existing entry
  updateGalleryImage
);

router.delete(
  '/:id',
  authenticateAdmin,
  deleteGalleryImage
);

// Delete specific image from a gallery entry
router.delete(
  '/:id/image/:imageIndex',
  authenticateAdmin,
  deleteImageFromGallery
);

router.post(
  '/delete-multiple',
  authenticateAdmin,
  deleteMultipleGalleryImages
);

export default router;
