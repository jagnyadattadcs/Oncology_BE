// routes/memberRoute.js
import express from 'express';
import upload from '../config/multer.js';
import {
  registerMember,
  verifyMemberOtp,
  loginMember,
  changeMemberPassword,
  resendMemberOtp,
  getMemberProfile,
  updateMemberProfile,
  getAllMembers,
  toggleMemberVerification,
  toggleMemberPayment
} from '../controllers/memberController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post(
  '/register',
  upload.single('documentImage'), // Document image upload
  registerMember
);

router.post('/verify-otp', verifyMemberOtp);
router.post('/login', loginMember);
router.post('/change-password', changeMemberPassword);
router.post('/resend-otp', resendMemberOtp);
router.get('/profile/:uniqueId', getMemberProfile);

// Protected member routes (could add JWT middleware here later)
router.put('/profile/:uniqueId', updateMemberProfile);

// Admin routes
router.get('/admin/all', authenticateAdmin, getAllMembers);
router.put('/admin/toggle-verify/:id', authenticateAdmin, toggleMemberVerification);
router.put('/admin/toggle-payment/:id', authenticateAdmin, toggleMemberPayment);

export default router;
