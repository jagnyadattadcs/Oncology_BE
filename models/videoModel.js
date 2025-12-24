import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  youtubeId: {
    type: String,
    required: [true, 'YouTube ID is required'],
    trim: true
  },
  youtubeUrl: {
    type: String,
    required: [true, 'YouTube URL is required'],
    validate: {
      validator: function(v) {
        return /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(v);
      },
      message: 'Please provide a valid YouTube URL'
    }
  },
  thumbnail: {
    type: String
  },
  duration: {
    type: String,
    required: [true, 'Duration is required']
  },
  eventDate: {
    type: Date,
    required: [true, 'Event date is required']
  },
  views: {
    type: Number,
    default: 0
  },
  speaker: {
    type: String,
    required: [true, 'Speaker name is required'],
    trim: true
  },
  speakerDesignation: {
    type: String,
    trim: true
  },
  speakerInstitution: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'conference',
      'workshop',
      'seminar',
      'webinar',
      'symposium',
      'training',
      'lecture',
      'panel-discussion',
      'keynote',
      'other'
    ],
    default: 'conference'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  meta: {
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
videoSchema.virtual('formattedDate').get(function() {
  return this.eventDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for YouTube embed URL
videoSchema.virtual('embedUrl').get(function() {
  return `https://www.youtube.com/embed/${this.youtubeId}`;
});

// Virtual for watch URL
videoSchema.virtual('watchUrl').get(function() {
  return `https://youtube.com/watch?v=${this.youtubeId}`;
});

// Indexes
videoSchema.index({ title: 'text', description: 'text', speaker: 'text' });
videoSchema.index({ category: 1, eventDate: -1 });
videoSchema.index({ isFeatured: 1, isPublic: 1 });
videoSchema.index({ views: -1 });

const Video = mongoose.model('Video', videoSchema);

export default Video;
