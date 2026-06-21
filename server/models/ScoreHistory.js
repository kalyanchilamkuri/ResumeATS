const mongoose = require('mongoose');

/**
 * ScoreHistory Schema
 * Records every scoring run for trend tracking and historical analysis.
 * Indexed for efficient retrieval of recent scores per device+project.
 */
const ScoreHistorySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  compositeScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  subScores: {
    parseability: { type: Number, min: 0, max: 100 },
    keywordMatch: { type: Number, min: 0, max: 100 },
    sectionCoverage: { type: Number, min: 0, max: 100 },
    quantification: { type: Number, min: 0, max: 100 }
  },
  missingKeywords: [{
    term: { type: String },
    weight: { type: Number }
  }],
  issues: [{
    type: {
      type: String,
      enum: ['weak_verb', 'missing_metric', 'ats_risk', 'missing_section']
    },
    severity: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    message: { type: String },
    context: { type: String },
    suggestion: { type: String }
  }],
  scoredAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient lookup of recent scores by device+project
ScoreHistorySchema.index({ deviceId: 1, projectId: 1, scoredAt: -1 });

module.exports = mongoose.model('ScoreHistory', ScoreHistorySchema);
