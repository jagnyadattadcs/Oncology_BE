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

    speciality: {
      type: String,
      enum: [
        "surgical_oncology",
        "radiation_oncology",
        "medical_oncology",
        "paediatric_oncology",
        "haematology_haematooncology",
        "gynaecologic_oncology",
        "head_neck_oncology",
        "oncopathology",
        "uro_oncology",
        "radiology",
        "nuclear_medicine",
        "palliative_care",
        "others"
      ],
      required: true,
    },
    qualification: {
      type: [String],
      enum: ['dm', 'mch', 'md', 'ms', 'fellowship', 'drnb', 'dnb', 'others'],
      required: true,
      validate: {
        validator: function(v) {
          return v.length > 0; // At least one qualification
        },
        message: 'At least one qualification is required'
      }
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
