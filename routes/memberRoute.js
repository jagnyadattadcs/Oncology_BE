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
  approveMember,
  rejectMember,
  getMembersByStatus,
  getMemberDetails,
  updateMemberPayment,
  deleteMember,
  getAllMembersNormal
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
router.get('/allmember', getAllMembersNormal);

// Protected member routes (could add JWT middleware here later)
router.put('/profile/:uniqueId', updateMemberProfile);

// Admin routes
router.get('/admin/all', authenticateAdmin, getAllMembers);
router.get('/admin/status/:status', authenticateAdmin, getMembersByStatus);
router.get('/admin/details/:id', authenticateAdmin, getMemberDetails);
router.put('/admin/approve/:id', authenticateAdmin, approveMember);
router.put('/admin/reject/:id', authenticateAdmin, rejectMember);
router.put('/admin/payment/:id', authenticateAdmin, updateMemberPayment);
router.delete('/admin/delete/:id', authenticateAdmin, deleteMember);

export default router;
