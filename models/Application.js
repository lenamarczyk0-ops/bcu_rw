const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  // Referencja do kursu w bazie (jeśli korzystamy z modeli Mongoose)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  // Dane kursu dla trybu fallback (plikowe kursy / Railway bez bazy kursów)
  courseTitle: {
    type: String,
    trim: true
  },
  courseFileId: {
    type: String,
    trim: true
  },
  // Referencja do oferty pracy
  jobOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobOffer',
    required: false
  },
  // Dane oferty dla trybu fallback
  jobOfferTitle: {
    type: String,
    trim: true
  },
  // Typ aplikacji
  applicationType: {
    type: String,
    enum: ['course', 'job'],
    required: true,
    default: 'course'
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  experience: {
    type: String,
    enum: ['none', 'beginner', 'intermediate', 'advanced'],
    default: 'none'
  },
  motivation: {
    type: String,
    trim: true
  },
  consentRODO: {
    type: Boolean,
    required: true,
    validate: {
      validator: function(value) {
        return value === true;
      },
      message: 'Zgoda RODO jest wymagana'
    }
  },
  consentMarketing: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['new', 'accepted', 'rejected', 'waiting'],
    default: 'new'
  },
  notes: {
    type: String,
    trim: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Set reviewed date when status changes
applicationSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'new' && !this.reviewedAt) {
    this.reviewedAt = new Date();
  }
  next();
});

// Index for better performance
applicationSchema.index({ course: 1, status: 1 });
applicationSchema.index({ courseTitle: 1, email: 1 });
applicationSchema.index({ email: 1 });
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);

