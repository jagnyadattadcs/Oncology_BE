// routes/carouselRoute.js
import express from 'express';
import upload from '../config/multer.js';
import { 
  getAllCarouselImages,
  uploadCarouselImage,
  updateCarouselImage,
  updateCarouselImageWithFile,
  toggleCarouselImageStatus,
  deleteCarouselImage
} from '../controllers/carouselController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - get all carousel images
router.get('/', getAllCarouselImages);

// Protected routes (admin only)
router.post(
  '/upload',
  authenticateAdmin,
  upload.single('image'),
  uploadCarouselImage
);

// Update image details (without changing image)
router.put(
  '/:id',
  authenticateAdmin,
  updateCarouselImage
);

// Update image with new file
router.put(
  '/:id/image',
  authenticateAdmin,
  upload.single('image'),
  updateCarouselImageWithFile
);

// Toggle image status
router.put(
  '/status/:id',
  authenticateAdmin,
  toggleCarouselImageStatus
);

router.delete(
  '/:id',
  authenticateAdmin,
  deleteCarouselImage
);

export default router;