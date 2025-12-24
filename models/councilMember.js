import mongoose from "mongoose";

const councilMemberSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    currHospital: [
        {
            name: {
                type: String,
            }
        }
    ],
    dateOfJoining: {
        type: Date,
    },
    bio: {
        type: String,
        required: true
    },
    qualification: [
        {
            type: String,
            required: true
        }
    ],
    specialization: [
        {
            type: String,
            required: true
        }
    ],
    achievements: [
        {
            type: String,
        }
    ],
    role: {
        type: String,
        enum: ["President", "Vice-President", "Secretary", "Treasurer", "Executive-Member"],
        default: "Executive-Member"
    }
},{timestamps: true});

export const CouncilMember = mongoose.model("CouncilMember", councilMemberSchema);
