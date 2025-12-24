import { CouncilMember } from '../models/councilMember.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Get all council members
export const getAllMembers = async (req, res) => {
  try {
    const members = await CouncilMember.find()
      .sort({ role: 1, name: 1 })
      .select('-publicId -createdAt -updatedAt -__v');
    
    return res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching council members'
    });
  }
};

// Get council member by ID
export const getMemberById = async (req, res) => {
  try {
    const member = await CouncilMember.findById(req.params.id)
      .select('-publicId -createdAt -updatedAt -__v');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error(error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching council member'
    });
  }
};

// Create new council member
export const createMember = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a profile image'
      });
    }

    const {
      id,
      name,
      email,
      phone,
      currHospital,
      dateOfJoining,
      bio,
      qualification,
      specialization,
      achievements,
      role
    } = req.body;

    // Check if member with same email already exists
    const existingMember = await CouncilMember.findOne({ email });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Member with this email already exists'
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'osoo/members', {
      transformation: [
        { width: 500, height: 500, crop: 'fill', gravity: 'face' }
      ]
    });

    // Parse array fields if they come as strings
    const currHospitalArray = currHospital 
      ? (typeof currHospital === 'string' ? JSON.parse(currHospital) : currHospital)
      : [];
    
    const qualificationArray = typeof qualification === 'string' 
      ? JSON.parse(qualification) 
      : (qualification || []);
    
    const specializationArray = typeof specialization === 'string'
      ? JSON.parse(specialization)
      : (specialization || []);
    
    const achievementsArray = achievements
      ? (typeof achievements === 'string' ? JSON.parse(achievements) : achievements)
      : [];

    // Create new member
    const newMember = await CouncilMember.create({
      id,
      name,
      email,
      phone,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      currHospital: currHospitalArray,
      dateOfJoining: dateOfJoining || new Date(),
      bio,
      qualification: qualificationArray,
      specialization: specializationArray,
      achievements: achievementsArray,
      role: role || 'Executive-Member'
    });

    return res.status(201).json({
      success: true,
      message: 'Council member created successfully',
      data: {
        id: newMember._id,
        memberId: newMember?.id || "Not Assigned",
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        imageUrl: newMember.imageUrl
      }
    });
  } catch (error) {
    console.error('Create member error:', error);
    
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
      message: 'Server error while creating council member'
    });
  }
};

// Update council member details (without changing image)
export const updateMember = async (req, res) => {
  try {
    const { id: idNum } = req.params;
    const {
      id,
      name,
      email,
      phone,
      currHospital,
      dateOfJoining,
      bio,
      qualification,
      specialization,
      achievements,
      role
    } = req.body;

    // Find existing member
    const existingMember = await CouncilMember.findById(idNum);
    
    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== existingMember.email) {
      const emailExists = await CouncilMember.findOne({ 
        email, 
        _id: { $ne: id } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Another member with this email already exists'
        });
      }
    }

    // Parse array fields if they come as strings
    const currHospitalArray = currHospital !== undefined 
      ? (typeof currHospital === 'string' ? JSON.parse(currHospital) : currHospital)
      : existingMember.currHospital;
    
    const qualificationArray = qualification !== undefined
      ? (typeof qualification === 'string' ? JSON.parse(qualification) : qualification)
      : existingMember.qualification;
    
    const specializationArray = specialization !== undefined
      ? (typeof specialization === 'string' ? JSON.parse(specialization) : specialization)
      : existingMember.specialization;
    
    const achievementsArray = achievements !== undefined
      ? (typeof achievements === 'string' ? JSON.parse(achievements) : achievements)
      : existingMember.achievements;

    // Update in database
    const updatedMember = await CouncilMember.findByIdAndUpdate(
      idNum,
      {
        id: id || existingMember?.id,
        name: name || existingMember.name,
        email: email || existingMember.email,
        phone: phone || existingMember.phone,
        currHospital: currHospitalArray,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : existingMember.dateOfJoining,
        bio: bio || existingMember.bio,
        qualification: qualificationArray,
        specialization: specializationArray,
        achievements: achievementsArray,
        role: role || existingMember.role
      },
      { new: true, runValidators: true }
    ).select('-publicId -createdAt -updatedAt -__v');

    return res.status(200).json({
      success: true,
      message: 'Council member updated successfully',
      data: updatedMember
    });
  } catch (error) {
    console.error('Update member error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error while updating council member'
    });
  }
};

// Update council member with new image
export const updateMemberWithImage = async (req, res) => {
  try {
    const { id: idNum } = req.params;
    
    // Find existing member
    const existingMember = await CouncilMember.findById(idNum);
    
    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }

    const {
      id,
      name,
      email,
      phone,
      currHospital,
      dateOfJoining,
      bio,
      qualification,
      specialization,
      achievements,
      role
    } = req.body;

    // Check if email is being changed and if new email already exists
    if (email && email !== existingMember.email) {
      const emailExists = await CouncilMember.findOne({ 
        email, 
        _id: { $ne: idNum } 
      });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Another member with this email already exists'
        });
      }
    }

    let imageUrl = existingMember.imageUrl;
    let publicId = existingMember.publicId;

    // Upload new image if provided
    if (req.file) {
      try {
        // Delete old image from Cloudinary
        await deleteFromCloudinary(existingMember.publicId);
        
        // Upload new image to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, 'osoo/members', {
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' }
          ]
        });
        
        imageUrl = result.secure_url;
        publicId = result.public_id;
      } catch (cloudinaryError) {
        console.error('Failed to update image on Cloudinary:', cloudinaryError);
        // If image update fails, keep the old image
        imageUrl = existingMember.imageUrl;
        publicId = existingMember.publicId;
      }
    }

    // Parse array fields if they come as strings
    const currHospitalArray = currHospital !== undefined 
      ? (typeof currHospital === 'string' ? JSON.parse(currHospital) : currHospital)
      : existingMember.currHospital;
    
    const qualificationArray = qualification !== undefined
      ? (typeof qualification === 'string' ? JSON.parse(qualification) : qualification)
      : existingMember.qualification;
    
    const specializationArray = specialization !== undefined
      ? (typeof specialization === 'string' ? JSON.parse(specialization) : specialization)
      : existingMember.specialization;
    
    const achievementsArray = achievements !== undefined
      ? (typeof achievements === 'string' ? JSON.parse(achievements) : achievements)
      : existingMember.achievements;

    // Update in database
    const updatedMember = await CouncilMember.findByIdAndUpdate(
      idNum,
      {
        id: id || existingMember?.id,
        name: name || existingMember.name,
        email: email || existingMember.email,
        phone: phone || existingMember.phone,
        imageUrl,
        publicId,
        currHospital: currHospitalArray,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : existingMember.dateOfJoining,
        bio: bio || existingMember.bio,
        qualification: qualificationArray,
        specialization: specializationArray,
        achievements: achievementsArray,
        role: role || existingMember.role
      },
      { new: true, runValidators: true }
    ).select('-publicId -createdAt -updatedAt -__v');

    return res.status(200).json({
      success: true,
      message: 'Council member updated successfully',
      data: updatedMember
    });
  } catch (error) {
    console.error('Update member with image error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error while updating council member'
    });
  }
};

// Get members by role
export const getMembersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    // Validate role
    const validRoles = ["President", "Vice-President", "Secretary", "Treasurer", "Executive-Member"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles are: President, Vice-President, Secretary, Treasurer, Executive-Member'
      });
    }
    
    const members = await CouncilMember.find({ role })
      .sort({ name: 1 })
      .select('-publicId -createdAt -updatedAt -__v');
    
    return res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error('Get members by role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching members by role'
    });
  }
};

// Get member statistics
export const getMemberStats = async (req, res) => {
  try {
    const totalMembers = await CouncilMember.countDocuments();
    
    const membersByRole = await CouncilMember.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          members: {
            $push: {
              name: '$name',
              id: '$_id',
              imageUrl: '$imageUrl'
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Calculate distribution percentages
    const roleDistribution = membersByRole.map(roleGroup => ({
      role: roleGroup._id,
      count: roleGroup.count,
      percentage: totalMembers > 0 ? ((roleGroup.count / totalMembers) * 100).toFixed(1) : '0.0',
      members: roleGroup.members
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalMembers,
        roleDistribution,
        summary: {
          hasPresident: membersByRole.some(r => r._id === 'President'),
          hasVicePresident: membersByRole.some(r => r._id === 'Vice-President'),
          hasSecretary: membersByRole.some(r => r._id === 'Secretary'),
          hasTreasurer: membersByRole.some(r => r._id === 'Treasurer')
        }
      }
    });
  } catch (error) {
    console.error('Get member stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching member statistics'
    });
  }
};

// Search members
export const searchMembers = async (req, res) => {
  try {
    const { query, role, specialization } = req.query;
    
    let searchCriteria = {};
    
    // Text search
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Role filter
    if (role) {
      searchCriteria.role = role;
    }
    
    // Specialization filter
    if (specialization) {
      searchCriteria.specialization = { $in: [new RegExp(specialization, 'i')] };
    }
    
    const members = await CouncilMember.find(searchCriteria)
      .sort({ role: 1, name: 1 })
      .select('-publicId -createdAt -updatedAt -__v');
    
    return res.status(200).json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    console.error('Search members error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while searching members'
    });
  }
};

// Delete council member
export const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the member in database
    const member = await CouncilMember.findById(id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(member.publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await CouncilMember.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Council member deleted successfully'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Council member not found'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting council member'
    });
  }
};

// Delete multiple council members
export const deleteMultipleMembers = async (req, res) => {
  try {
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of member IDs to delete'
      });
    }

    // Find all members to delete
    const members = await CouncilMember.find({ _id: { $in: memberIds } });
    
    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No members found with the provided IDs'
      });
    }

    // Delete images from Cloudinary
    const cloudinaryDeletions = members.map(member => 
      deleteFromCloudinary(member.publicId).catch(error => {
        console.error(`Failed to delete image for member ${member._id}:`, error);
        return null;
      })
    );
    
    await Promise.all(cloudinaryDeletions);

    // Delete from database
    const result = await CouncilMember.deleteMany({ _id: { $in: memberIds } });

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount} council member(s) deleted successfully`
    });
  } catch (error) {
    console.error('Delete multiple members error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting multiple council members'
    });
  }
};