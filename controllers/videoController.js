import Video from '../models/videoModel.js';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';

// Helper function to extract YouTube ID from URL
const extractYouTubeId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// @desc    Get all videos (public)
// @route   GET /api/videos
// @access  Public
export const getAllVideos = async (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'eventDate',
      order = 'desc',
      limit = 20,
      page = 1,
      featured,
      year
    } = req.query;

    const query = { isPublic: true };
    const sortOrder = order === 'asc' ? 1 : -1;

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Filter by featured
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Filter by year
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.eventDate = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting options
    let sortOptions = {};
    switch (sort) {
      case 'views':
        sortOptions = { views: sortOrder };
        break;
      case 'date':
        sortOptions = { eventDate: sortOrder };
        break;
      case 'title':
        sortOptions = { title: sortOrder };
        break;
      default:
        sortOptions = { eventDate: -1 };
    }

    // Execute query
    const videos = await Video.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v -createdBy -lastUpdatedBy')
      .lean();

    // Get total count for pagination
    const total = await Video.countDocuments(query);

    // Get categories for filter
    const categories = await Video.distinct('category', { isPublic: true });

    // Get years for filter
    const years = await Video.aggregate([
      { $match: { isPublic: true } },
      {
        $group: {
          _id: { $year: "$eventDate" }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      categories,
      years: years.map(y => y._id),
      data: videos
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get video by ID
// @route   GET /api/videos/:id
// @access  Public
export const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID'
      });
    }

    const video = await Video.findById(id)
      .select('-__v -createdBy -lastUpdatedBy')
      .lean();

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Increment views
    await Video.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.status(200).json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Get video by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get video statistics
// @route   GET /api/videos/stats/summary
// @access  Public
export const getVideoStats = async (req, res) => {
  try {
    const stats = await Video.aggregate([
      { $match: { isPublic: true } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalDuration: { $sum: 1 }, // You might want to convert duration to seconds
          avgViews: { $avg: "$views" }
        }
      },
      {
        $project: {
          _id: 0,
          totalVideos: 1,
          totalViews: 1,
          avgViews: { $round: ["$avgViews", 0] }
        }
      }
    ]);

    // Get category distribution
    const categoryStats = await Video.aggregate([
      { $match: { isPublic: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalViews: { $sum: "$views" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get yearly distribution
    const yearlyStats = await Video.aggregate([
      { $match: { isPublic: true } },
      {
        $group: {
          _id: { $year: "$eventDate" },
          count: { $sum: 1 },
          totalViews: { $sum: "$views" }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: stats[0] || { totalVideos: 0, totalViews: 0, avgViews: 0 },
        categories: categoryStats,
        yearly: yearlyStats
      }
    });
  } catch (error) {
    console.error('Get video stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get featured videos
// @route   GET /api/videos/featured
// @access  Public
export const getFeaturedVideos = async (req, res) => {
  try {
    const videos = await Video.find({
      isPublic: true,
      isFeatured: true
    })
    .sort({ eventDate: -1 })
    .limit(6)
    .select('-__v -createdBy -lastUpdatedBy')
    .lean();

    res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error) {
    console.error('Get featured videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get videos by category
// @route   GET /api/videos/category/:category
// @access  Public
export const getVideosByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 12, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await Video.find({
      category,
      isPublic: true
    })
    .sort({ eventDate: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v -createdBy -lastUpdatedBy')
    .lean();

    const total = await Video.countDocuments({ category, isPublic: true });

    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: videos
    });
  } catch (error) {
    console.error('Get videos by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Search videos
// @route   GET /api/videos/search
// @access  Public
export const searchVideos = async (req, res) => {
  try {
    const { q, category, year } = req.query;

    const query = { isPublic: true };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { speaker: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query.eventDate = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const videos = await Video.find(query)
      .sort({ eventDate: -1 })
      .select('-__v -createdBy -lastUpdatedBy')
      .lean();

    res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error) {
    console.error('Search videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new video (Admin only)
// @route   POST /api/videos
// @access  Private/Admin
export const createVideo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      youtubeUrl,
      duration,
      eventDate,
      speaker,
      speakerDesignation,
      speakerInstitution,
      category,
      tags,
      isFeatured,
      isPublic
    } = req.body;

    // Extract YouTube ID from URL
    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid YouTube URL'
      });
    }

    const videoData = {
      title,
      description,
      youtubeId,
      youtubeUrl,
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      duration,
      eventDate,
      speaker,
      speakerDesignation: speakerDesignation || '',
      speakerInstitution: speakerInstitution || '',
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
      isFeatured: isFeatured || false,
      isPublic: isPublic !== undefined ? isPublic : true,
      createdBy: req.admin._id,
      lastUpdatedBy: req.admin._id
    };

    const video = await Video.create(videoData);

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: video
    });
  } catch (error) {
    console.error('Create video error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Video with this YouTube ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update video (Admin only)
// @route   PUT /api/videos/:id
// @access  Private/Admin
export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID'
      });
    }

    // If YouTube URL is being updated, extract new ID and update thumbnail
    if (updates.youtubeUrl) {
      const youtubeId = extractYouTubeId(updates.youtubeUrl);
      if (!youtubeId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid YouTube URL'
        });
      }
      updates.youtubeId = youtubeId;
      updates.thumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    }

    // Handle tags conversion if present
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = updates.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    updates.lastUpdatedBy = req.admin._id;

    const video = await Video.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-__v -createdBy -lastUpdatedBy');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete video (Admin only)
// @route   DELETE /api/videos/:id
// @access  Private/Admin
export const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID'
      });
    }

    const video = await Video.findByIdAndDelete(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Bulk update video status (Admin only)
// @route   PUT /api/videos/bulk/status
// @access  Private/Admin
export const bulkUpdateVideoStatus = async (req, res) => {
  try {
    const { ids, isPublic } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide video IDs'
      });
    }

    const result = await Video.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          isPublic,
          lastUpdatedBy: req.admin._id
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} videos`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get admin video list with filters (Admin only)
// @route   GET /api/videos/admin/list
// @access  Private/Admin
export const getAdminVideoList = async (req, res) => {
  try {
    const {
      status = 'all',
      category = 'all',
      search,
      sort = 'createdAt',
      order = 'desc',
      limit = 20,
      page = 1
    } = req.query;

    const query = {};
    const sortOrder = order === 'asc' ? 1 : -1;

    // Filter by status
    if (status !== 'all') {
      query.isPublic = status === 'published';
    }

    // Filter by category
    if (category !== 'all') {
      query.category = category;
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sorting
    let sortOptions = {};
    switch (sort) {
      case 'views':
        sortOptions = { views: sortOrder };
        break;
      case 'date':
        sortOptions = { eventDate: sortOrder };
        break;
      case 'created':
        sortOptions = { createdAt: sortOrder };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const videos = await Video.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .lean();

    const total = await Video.countDocuments(query);

    res.status(200).json({
      success: true,
      count: videos.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: videos
    });
  } catch (error) {
    console.error('Get admin video list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Increment video meta (likes, shares, downloads)
// @route   POST /api/videos/:id/meta/:field
// @access  Public
export const incrementVideoMeta = async (req, res) => {
  try {
    const { id, field } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid video ID'
      });
    }

    if (!['likes', 'shares', 'downloads'].includes(field)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meta field'
      });
    }

    const video = await Video.findByIdAndUpdate(
      id,
      { $inc: { [`meta.${field}`]: 1 } },
      { new: true }
    ).select('meta');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        field,
        count: video.meta[field]
      }
    });
  } catch (error) {
    console.error('Increment meta error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};