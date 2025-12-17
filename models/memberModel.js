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
      enum: ["Aadhaar", "PAN", "Voter", "Medical_Certificate"],
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
    }
  },
  { timestamps: true }
);

export const Member = mongoose.model("Member", memberSchema);
