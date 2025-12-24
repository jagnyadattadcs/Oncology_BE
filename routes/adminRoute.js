import express from "express";
import { 
    login, 
    verifyOtp,
    getAdminProfile,
    updateAdminProfile,
    changePassword 
} from "../controllers/adminController.js";
import { authenticateAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.route("/login").post(login);
router.route("/verify-otp").post(verifyOtp);

// Protected routes (require authentication)
router.route("/profile").get(authenticateAdmin, getAdminProfile);
router.route("/profile").put(authenticateAdmin, updateAdminProfile);
router.route("/change-password").post(authenticateAdmin, changePassword);

export default router;