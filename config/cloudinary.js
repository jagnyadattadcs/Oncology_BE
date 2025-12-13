// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload image to Cloudinary
export const uploadToCloudinary = async (fileBuffer, folder = 'osoo_carousel') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    
    uploadStream.end(fileBuffer);
  });
};

// Function to delete image from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Function to extract public ID from Cloudinary URL
export const extractPublicId = (url) => {
  // Cloudinary URL format: https://res.cloudinary.com/cloudname/image/upload/v1234567890/folder/image.jpg
  const regex = /\/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|gif|webp)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export default cloudinary;