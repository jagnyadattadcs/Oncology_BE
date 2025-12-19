import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const memberSchema = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      sparse: true, // Allow null for pending members
    },

    tempPassword: {
      type: String,
    },

    password: {
      type: String,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },

    documentType: {
      type: String,
      enum: ["aadhar", "pan", "voter_id", 'driving_license', 'medical_license', "passport"],
      required: true,
    },

    documentNo: {
      type: String,
      required: true,
      trim: true,
    },

    documentImage: {
      type: String,
      required: true,
    },

    agreeWithTerms: {
      type: Boolean,
      default: false,
      required: [true, "Terms agreement is required"]
    },

    termsAgreedAt: {
      type: Date,
      default: new Date(),
    },

    // NEW: Three-stage verification status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isPaymentDone: {
      type: Boolean,
      default: false,
    },

    paymentHistory: [paymentSchema],

    otp: {
      type: String,
    },

    otpExpires: {
      type: Date
    },

    isOtpVerified: {
      type: Boolean,
      default: false
    },

    // NEW: Store admin review notes
    adminNotes: {
      type: String,
      trim: true,
    },

    // NEW: Track approval/rejection dates
    adminReviewedAt: {
      type: Date,
    },

    adminReviewedBy: {
      type: String,
      trim: true,
    }
  },
  { timestamps: true }
);

// Index for faster queries by status
memberSchema.index({ status: 1, createdAt: -1 });

export const Member = mongoose.model("Member", memberSchema);
