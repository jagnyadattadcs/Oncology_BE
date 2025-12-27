import { Gallery } from '../models/galleryModel.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Get all gallery images
export const getAllGalleryImages = async (req, res) => {
  try {
    const { category, sortBy = 'createdAt', order = 'desc' } = req.query;
    
    let query = {};
    if (category && category !== 'all') {
      query.category = category;
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const galleryImages = await Gallery.find(query).sort(sortOptions);
    
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

// Upload gallery image (single image entry, but can have multiple images in arrays)
export const uploadGalleryImage = async (req, res) => {
  try {
    const { title, description, eventDate, category } = req.body;

    // Validate required fields
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: "Title and category are required!"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required!"
      });
    }

    // Upload image to Cloudinary
    const imageResult = await uploadToCloudinary(req.file.buffer, 'osoo_gallery');

    // Create gallery image
    const newGalleryImage = await Gallery.create({
      title,
      description,
      category,
      eventDate: eventDate || null,
      imageUrl: [imageResult.secure_url],
      publicId: [imageResult.public_id]
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

// Upload multiple gallery images (single entry with multiple images)
export const uploadMultipleGalleryImages = async (req, res) => {
  try {
    const { title, description, eventDate, category } = req.body;
    const files = req.files;

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: "Title and category are required!"
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image!"
      });
    }

    const imageUrls = [];
    const publicIds = [];

    // Upload each image to Cloudinary
    for (let i = 0; i < files.length; i++) {
      try {
        const imageResult = await uploadToCloudinary(files[i].buffer, 'osoo_gallery');
        imageUrls.push(imageResult.secure_url);
        publicIds.push(imageResult.public_id);
      } catch (uploadError) {
        console.error(`Failed to upload file ${i}:`, uploadError);
        // Continue with other files even if one fails
      }
    }

    if (imageUrls.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload any images"
      });
    }

    // Create single gallery entry with multiple images
    const newGalleryImage = await Gallery.create({
      title,
      description,
      category,
      eventDate: eventDate || null,
      imageUrl: imageUrls,
      publicId: publicIds
    });

    return res.status(201).json({
      success: true,
      message: `${imageUrls.length} image(s) added to gallery successfully`,
      data: newGalleryImage
    });
  } catch (error) {
    console.error("Upload multiple gallery images error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }

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
    const { title, description, eventDate, category } = req.body;

    // Find existing gallery image
    const existingImage = await Gallery.findById(id);
    
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found!"
      });
    }

    let updateData = {
      title: title || existingImage.title,
      description: description !== undefined ? description : existingImage.description,
      category: category || existingImage.category,
      eventDate: eventDate !== undefined ? eventDate : existingImage.eventDate
    };

    // If new image is uploaded, add to existing images
    if (req.file) {
      try {
        const imageResult = await uploadToCloudinary(req.file.buffer, 'osoo_gallery');
        
        const newImageUrls = [...existingImage.imageUrl, imageResult.secure_url];
        const newPublicIds = [...existingImage.publicId, imageResult.public_id];
        
        updateData.imageUrl = newImageUrls;
        updateData.publicId = newPublicIds;
      } catch (uploadError) {
        console.error("Failed to upload new image:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload new image"
        });
      }
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

// Delete specific image from gallery entry
export const deleteImageFromGallery = async (req, res) => {
  try {
    const { id, imageIndex } = req.params;

    const galleryImage = await Gallery.findById(id);
    
    if (!galleryImage) {
      return res.status(404).json({
        success: false,
        message: "Gallery image not found!"
      });
    }

    const index = parseInt(imageIndex);
    
    if (index < 0 || index >= galleryImage.imageUrl.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid image index!"
      });
    }

    // Remove image from arrays
    const updatedImageUrls = [...galleryImage.imageUrl];
    const updatedPublicIds = [...galleryImage.publicId];

    const publicIdToDelete = updatedPublicIds[index];
    
    // Delete from Cloudinary
    try {
      if (publicIdToDelete) {
        await deleteFromCloudinary(publicIdToDelete);
      }
    } catch (cloudinaryError) {
      console.error("Failed to delete image from Cloudinary:", cloudinaryError);
    }

    // Remove from arrays
    updatedImageUrls.splice(index, 1);
    updatedPublicIds.splice(index, 1);

    // If this was the last image, delete the entire entry
    if (updatedImageUrls.length === 0) {
      await Gallery.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: "Gallery entry deleted as it contained no more images!"
      });
    }

    // Update the gallery entry
    galleryImage.imageUrl = updatedImageUrls;
    galleryImage.publicId = updatedPublicIds;
    await galleryImage.save();

    return res.status(200).json({
      success: true,
      message: "Image removed from gallery successfully!",
      data: galleryImage
    });
  } catch (error) {
    console.error("Delete image from gallery error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting image from gallery"
    });
  }
};

// Delete gallery image entry
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

    // Delete all images from Cloudinary
    if (galleryImage.publicId && galleryImage.publicId.length > 0) {
      for (const publicId of galleryImage.publicId) {
        try {
          await deleteFromCloudinary(publicId);
        } catch (cloudinaryError) {
          console.error("Failed to delete image from Cloudinary:", cloudinaryError);
        }
      }
    }

    // Delete from database
    await Gallery.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Gallery entry deleted successfully!"
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
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide gallery entry IDs to delete!"
      });
    }

    // Find all gallery entries
    const galleryEntries = await Gallery.find({ _id: { $in: ids } });

    // Delete all images from Cloudinary
    for (const entry of galleryEntries) {
      if (entry.publicId && entry.publicId.length > 0) {
        for (const publicId of entry.publicId) {
          try {
            await deleteFromCloudinary(publicId);
          } catch (cloudinaryError) {
            console.error("Failed to delete image from Cloudinary:", cloudinaryError);
          }
        }
      }
    }

    // Delete from database
    await Gallery.deleteMany({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      message: `${ids.length} gallery entry(s) deleted successfully!`
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
    // Total gallery entries
    const totalEntries = await Gallery.countDocuments();

    // Total images across all galleries
    const totalImagesAgg = await Gallery.aggregate([
      {
        $project: {
          imageCount: {
            $cond: [
              { $isArray: "$imageUrl" },
              { $size: "$imageUrl" },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalImages: { $sum: "$imageCount" }
        }
      }
    ]);

    const totalImages = totalImagesAgg[0]?.totalImages || 0;

    // Category-wise stats
    const categoryStats = await Gallery.aggregate([
      {
        $project: {
          category: 1,
          imageCount: {
            $cond: [
              { $isArray: "$imageUrl" },
              { $size: "$imageUrl" },
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: "$category",
          totalEntries: { $sum: 1 },
          totalImages: { $sum: "$imageCount" }
        }
      },
      { $sort: { totalEntries: -1 } }
    ]);

    // Recent uploads
    const recentUploads = await Gallery.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title createdAt imageUrl category");

    return res.status(200).json({
      success: true,
      stats: {
        totalEntries,
        totalImages,
        categories: categoryStats
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
