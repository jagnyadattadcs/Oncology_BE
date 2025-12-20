import {Contact} from '../models/contactModel.js';

// Submit contact form (Public)
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, subject, and message'
      });
    }

    // Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Create new contact entry
    const newContact = await Contact.create({
      name,
      email,
      phone: phone || '',
      subject,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us. We will get back to you soon.',
      data: {
        id: newContact._id,
        name: newContact.name,
        email: newContact.email,
        subject: newContact.subject
      }
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting contact form',
      error: error.message
    });
  }
};

// Get all contacts (Admin only)
export const getAllContacts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    
    const query = {};
    
    // Filter by status
    if (status && ['unread', 'read', 'replied', 'archived'].includes(status)) {
      query.status = status;
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalContacts = await Contact.countDocuments(query);
    const totalPages = Math.ceil(totalContacts / limit);
    
    res.status(200).json({
      success: true,
      data: contacts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalContacts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
};

// Get single contact by ID (Admin only)
export const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findById(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact',
      error: error.message
    });
  }
};

// Update contact status (Admin only)
export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    
    const contact = await Contact.findById(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    const updateData = {};
    
    if (status && ['unread', 'read', 'replied', 'archived'].includes(status)) {
      updateData.status = status;
      
      // Set repliedAt timestamp if status is 'replied'
      if (status === 'replied') {
        updateData.repliedAt = new Date();
      }
      
      // Set archivedAt timestamp if status is 'archived'
      if (status === 'archived') {
        updateData.archivedAt = new Date();
      }
    }
    
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    
    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Contact updated successfully',
      data: updatedContact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
};

// Delete contact (Admin only)
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await Contact.findById(id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    await Contact.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
};

// Get contact statistics (Admin only)
export const getContactStats = async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalContacts = await Contact.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const contactsToday = await Contact.countDocuments({
      createdAt: { $gte: today }
    });
    
    const statsObject = {};
    stats.forEach(stat => {
      statsObject[stat._id] = stat.count;
    });
    
    res.status(200).json({
      success: true,
      data: {
        total: totalContacts,
        today: contactsToday,
        byStatus: statsObject
      }
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact statistics',
      error: error.message
    });
  }
};