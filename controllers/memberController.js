// controllers/memberController.js
import { Member } from '../models/memberModel.js';
import { sendOtpEmail, sendMemberWelcomeEmail, sendPasswordChangeEmail } from '../config/nodemailer.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate unique member ID
async function generateUniqueId(phone) {
  try {
    // Get current year last two digits
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Get last 4 digits of phone
    const phoneLast4 = phone.slice(-4);
    
    // Get total members count to generate serial number
    const totalMembers = await Member.countDocuments();
    const serialNumber = (totalMembers + 1).toString().padStart(4, '0');
    
    // Generate unique ID
    return `OSOO${year}${phoneLast4}${serialNumber}`;
  } catch (error) {
    // Fallback ID if something goes wrong
    const fallbackId = `OSOO${new Date().getFullYear().toString().slice(-2)}${phone.slice(-4)}${crypto.randomInt(1000, 9999)}`;
    return fallbackId;
  }
}

// Generate temporary password
function generateTempPassword() {
  const length = 10;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Member Registration
export const registerMember = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      documentType, 
      documentNo 
    } = req.body;

    // Check required fields
    if (!name || !email || !phone || !documentType || !documentNo) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!"
      });
    }

    // Check if document image is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document image is required!"
      });
    }

    // Check if member already exists with email
    const existingMember = await Member.findOne({ email });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Member with this email already exists!"
      });
    }

    // Check if member already exists with phone
    const existingPhone = await Member.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Member with this phone number already exists!"
      });
    }

    // Upload document image to Cloudinary
    const documentImageResult = await uploadToCloudinary(req.file.buffer, 'osoo_member_documents');

    // Generate OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create member with OTP (not verified yet)
    const memberData = {
      name,
      email,
      phone,
      documentType,
      documentNo,
      documentImage: documentImageResult.secure_url,
      otp: hashedOtp,
      otpExpires
    };

    // Check if temp data already exists (prevent duplicate)
    const tempMember = await Member.findOne({ 
      email, 
      isVerified: false 
    });

    if (tempMember) {
      // Update existing temp member
      tempMember.otp = hashedOtp;
      tempMember.otpExpires = otpExpires;
      await tempMember.save();
    } else {
      // Create new temp member
      await Member.create(memberData);
    }

    // Send OTP email
    try {
      await sendOtpEmail(email, otp);
    } catch (mailError) {
      console.error("Failed to send OTP email:", mailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email. Please verify to complete registration.",
      email
    });

  } catch (error) {
    console.error("Registration error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry found. Email or phone already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during registration."
    });
  }
};

// Verify OTP and Complete Registration
export const verifyMemberOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required!"
      });
    }

    // Find unverified member
    const member = await Member.findOne({ 
      email, 
      isVerified: false 
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or already verified!"
      });
    }

    // Check if OTP exists and is not expired
    if (!member.otp || !member.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one."
      });
    }

    if (new Date() > member.otpExpires) {
      // Clear expired OTP
      member.otp = null;
      member.otpExpires = null;
      await member.save();

      return res.status(410).json({
        success: false,
        message: "OTP expired. Please request a new OTP."
      });
    }

    // Verify OTP
    const isOtpValid = await bcrypt.compare(otp, member.otp);
    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP!"
      });
    }

    // Generate unique ID and temp password
    const uniqueId = await generateUniqueId(member.phone);
    const tempPassword = generateTempPassword();
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // Update member with verification details
    member.uniqueId = uniqueId;
    member.tempPassword = hashedTempPassword;
    member.isVerified = true;
    member.otp = null;
    member.otpExpires = null;
    await member.save();

    // Send welcome email with credentials
    try {
      await sendMemberWelcomeEmail(email, member.name, uniqueId, tempPassword);
    } catch (mailError) {
      console.error("Failed to send welcome email:", mailError);
      // Don't fail the registration if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Registration successful! Check your email for login credentials.",
      memberId: uniqueId
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during OTP verification."
    });
  }
};

// Member Login
export const loginMember = async (req, res) => {
  try {
    const { uniqueId, password } = req.body;

    if (!uniqueId || !password) {
      return res.status(400).json({
        success: false,
        message: "Unique ID and password are required!"
      });
    }

    // Find member by uniqueId
    const member = await Member.findOne({ uniqueId, isVerified: true });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or not verified!"
      });
    }

    // Check if member has temp password or regular password
    let passwordMatch = false;
    
    if (member.tempPassword) {
      // Check temp password
      passwordMatch = await bcrypt.compare(password, member.tempPassword);
      if (passwordMatch) {
        // Return flag indicating temp password login
        return res.status(200).json({
          success: true,
          message: "Login successful with temporary password. Please change your password.",
          member: {
            id: member._id,
            uniqueId: member.uniqueId,
            name: member.name,
            email: member.email,
            hasTempPassword: true
          },
          requiresPasswordChange: true
        });
      }
    }

    // Check regular password if temp password doesn't match
    if (member.password) {
      passwordMatch = await bcrypt.compare(password, member.password);
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials!"
      });
    }

    // Regular successful login
    const safeMember = member.toObject();
    delete safeMember.password;
    delete safeMember.tempPassword;
    delete safeMember.otp;
    delete safeMember.otpExpires;

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      member: safeMember,
      requiresPasswordChange: false
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login."
    });
  }
};

// Change Password (from temp to permanent)
export const changeMemberPassword = async (req, res) => {
  try {
    const { uniqueId, currentPassword, newPassword } = req.body;

    if (!uniqueId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!"
      });
    }

    // Find member
    const member = await Member.findOne({ uniqueId, isVerified: true });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    // Verify current password (either temp or regular)
    let isCurrentPasswordValid = false;
    
    // Check temp password first
    if (member.tempPassword) {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, member.tempPassword);
    }
    
    // If not temp password, check regular password
    if (!isCurrentPasswordValid && member.password) {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, member.password);
    }

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect!"
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear temp password
    member.password = hashedNewPassword;
    member.tempPassword = null;
    await member.save();

    // Send password change notification email
    try {
      await sendPasswordChangeEmail(member.email, member.name);
    } catch (mailError) {
      console.error("Failed to send password change email:", mailError);
      // Continue even if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Password changed successfully!"
    });

  } catch (error) {
    console.error("Password change error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during password change."
    });
  }
};

// Resend OTP
export const resendMemberOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required!"
      });
    }

    // Find unverified member
    const member = await Member.findOne({ 
      email, 
      isVerified: false 
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or already verified!"
      });
    }

    // Generate new OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update OTP
    member.otp = hashedOtp;
    member.otpExpires = otpExpires;
    await member.save();

    // Send OTP email
    try {
      await sendOtpEmail(email, otp);
    } catch (mailError) {
      console.error("Failed to resend OTP email:", mailError);
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again."
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP resent to your email."
    });

  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while resending OTP."
    });
  }
};

// Get Member Profile
export const getMemberProfile = async (req, res) => {
  try {
    const { uniqueId } = req.params;

    const member = await Member.findOne({ uniqueId, isVerified: true })
      .select('-password -tempPassword -otp -otpExpires');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    return res.status(200).json({
      success: true,
      member
    });

  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching profile."
    });
  }
};

// Update Member Profile
export const updateMemberProfile = async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.uniqueId;
    delete updates.email;
    delete updates.isVerified;
    delete updates.isPaymentDone;
    delete updates.paymentHistory;

    const member = await Member.findOneAndUpdate(
      { uniqueId, isVerified: true },
      updates,
      { new: true, runValidators: true }
    ).select('-password -tempPassword -otp -otpExpires');

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      member
    });

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating profile."
    });
  }
};

// Get All Members (Admin)
export const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find({})
      .select('-password -tempPassword -otp -otpExpires')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: members.length,
      members
    });

  } catch (error) {
    console.error("Get all members error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching members."
    });
  }
};

// Toggle member verification (Admin)
export const toggleMemberVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const member = await Member.findById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    member.isVerified = isVerified !== undefined ? isVerified : !member.isVerified;
    await member.save();

    return res.status(200).json({
      success: true,
      message: `Member ${member.isVerified ? 'verified' : 'unverified'} successfully`,
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        isVerified: member.isVerified
      }
    });

  } catch (error) {
    console.error("Toggle verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating verification status."
    });
  }
};

// Toggle member payment status (Admin)
export const toggleMemberPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaymentDone } = req.body;

    const member = await Member.findById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    member.isPaymentDone = isPaymentDone !== undefined ? isPaymentDone : !member.isPaymentDone;
    await member.save();

    return res.status(200).json({
      success: true,
      message: `Payment status ${member.isPaymentDone ? 'marked as paid' : 'marked as unpaid'}`,
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        isPaymentDone: member.isPaymentDone
      }
    });

  } catch (error) {
    console.error("Toggle payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating payment status."
    });
  }
};

// Delete member (Admin)
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    // Optional: Delete document image from Cloudinary
    // You might want to implement this based on your storage strategy

    await Member.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Member deleted successfully"
    });

  } catch (error) {
    console.error("Delete member error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting member."
    });
  }
};