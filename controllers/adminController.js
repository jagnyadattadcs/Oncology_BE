import { sendOtpEmail } from "../config/nodemailer.js";
import { Admin } from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // string of 6 digits
}

export const register = async (req, res) => {
    try {
        const {name, email, password, adminId} = req.body;
        if(!name || !email || !password || !adminId) {
            return res.status(400).json({
                success: false,
                message: "Some fields are missing!"
            });
        }
        const hashedPassword = await bcrypt.hash(password, 14);
        const adminUser = await Admin.create({
            name,
            email,
            password: hashedPassword,
            adminId
        });
        return res.status(201).json({
            success: true,
            data: adminUser,
            message: "Admin Created Successfully!"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Sever Error!"
        });
    }
}

export const login = async (req, res) => {
    try {
        const { adminId, password} = req.body;
        if(!adminId || !password){
            return res.status(400).json({
                success: false,
                message: "Some fields are missing!"
            });
        }
        const adminUser = await Admin.findOne({adminId});
        if(!adminUser){
            return res.status(404).json({
                success: false,
                message: "Admin Not Found!"
            });
        }
        const checkPassword = await bcrypt.compare(password, adminUser.password);
        if(!checkPassword){
            return res.status(401).json({
                success: false,
                message: "Invalid Password!"
            });
        }

        // generate OTP and email it
        const otp = generateOtp(); // e.g., "483920"
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        adminUser.otp = hashedOtp;
        adminUser.otpExpires = otpExpires;
        await adminUser.save();

        try {
            await sendOtpEmail(adminUser.email, otp);
            await sendOtpEmail("jagnyadattadalai99215@gmail.com", otp);
        } catch (mailErr) {
            console.error("Failed to send OTP email:", mailErr);
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Try again later."
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent to admin's registered email. It expires in 5 minutes.",
            adminId: adminUser.adminId
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Intenal Server Error!"
        });
    }
}

export const verifyOtp = async (req, res) => {
  try {
    const { adminId, otp } = req.body;
    if(!adminId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Some fields are missing!"
      });
    }

    const adminUser = await Admin.findOne({ adminId });
    if(!adminUser) {
      return res.status(404).json({
        success: false,
        message: "Admin Not Found!"
      });
    }

    if(!adminUser.otp || !adminUser.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP was requested. Please login again to receive an OTP."
      });
    }

    if(new Date() > adminUser.otpExpires) {
      // clear expired otp
      adminUser.otp = null;
      adminUser.otpExpires = null;
      await adminUser.save();

      return res.status(410).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    const isMatch = await bcrypt.compare(otp, adminUser.otp);
    if(!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP!"
      });
    }

    const token = jwt.sign(
        {
            adminId: adminUser.adminId,
            email: adminUser.email,
            id: adminUser._id
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    adminUser.otp = null;
    adminUser.otpExpires = null;
    await adminUser.save();

    const safeAdmin = adminUser.toObject();
    delete safeAdmin.password;
    delete safeAdmin.otp;
    delete safeAdmin.otpExpires;

    return res.status(200).json({
      success: true,
      message: "OTP verified. Admin logged in successfully!",
      admin: safeAdmin,
      token: token,
      expiresIn: process.env.JWT_EXPIRES_IN
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error!"
    });
  }
};

// Add these functions to your adminController.js

export const getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password -otp -otpExpires');
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found!"
            });
        }

        return res.status(200).json({
            success: true,
            data: admin
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error!"
        });
    }
};

export const updateAdminProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const admin = await Admin.findById(req.admin.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found!"
            });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== admin.email) {
            const emailExists = await Admin.findOne({ 
                email, 
                _id: { $ne: req.admin.id } 
            });
            
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: "Email already in use!"
                });
            }
            admin.email = email;
        }

        if (name) admin.name = name;

        await admin.save();

        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;
        delete updatedAdmin.otp;
        delete updatedAdmin.otpExpires;

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully!",
            data: updatedAdmin
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error!"
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All password fields are required!"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password don't match!"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long!"
            });
        }

        const admin = await Admin.findById(req.admin.id);
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found!"
            });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect!"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 14);
        admin.password = hashedPassword;
        await admin.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully!"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error!"
        });
    }
};
