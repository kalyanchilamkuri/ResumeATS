const mongoose = require('mongoose');

/**
 * JobDescription Schema
 * Stores the job description text and extracted keywords per device+project pair.
 * The compound unique index ensures one JD per project per device.
 */
const JobDescriptionSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    index: true
  },
  projectId: {
    type: String,
    required: [true, 'Project ID is required']
  },
  jobTitle: {
    type: String,
    default: ''
  },
  jobDescription: {
    type: String,
    required: [true, 'Job description text is required']
  },
  extractedKeywords: [{
    term: { type: String },
    weight: { type: Number, default: 1.0 },    // 1.0 normal, 1.5 from requirements section
    category: {
      type: String,
      enum: ['skill', 'tool', 'qualification', 'soft_skill', 'general'],
      default: 'general'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index: one JD per device+project combination
JobDescriptionSchema.index({ deviceId: 1, projectId: 1 }, { unique: true });

// Pre-save middleware to auto-update the updatedAt timestamp
JobDescriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Also update on findOneAndUpdate operations
JobDescriptionSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('JobDescription', JobDescriptionSchema);
