import { Member } from '../models/memberModel.js';
import {
  sendPendingReviewEmail, 
  sendApprovalEmail, 
  sendRejectionEmail,
  sendPasswordChangeEmail, 
  sendMemberOtpEmail
} from '../config/nodemailer.js';
import { deleteFromCloudinary, extractPublicId, uploadToCloudinary } from '../config/cloudinary.js';
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
    
    // Get total approved members count to generate serial number
    const totalMembers = await Member.countDocuments({ status: 'approved' });
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

    // Check if member already exists with email (approved or pending)
    const existingMember = await Member.findOne({ email });
    if (existingMember) {

      // ❌ Already approved → block
      if (existingMember.status === "approved") {
        return res.status(409).json({
          success: false,
          message: "Member already registered and approved!"
        });
      }

      // ❌ OTP verified but admin not approved yet → block
      if (existingMember.status === "pending" && existingMember.isOtpVerified) {
        return res.status(409).json({
          success: false,
          message: "OTP already verified. Awaiting admin approval."
        });
      }

      // ✅ Pending + OTP NOT verified → resend OTP
      if (existingMember.status === "pending" && !existingMember.isOtpVerified) {

        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);

        existingMember.otp = hashedOtp;
        existingMember.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await existingMember.save();

        await sendMemberOtpEmail(existingMember.email, otp);

        return res.status(200).json({
          success: true,
          message: "OTP resent successfully. Please verify to continue.",
          email: existingMember.email
        });
      }
    }

    // Check if member already exists with phone (approved or pending)
    // const existingPhone = await Member.findOne({ phone });
    // if (existingPhone && existingPhone.status !== 'rejected') {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Member with this phone number already exists!"
    //   });
    // }

    // Upload document image to Cloudinary
    const documentImageResult = await uploadToCloudinary(req.file.buffer, 'osoo_member_documents');

    // Generate OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create member with OTP (status: pending)
    const memberData = {
      name,
      email,
      phone,
      documentType,
      documentNo,
      documentImage: documentImageResult.secure_url,
      status: 'pending', // Start with pending status
      otp: hashedOtp,
      otpExpires
    };

    // Check if temp data already exists (prevent duplicate)
    const tempMember = await Member.findOne({ 
      email, 
      status: 'pending' 
    });

    if (tempMember) {
      // Update existing temp member
      tempMember.otp = hashedOtp;
      tempMember.otpExpires = otpExpires;
      await tempMember.save();
    } else {
      // Create new pending member
      await Member.create(memberData);
    }

    // Send OTP email
    try {
      await sendMemberOtpEmail(email, otp);
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

// Verify OTP and Set to Pending Review
export const verifyMemberOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required!"
      });
    }

    // Find pending member
    const member = await Member.findOne({ 
      email, 
      status: 'pending' 
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or already processed!"
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

    // Clear OTP and mark as pending admin review
    member.otp = null;
    member.otpExpires = null;
    member.isOtpVerified = true;
    await member.save();

    // Send pending review email
    try {
      await sendPendingReviewEmail(email, member.name);
    } catch (mailError) {
      console.error("Failed to send pending review email:", mailError);
      // Don't fail the process if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Registration submitted for admin review! You'll receive an email with credentials once approved.",
      status: 'pending'
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during OTP verification."
    });
  }
};

// Admin: Approve Member (Send Credentials)
export const approveMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes, uniqueId } = req.body; // Add uniqueId from request body

    const member = await Member.findById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    if (member.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: "Member is already approved!"
      });
    }

    // Validate uniqueId is provided
    if (!uniqueId || uniqueId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Unique ID is required for approval!"
      });
    }

    // Check if uniqueId is already taken (optional)
    const existingMember = await Member.findOne({ uniqueId: uniqueId.trim() });
    if (existingMember && existingMember._id.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: "This Unique ID is already assigned to another member!"
      });
    }

    const tempPassword = generateTempPassword();
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    // Update member with approval details
    member.uniqueId = uniqueId.trim(); // Use admin-provided uniqueId
    member.tempPassword = hashedTempPassword;
    member.isVerified = true;
    member.status = 'approved';
    member.adminNotes = adminNotes || null;
    member.adminReviewedAt = new Date();
    member.adminReviewedBy = req.admin?.name || 'Admin';
    await member.save();

    // Send approval email with credentials
    try {
      await sendApprovalEmail(member.email, member.name, uniqueId.trim(), tempPassword);
    } catch (mailError) {
      console.error("Failed to send approval email:", mailError);
      // Still approve the member even if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Member approved successfully! Credentials sent via email.",
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        uniqueId: member.uniqueId,
        status: member.status
      }
    });

  } catch (error) {
    console.error("Approve member error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while approving member."
    });
  }
};

// Admin: Reject Member
export const rejectMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    if (!adminNotes) {
      return res.status(400).json({
        success: false,
        message: "Admin notes are required when rejecting a member."
      });
    }

    const member = await Member.findById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    if (member.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: "Member is already rejected!"
      });
    }

    // Update member with rejection details
    member.status = 'rejected';
    member.adminNotes = adminNotes;
    member.adminReviewedAt = new Date();
    member.adminReviewedBy = req.admin?.name || 'Admin';
    await member.save();

    // Send rejection email
    try {
      await sendRejectionEmail(member.email, member.name, adminNotes);
    } catch (mailError) {
      console.error("Failed to send rejection email:", mailError);
      // Still reject the member even if email fails
    }

    return res.status(200).json({
      success: true,
      message: "Member rejected successfully.",
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        status: member.status
      }
    });

  } catch (error) {
    console.error("Reject member error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while rejecting member."
    });
  }
};

// Member Login (Only for approved members)
export const loginMember = async (req, res) => {
  try {
    const { uniqueId, password } = req.body;

    if (!uniqueId || !password) {
      return res.status(400).json({
        success: false,
        message: "Unique ID and password are required!"
      });
    }

    // Find member by uniqueId - must be approved
    const member = await Member.findOne({ 
      uniqueId, 
      status: 'approved',
      isVerified: true 
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or not approved!"
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

// Change Password (from temp to permanent) - Only for approved members
export const changeMemberPassword = async (req, res) => {
  try {
    const { uniqueId, currentPassword, newPassword } = req.body;

    if (!uniqueId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!"
      });
    }

    // Find approved member
    const member = await Member.findOne({ 
      uniqueId, 
      status: 'approved',
      isVerified: true 
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or not approved!"
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

// Resend OTP for pending members
export const resendMemberOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required!"
      });
    }

    // Find pending member
    const member = await Member.findOne({ 
      email, 
      status: 'pending' 
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or already processed!"
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
      await sendMemberOtpEmail(email, otp);
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

// Get Member Profile (Only for approved members)
export const getMemberProfile = async (req, res) => {
  try {
    const { uniqueId } = req.params;

    const member = await Member.findOne({ 
      uniqueId, 
      status: 'approved',
      isVerified: true 
    })
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

// Update Member Profile (Only for approved members)
export const updateMemberProfile = async (req, res) => {
  try {
    const { uniqueId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.uniqueId;
    delete updates.email;
    delete updates.status;
    delete updates.isVerified;
    delete updates.isPaymentDone;
    delete updates.paymentHistory;

    const member = await Member.findOneAndUpdate(
      { 
        uniqueId, 
        status: 'approved',
        isVerified: true 
      },
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

// Get All Members with Status Filter (Admin)
export const getAllMembers = async (req, res) => {
  try {
    const { status } = req.query;
    
    let filter = {};
    if (status) {
      filter.status = status;
    }

    const allMembers = await Member.find(filter)
      .select('-password -tempPassword -otp -otpExpires')
      .sort({ createdAt: -1 });

    const members = allMembers.filter((m)=> m.isOtpVerified);

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

// Get Members by Status (Admin - Separate endpoint for convenience)
export const getMembersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: pending, approved, or rejected"
      });
    }

    const members = await Member.find({ status })
      .select('-password -tempPassword -otp -otpExpires')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: members.length,
      status,
      members
    });

  } catch (error) {
    console.error("Get members by status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching members."
    });
  }
};

// Get Single Member Details (Admin)
export const getMemberDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const member = await Member.findById(id)
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
    console.error("Get member details error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching member details."
    });
  }
};

// Update Member Payment Status (Admin - Only for approved members)
export const updateMemberPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaymentDone } = req.body;

    if (isPaymentDone === undefined) {
      return res.status(400).json({
        success: false,
        message: "Payment status is required!"
      });
    }

    const member = await Member.findOne({ 
      _id: id, 
      status: 'approved' 
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Approved member not found!"
      });
    }

    member.isPaymentDone = isPaymentDone;
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
    console.error("Update payment error:", error);
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

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID format"
      });
    }

    // Find member first
    const member = await Member.findById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found!"
      });
    }

    const responseData = {
      success: true,
      message: "Member deleted successfully",
      deletedMember: {
        id: member._id,
        name: member.name,
        email: member.email
      }
    };

    // Delete document image from Cloudinary if it exists
    if (member.documentImage && typeof member.documentImage === 'string') {
      try {
        // Extract public ID from Cloudinary URL
        const publicId = extractPublicId(member.documentImage);
        
        if (publicId) {
          console.log(`Attempting to delete Cloudinary image: ${publicId}`);
          
          // Delete image from Cloudinary
          const result = await deleteFromCloudinary(publicId);
          
          if (result.result === 'ok') {
            responseData.cloudinary = {
              deleted: true,
              publicId: publicId,
              message: 'Image deleted from Cloudinary'
            };
          } else if (result.result === 'not found') {
            responseData.cloudinary = {
              deleted: false,
              publicId: publicId,
              message: 'Image not found in Cloudinary (might have been deleted already)'
            };
          } else {
            responseData.cloudinary = {
              deleted: false,
              publicId: publicId,
              message: `Cloudinary deletion failed: ${result.result}`
            };
          }
        } else {
          responseData.cloudinary = {
            deleted: false,
            message: 'Could not extract public ID from image URL',
            imageUrl: member.documentImage
          };
        }
      } catch (cloudinaryError) {
        console.error('Cloudinary deletion error:', cloudinaryError);
        responseData.cloudinary = {
          deleted: false,
          message: 'Error deleting from Cloudinary',
          error: cloudinaryError.message
        };
      }
    } else if (member.documentImage) {
      responseData.cloudinary = {
        deleted: false,
        message: 'No valid document image URL found'
      };
    }

    // Delete member from database
    await Member.findByIdAndDelete(id);

    return res.status(200).json(responseData);

  } catch (error) {
    console.error("Delete member error:", error);
    
    // Handle specific errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID format"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting member.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
