const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['document', 'video', 'presentation', 'exercise', 'test', 'link'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number
  },
  topic: {
    type: String,
    required: false,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  description: {
    type: String,
    trim: true
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Increment download count
materialSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  return this.save();
};

// Index for better performance
materialSchema.index({ courses: 1 });
materialSchema.index({ topic: 1, level: 1 });
materialSchema.index({ author: 1 });
materialSchema.index({ isPublic: 1, type: 1 });

module.exports = mongoose.model('Material', materialSchema);

