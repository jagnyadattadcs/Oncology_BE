import express from 'express';
import upload from '../config/multer.js';
import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMembersByRole,
  getMemberStats,
  searchMembers
} from '../controllers/councilMemberController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getAllMembers);
router.get('/stats', getMemberStats);
router.get('/search', searchMembers);
router.get('/role/:role', getMembersByRole);
router.get('/:id', getMemberById);

// Protected admin routes
router.post(
  '/',
  authenticateAdmin,
  upload.single('image'),
  createMember
);

router.put(
  '/:id',
  authenticateAdmin,
  upload.single('image'),
  updateMember
);

router.delete(
  '/:id',
  authenticateAdmin,
  deleteMember
);

export default router;
