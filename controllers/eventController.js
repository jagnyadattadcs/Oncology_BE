import { Event } from '../models/eventModel.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Category labels for display
const categoryLabels = {
    'cancer_celebration': 'Cancer Celebration Month & Week',
    'conference_symposium': 'State & National Conferences & Symposium',
    'workshop_training': 'Workshops & Training Programs',
    'awareness_campaign': 'Awareness Campaigns',
    'fundraising': 'Fundraising Events',
    'other': 'Other Events'
};

// Get all events with category grouping
export const getAllEvents = async (req, res) => {
    try {
        const { category, type, limit, featured } = req.query;
        const now = new Date();
        
        let filter = {};
        
        // Filter by category
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        // Filter by upcoming/past
        if (type === 'upcoming') {
            filter.date = { $gte: now };
            filter.isCompleted = false;
        } else if (type === 'past') {
            filter.date = { $lt: now };
        } else if (type === 'completed') {
            filter.isCompleted = true;
        }
        
        // Filter featured events
        if (featured === 'true') {
            filter.isFeatured = true;
        }
        
        // Set limit if provided
        let query = Event.find(filter).sort({ date: 1 });
        if (limit) {
            query = query.limit(parseInt(limit));
        }
        
        const events = await query;
        
        // Group events by category for frontend display
        const eventsByCategory = {};
        events.forEach(event => {
            if (!eventsByCategory[event.category]) {
                eventsByCategory[event.category] = {
                    title: categoryLabels[event.category] || event.category,
                    image: event.imageUrl, // You might want a default image per category
                    events: []
                };
            }
            eventsByCategory[event.category].events.push({
                id: event._id,
                title: event.title,
                date: event.date,
                venue: event.venue,
                description: event.description,
                isCompleted: event.isCompleted,
                imageUrl: event.imageUrl
            });
        });
        
        // Convert to array format for EventSection component
        const categoriesArray = Object.keys(eventsByCategory).map(category => ({
            category: category,
            ...eventsByCategory[category]
        }));
        
        return res.status(200).json({
            success: true,
            count: events.length,
            events: events, // Original events array
            categories: categoriesArray, // Grouped by category for EventSection
            categoryLabels: categoryLabels
        });
    } catch (error) {
        console.error("Get events error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching events"
        });
    }
};

// Get events grouped by category (specifically for EventSection)
export const getEventsByCategory = async (req, res) => {
    try {
        const now = new Date();
        
        // Get upcoming events (not completed and future date)
        const events = await Event.find({
            date: { $gte: now },
            isCompleted: false
        }).sort({ date: 1 });
        
        // Group by category
        const groupedEvents = {};
        const defaultImages = {
            'cancer_celebration': 'https://res.cloudinary.com/dxvovx7s2/image/upload/v1766474013/osoo_events/av0dnrtypucblm9rj8if.png',
            'conference_symposium': 'https://res.cloudinary.com/dxvovx7s2/image/upload/v1766474013/osoo_events/av0dnrtypucblm9rj8if.png',
            'workshop_training': 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
            'awareness_campaign': 'https://images.unsplash.com/photo-1584467735871-8db9ac8d0916?w=800&q=80',
            'fundraising': 'https://images.unsplash.com/photo-1567593810070-7a5c0925344e?w-800&q=80',
            'other': 'https://res.cloudinary.com/dxvovx7s2/image/upload/v1766474013/osoo_events/av0dnrtypucblm9rj8if.png'
        };
        
        events.forEach(event => {
            if (!groupedEvents[event.category]) {
                // Use first event's image as category image, or default
                groupedEvents[event.category] = {
                    title: categoryLabels[event.category] || event.category,
                    image: event.imageUrl || defaultImages[event.category] || defaultImages['other'],
                    events: []
                };
            }
            groupedEvents[event.category].events.push(event.title);
        });
        
        // Convert to array and ensure at least 2 categories for display
        let categoriesArray = Object.keys(groupedEvents).map(category => ({
            category: category,
            ...groupedEvents[category]
        }));
        
        // If less than 2 categories, add placeholder categories
        if (categoriesArray.length < 2) {
            const allCategories = Object.keys(categoryLabels);
            const existingCategories = categoriesArray.map(c => c.category);
            const missingCategories = allCategories.filter(c => !existingCategories.includes(c));
            
            missingCategories.slice(0, 2 - categoriesArray.length).forEach(category => {
                categoriesArray.push({
                    category: category,
                    title: categoryLabels[category],
                    image: defaultImages[category] || defaultImages['other'],
                    events: ['Event details will be announced soon', 'More information coming up']
                });
            });
        }
        
        return res.status(200).json({
            success: true,
            data: categoriesArray.slice(0, 2) // Return only 2 categories for EventSection
        });
    } catch (error) {
        console.error("Get events by category error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching events by category"
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
        const { title, category, date, venue, description, isCompleted, tags, isFeatured } = req.body;

        // Validate required fields
        if (!title || !category || !date || !venue || !description) {
            return res.status(400).json({
                success: false,
                message: "Title, category, date, venue, and description are required!"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Event image is required!"
            });
        }

        // Validate category
        const validCategories = Object.keys(categoryLabels);
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
            });
        }

        // Upload image to Cloudinary
        const imageResult = await uploadToCloudinary(req.file.buffer, 'osoo_events');

        // Parse tags if provided
        let tagArray = [];
        if (tags) {
            tagArray = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        }

        // Create event
        const newEvent = await Event.create({
            title,
            category,
            date,
            venue,
            description,
            imageUrl: imageResult.secure_url,
            publicId: imageResult.public_id,
            isCompleted: isCompleted === 'true' || false,
            tags: tagArray,
            isFeatured: isFeatured === 'true' || false
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
        const { title, category, date, venue, description, isCompleted, tags, isFeatured } = req.body;

        // Find existing event
        const existingEvent = await Event.findById(id);
        
        if (!existingEvent) {
            return res.status(404).json({
                success: false,
                message: "Event not found!"
            });
        }

        // Validate category if provided
        if (category) {
            const validCategories = Object.keys(categoryLabels);
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
                });
            }
        }

        let updateData = {
            title: title || existingEvent.title,
            category: category || existingEvent.category,
            date: date || existingEvent.date,
            venue: venue || existingEvent.venue,
            description: description || existingEvent.description,
            isCompleted: isCompleted !== undefined ? (isCompleted === 'true') : existingEvent.isCompleted,
            isFeatured: isFeatured !== undefined ? (isFeatured === 'true') : existingEvent.isFeatured
        };

        // Parse tags if provided
        if (tags) {
            updateData.tags = typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()) : tags;
        }

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

// Toggle featured status
export const toggleFeaturedStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isFeatured } = req.body;

        const event = await Event.findById(id);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found!"
            });
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            { isFeatured: isFeatured !== undefined ? isFeatured : !event.isFeatured },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: `Event ${updatedEvent.isFeatured ? 'marked as featured' : 'removed from featured'}`,
            data: updatedEvent
        });
    } catch (error) {
        console.error("Toggle featured error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while updating featured status"
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
        const featuredEvents = await Event.countDocuments({ 
            isFeatured: true 
        });
        
        // Get events by category
        const eventsByCategory = await Event.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                total: totalEvents,
                upcoming: upcomingEvents,
                past: pastEvents,
                completed: completedEvents,
                featured: featuredEvents,
                byCategory: eventsByCategory
            }
        });
    } catch (error) {
        console.error("Get stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching event statistics"
        });
    }
};
