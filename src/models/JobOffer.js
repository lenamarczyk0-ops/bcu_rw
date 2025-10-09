const mongoose = require('mongoose');

const jobOfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  descriptionHTML: {
    type: String,
    required: true
  },
  requirements: {
    type: String,
    trim: true
  },
  benefits: {
    type: String,
    trim: true
  },
  salaryFrom: {
    type: Number
  },
  salaryTo: {
    type: Number
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    default: 'full-time'
  },
  experienceLevel: {
    type: String,
    enum: ['junior', 'mid', 'senior', 'any'],
    default: 'any'
  },
  applyUrl: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  expireAt: {
    type: Date,
    required: false,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 dni
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'expired'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true
  }],
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Auto-expire job offers
jobOfferSchema.pre('save', function(next) {
  if (this.expireAt && this.expireAt < new Date() && this.status === 'published') {
    this.status = 'expired';
  }
  next();
});

// Index for better performance
jobOfferSchema.index({ status: 1, expireAt: 1 });
jobOfferSchema.index({ location: 1, status: 1 });
jobOfferSchema.index({ owner: 1 });
jobOfferSchema.index({ createdAt: -1 });

module.exports = mongoose.model('JobOffer', jobOfferSchema);

