import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true,
    },
    publicId: {
        type: String,
        required: true
    }
},{timestamps: true});

export const Gallery = mongoose.model("Gallery", gallerySchema);
