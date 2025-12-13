import express from "express";
import { login, register, verifyOtp } from "../controllers/adminController.js";

const router = express.Router();

// router.route("/anonymously/register").post(register);
router.route("/login").post(login);
router.route("/verify-otp").post(verifyOtp);

export default router;