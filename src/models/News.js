const mongoose = require('mongoose');
const slugify = require('slugify');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  contentHTML: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: './imgs/bcccuu.jpg'
  },
  cloudinaryPublicId: {
    type: String,
    trim: true
  },
  excerpt: {
    type: String,
    maxlength: 300
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate slug before saving
newsSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  
  // Auto-generate excerpt if not provided
  if (this.isModified('contentHTML') && !this.excerpt) {
    const textContent = this.contentHTML.replace(/<[^>]*>/g, '');
    this.excerpt = textContent.substring(0, 300) + (textContent.length > 300 ? '...' : '');
  }
  
  next();
});

// Index for better performance
newsSchema.index({ slug: 1 });
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ featured: 1, publishedAt: -1 });
newsSchema.index({ author: 1 });

module.exports = mongoose.model('News', newsSchema);

