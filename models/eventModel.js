import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        enum: [
            'cancer_celebration',
            'conference_symposium', 
            'workshop_training',
            'awareness_campaign',
            'fundraising',
            'other'
        ],
        required: true,
    },
    imageUrl: {
        type: String, 
        required: true
    },
    publicId: {
        type: String,
    },
    date: {
        type: Date,
        required: true,
    },
    venue: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    isCompleted: {
        type: Boolean,
        default: false,
    },
    // Additional fields for better filtering
    tags: [{
        type: String,
    }],
    // For featured/highlighted events
    isFeatured: {
        type: Boolean,
        default: false,
    }
}, {timestamps: true});

// Index for faster queries
eventSchema.index({ category: 1, date: 1 });
eventSchema.index({ isFeatured: 1 });

export const Event = mongoose.model("Event", eventSchema);
