const mongoose = require('mongoose');
const slugify = require('slugify');

const courseSchema = new mongoose.Schema({
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
  excerpt: {
    type: String,
    required: true,
    maxlength: 300
  },
  contentHTML: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: './imgs/halazdjecie.jpg'
  },
  startDate: {
    type: Date,
    required: false
  },
  duration: {
    type: String,
    required: false,
    trim: true
  },
  weeks: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  targetGroup: {
    type: String,
    required: true,
    enum: ['uczniowie i studenci', 'nauczyciele', 'dorośli'],
    default: 'dorośli'
  },
  hours: {
    type: Number,
    required: true,
    min: 1,
    default: 30
  },
  maxParticipants: {
    type: Number,
    default: 20
  },
  isActive: {
    type: Boolean,
    default: true
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
  materials: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  }],
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  targetUrl: {
    type: String,
    trim: true,
    default: ''
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate slug and duration before saving
courseSchema.pre('save', async function(next) {
  try {
    if (this.isModified('title')) {
      const baseSlug = slugify(this.title, { lower: true, strict: true });
      let uniqueSlug = baseSlug;

      // Ensure slug uniqueness by appending numeric suffix if needed
      let counter = 2;
      while (await this.constructor.exists({ slug: uniqueSlug, _id: { $ne: this._id } })) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }
      this.slug = uniqueSlug;
    }

    // Auto-generate duration from weeks and hours if not provided
    if (!this.duration && this.weeks && this.hours) {
      const weeksText = this.weeks === 1 ? '1 tydzień' : `${this.weeks} tygodni`;
      this.duration = `${weeksText} (${this.hours}h)`;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Index for better performance
courseSchema.index({ slug: 1 });
courseSchema.index({ status: 1, startDate: 1 });
courseSchema.index({ author: 1 });

module.exports = mongoose.model('Course', courseSchema);

