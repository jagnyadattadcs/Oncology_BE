// controllers/galleryController.js
import { Gallery } from '../models/galleryModel.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Get all gallery images
export const getAllGalleryImages = async (req, res) => {
  try {
    const galleryImages = await Gallery.find().sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: galleryImages.length,
      data: galleryImages
    });
  } catch (error) {
    console.error("Get gallery images error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching gallery images"
    });
  }
};

// Get single gallery image by ID
export const getGalleryImageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const galleryImage = await Gallery.findById(id);
    
    if (!galleryImage) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found!"
      });
    }

    return res.status(200).json({
      success: true,
      data: galleryImage
    });
  } catch (error) {
    console.error("Get gallery image error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching gallery image"
    });
  }
};

// Upload gallery image
export const uploadGalleryImage = async (req, res) => {
  try {
    const { title } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required!"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required!"
      });
    }

    // Upload image to Cloudinary
    const imageResult = await uploadToCloudinary(req.file.buffer, 'osoo_gallery');

    // Create gallery image
    const newGalleryImage = await Gallery.create({
      title,
      imageUrl: imageResult.secure_url,
      publicId: imageResult.public_id
    });

    return res.status(201).json({
      success: true,
      message: "Image added to gallery successfully!",
      data: newGalleryImage
    });
  } catch (error) {
    console.error("Upload gallery image error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while uploading gallery image"
    });
  }
};

// Upload multiple gallery images
export const uploadMultipleGalleryImages = async (req, res) => {
  try {
    const { titles } = req.body; // Array of titles or single title for all
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image!"
      });
    }

    const uploadedImages = [];
    const titleArray = titles ? (Array.isArray(titles) ? titles : [titles]) : [];

    // Upload each image to Cloudinary
    for (let i = 0; i < files.length; i++) {
      try {
        const imageResult = await uploadToCloudinary(files[i].buffer, 'osoo_gallery');
        
        // Use provided title or default
        const title = titleArray[i] || `Gallery Image ${i + 1}`;
        
        const newGalleryImage = await Gallery.create({
          title,
          imageUrl: imageResult.secure_url,
          publicId: imageResult.public_id
        });
        
        uploadedImages.push(newGalleryImage);
      } catch (uploadError) {
        console.error(`Failed to upload file ${i}:`, uploadError);
        // Continue with other files even if one fails
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload any images"
      });
    }

    return res.status(201).json({
      success: true,
      message: `${uploadedImages.length} image(s) added to gallery successfully`,
      data: uploadedImages
    });
  } catch (error) {
    console.error("Upload multiple gallery images error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while uploading gallery images"
    });
  }
};

// Update gallery image
export const updateGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    // Find existing gallery image
    const existingImage = await Gallery.findById(id);
    
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found!"
      });
    }

    let updateData = {
      title: title || existingImage.title
    };

    // If new image is uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      try {
        if (existingImage.publicId) {
          await deleteFromCloudinary(existingImage.publicId);
        }
      } catch (cloudinaryError) {
        console.error("Failed to delete old image:", cloudinaryError);
      }

      // Upload new image
      const imageResult = await uploadToCloudinary(req.file.buffer, 'osoo_gallery');
      updateData.imageUrl = imageResult.secure_url;
      updateData.publicId = imageResult.public_id;
    }

    // Update gallery image
    const updatedImage = await Gallery.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Gallery image updated successfully!",
      data: updatedImage
    });
  } catch (error) {
    console.error("Update gallery image error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating gallery image"
    });
  }
};

// Delete gallery image
export const deleteGalleryImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Find gallery image
    const galleryImage = await Gallery.findById(id);
    
    if (!galleryImage) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found!"
      });
    }

    // Delete image from Cloudinary
    try {
      if (galleryImage.publicId) {
        await deleteFromCloudinary(galleryImage.publicId);
      }
    } catch (cloudinaryError) {
      console.error("Failed to delete image from Cloudinary:", cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await Gallery.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Gallery image deleted successfully!"
    });
  } catch (error) {
    console.error("Delete gallery image error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting gallery image"
    });
  }
};

// Delete multiple gallery images
export const deleteMultipleGalleryImages = async (req, res) => {
  try {
    const { ids } = req.body; // Array of image IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide image IDs to delete!"
      });
    }

    // Find all images
    const images = await Gallery.find({ _id: { $in: ids } });

    // Delete from Cloudinary
    for (const image of images) {
      try {
        if (image.publicId) {
          await deleteFromCloudinary(image.publicId);
        }
      } catch (cloudinaryError) {
        console.error(`Failed to delete image ${image._id}:`, cloudinaryError);
      }
    }

    // Delete from database
    await Gallery.deleteMany({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      message: `${ids.length} image(s) deleted successfully!`
    });
  } catch (error) {
    console.error("Delete multiple gallery images error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting gallery images"
    });
  }
};

// Get gallery statistics
export const getGalleryStats = async (req, res) => {
  try {
    const totalImages = await Gallery.countDocuments();
    
    // Get recent uploads
    const recentUploads = await Gallery.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt');

    return res.status(200).json({
      success: true,
      stats: {
        total: totalImages,
        recentUploads: recentUploads.length
      },
      recentUploads
    });
  } catch (error) {
    console.error("Get gallery stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching gallery statistics"
    });
  }
};
