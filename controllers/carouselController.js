// controllers/carouselController.js
import { CarouselPhoto } from '../models/carouselModel.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../config/cloudinary.js';

// Get all carousel images
export const getAllCarouselImages = async (req, res) => {
  try {
    const images = await CarouselPhoto.find().sort({ order: 1, createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching carousel images'
    });
  }
};

// Upload single carousel image
export const uploadCarouselImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'osoo_carousel');
    
    // Extract data from request body
    const { title, altText, order, isActive } = req.body;
    
    // Save to database
    const newImage = await CarouselPhoto.create({
      imageUrl: result.secure_url,
      publicId: result.public_id,
      title: title || '',
      altText: altText || 'OSOO Carousel Image',
      order: order ? parseInt(order) : 0,
      isActive: isActive !== 'false' // Default to true
    });

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: newImage
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Check for specific errors
    if (error.message.includes('Only image files')) {
      return res.status(400).json({
        success: false,
        message: 'Only image files (jpeg, jpg, png, gif, webp) are allowed'
      });
    }
    
    if (error.message.includes('File too large')) {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while uploading image'
    });
  }
};

// Update carousel image details (without changing image)
export const updateCarouselImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, altText, order, isActive } = req.body;

    // Find existing image
    const existingImage = await CarouselPhoto.findById(id);
    
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Update in database
    const updatedImage = await CarouselPhoto.findByIdAndUpdate(
      id,
      {
        title: title || existingImage.title,
        altText: altText || existingImage.altText,
        order: order ? parseInt(order) : existingImage.order,
        isActive: isActive !== undefined ? isActive : existingImage.isActive
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      data: updatedImage
    });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating image'
    });
  }
};

// Update carousel image with new file
export const updateCarouselImageWithFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Find existing image
    const existingImage = await CarouselPhoto.findById(id);
    
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Delete old image from Cloudinary
    try {
      await deleteFromCloudinary(existingImage.publicId);
    } catch (cloudinaryError) {
      console.error('Failed to delete old image from Cloudinary:', cloudinaryError);
    }

    // Upload new image to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'osoo_carousel');
    
    // Extract data from request body
    const { title, altText, order, isActive } = req.body;
    
    // Update in database
    const updatedImage = await CarouselPhoto.findByIdAndUpdate(
      id,
      {
        imageUrl: result.secure_url,
        publicId: result.public_id,
        title: title || existingImage.title,
        altText: altText || existingImage.altText,
        order: order ? parseInt(order) : existingImage.order,
        isActive: isActive !== undefined ? isActive : existingImage.isActive
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      data: updatedImage
    });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating image'
    });
  }
};

// Toggle carousel image active status
export const toggleCarouselImageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Find existing image
    const existingImage = await CarouselPhoto.findById(id);
    
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Update status
    const updatedImage = await CarouselPhoto.findByIdAndUpdate(
      id,
      { isActive: isActive !== undefined ? isActive : !existingImage.isActive },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `Image ${updatedImage.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedImage
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating image status'
    });
  }
};

// Delete carousel image
export const deleteCarouselImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the image in database
    const image = await CarouselPhoto.findById(id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(image.publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await CarouselPhoto.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting image'
    });
  }
};
