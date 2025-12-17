// controllers/eventController.js
import { Event } from '../models/eventModel.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Get all events
export const getAllEvents = async (req, res) => {
  try {
    const { type } = req.query; // 'upcoming', 'past', 'all'
    
    let filter = {};
    const now = new Date();
    
    if (type === 'upcoming') {
      filter.date = { $gte: now };
    } else if (type === 'past') {
      filter.date = { $lt: now };
    }

    const events = await Event.find(filter).sort({ date: 1 });
    
    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error("Get events error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching events"
    });
  }
};

// Get single event by ID
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found!"
      });
    }

    return res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error("Get event error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching event"
    });
  }
};

// Create new event
export const createEvent = async (req, res) => {
  try {
    const { title, date, venue, description, isCompleted } = req.body;

    // Validate required fields
    if (!title || !date || !venue || !description) {
      return res.status(400).json({
        success: false,
        message: "Title, date, venue, and description are required!"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Event image is required!"
      });
    }

    // Upload image to Cloudinary
    const imageResult = await uploadToCloudinary(req.file.buffer, 'osoo_events');

    // Create event
    const newEvent = await Event.create({
      title,
      date,
      venue,
      description,
      imageUrl: imageResult.secure_url,
      publicId: imageResult.public_id,
      isCompleted: isCompleted === 'true' || false
    });

    return res.status(201).json({
      success: true,
      message: "Event created successfully!",
      data: newEvent
    });
  } catch (error) {
    console.error("Create event error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating event"
    });
  }
};

// Update event
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, venue, description, isCompleted } = req.body;

    // Find existing event
    const existingEvent = await Event.findById(id);
    
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found!"
      });
    }

    let updateData = {
      title: title || existingEvent.title,
      date: date || existingEvent.date,
      venue: venue || existingEvent.venue,
      description: description || existingEvent.description,
      isCompleted: isCompleted !== undefined ? (isCompleted === 'true') : existingEvent.isCompleted
    };

    // If new image is uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      try {
        if (existingEvent.publicId) {
          await deleteFromCloudinary(existingEvent.publicId);
        }
      } catch (cloudinaryError) {
        console.error("Failed to delete old image:", cloudinaryError);
      }

      // Upload new image
      const imageResult = await uploadToCloudinary(req.file.buffer, 'osoo_events');
      updateData.imageUrl = imageResult.secure_url;
      updateData.publicId = imageResult.public_id;
    }

    // Update event
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Event updated successfully!",
      data: updatedEvent
    });
  } catch (error) {
    console.error("Update event error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating event"
    });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Find event
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found!"
      });
    }

    // Delete image from Cloudinary
    try {
      if (event.publicId) {
        await deleteFromCloudinary(event.publicId);
      }
    } catch (cloudinaryError) {
      console.error("Failed to delete image from Cloudinary:", cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await Event.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully!"
    });
  } catch (error) {
    console.error("Delete event error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting event"
    });
  }
};

// Toggle event completion status
export const toggleEventCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;

    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found!"
      });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { isCompleted: isCompleted !== undefined ? isCompleted : !event.isCompleted },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: `Event ${updatedEvent.isCompleted ? 'marked as completed' : 'marked as upcoming'}`,
      data: updatedEvent
    });
  } catch (error) {
    console.error("Toggle completion error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating event status"
    });
  }
};

// Get events statistics
export const getEventStats = async (req, res) => {
  try {
    const now = new Date();
    
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ 
      date: { $gte: now },
      isCompleted: false 
    });
    const pastEvents = await Event.countDocuments({ 
      date: { $lt: now } 
    });
    const completedEvents = await Event.countDocuments({ 
      isCompleted: true 
    });

    // Get recent events
    const recentEvents = await Event.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title date createdAt');

    return res.status(200).json({
      success: true,
      stats: {
        total: totalEvents,
        upcoming: upcomingEvents,
        past: pastEvents,
        completed: completedEvents
      },
      recentEvents
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching event statistics"
    });
  }
};
