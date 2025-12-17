import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
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
    }
},{timestamps: true});

export const Event = mongoose.model("Event", eventSchema);
