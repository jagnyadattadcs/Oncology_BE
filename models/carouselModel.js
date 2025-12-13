import mongoose from "mongoose";

const carouselSchema = new mongoose.Schema({
    imageUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: "Carousel Image"
    },
    altText: {
        type: String,
        default: "OSOO Carousel Image"
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
},{timestamps: true});

export const CarouselPhoto = mongoose.model("CarouselPhoto", carouselSchema);
