import express from 'express';
import {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats
} from '../controllers/contactController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - anyone can submit contact form
router.post('/submit', submitContactForm);

// Admin routes - all protected
router.get('/admin/all', authenticateAdmin, getAllContacts);
router.get('/admin/stats', authenticateAdmin, getContactStats);
router.get('/admin/:id', authenticateAdmin, getContactById);
router.put('/admin/:id', authenticateAdmin, updateContactStatus);
router.delete('/admin/:id', authenticateAdmin, deleteContact);

export default router;