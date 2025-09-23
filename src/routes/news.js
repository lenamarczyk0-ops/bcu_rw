const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const News = require('../models/News');
const { requireAuth, requireInstructor } = require('../auth/middleware');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer configuration for memory storage (Cloudinary upload)
const storage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Tylko pliki obrazów są dozwolone'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Get all published news (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 6, search, featured } = req.query;
    const filter = { 
      status: 'published',
      $or: [
        { isActive: true },
        { isActive: { $exists: false } } // backward compatibility
      ]
    };
    
    if (search) {
      filter.$and = [
        {
          $or: [
            { isActive: true },
            { isActive: { $exists: false } }
          ]
        },
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { excerpt: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      // Remove the top-level $or when using $and
      delete filter.$or;
    }
    
    if (featured === 'true') {
      filter.featured = true;
    }

    const news = await News.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await News.countDocuments(filter);

    res.json({
      success: true,
      news,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get published news by ID (public)
router.get('/id/:id', async (req, res) => {
  try {
    const news = await News.findOne({
      _id: req.params.id,
      status: 'published',
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }
      ]
    }).populate('author', 'firstName lastName');

    if (!news) {
      return res.status(404).json({ 
        success: false,
        message: 'Artykuł nie został znaleziony' 
      });
    }

    res.json({ 
      success: true,
      news 
    });
  } catch (error) {
    console.error('Get news by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera' 
    });
  }
});

// Get news by ID (admin only)
router.get('/admin/id/:id', requireAuth, requireInstructor, async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('author', 'firstName lastName');

    if (!news) {
      return res.status(404).json({ 
        success: false,
        message: 'Artykuł nie został znaleziony' 
      });
    }

    res.json({ 
      success: true,
      news 
    });
  } catch (error) {
    console.error('Get news by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera' 
    });
  }
});

// Get news by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const article = await News.findOne({ 
      slug: req.params.slug, 
      status: 'published',
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }
      ]
    }).populate('author', 'firstName lastName');

    if (!article) {
      return res.status(404).json({ message: 'Artykuł nie został znaleziony' });
    }

    res.json({ article });
  } catch (error) {
    console.error('Get news article error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get news for admin/editor (authenticated)
router.get('/admin/list', requireAuth, requireInstructor, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    // If not admin/redaktor, only show own news
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      filter.author = req.user._id;
    }

    const news = await News.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await News.countDocuments(filter);

    res.json({
      success: true,
      news,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get admin news error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Upload image for news to Cloudinary
router.post('/upload-image', requireAuth, requireInstructor, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Plik jest za duży. Maksymalny rozmiar to 5MB.'
        });
      }
      
      if (err.message === 'Tylko pliki obrazów są dozwolone') {
        return res.status(400).json({
          success: false,
          message: 'Tylko pliki obrazów są dozwolone (JPG, PNG, GIF).'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Błąd przesyłania pliku: ' + err.message
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Nie wybrano pliku' 
      });
    }

    try {
      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        console.warn('Cloudinary not configured, falling back to local storage');
        
        // Fallback to local storage if Cloudinary not configured
        const imageUrl = `/imgs/uploads/news-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        
        return res.json({
          success: true,
          message: 'Zdjęcie zostało przesłane (lokalnie)',
          imageUrl: imageUrl,
          filename: req.file.originalname,
          originalName: req.file.originalname,
          size: req.file.size,
          fallback: true
        });
      }

      // Upload to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'bcu-spedycja/news', // Organize in folders
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' }, // Max size
            { quality: 'auto' }, // Auto quality optimization
            { fetch_format: 'auto' } // Auto format (WebP when supported)
          ],
          public_id: `news-${Date.now()}-${Math.round(Math.random() * 1E9)}` // Unique filename
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({
              success: false,
              message: 'Błąd przesyłania do Cloudinary: ' + error.message
            });
          }

          // Return Cloudinary URL
          res.json({
            success: true,
            message: 'Zdjęcie zostało przesłane do Cloudinary',
            imageUrl: result.secure_url,
            publicId: result.public_id,
            filename: result.original_filename,
            originalName: req.file.originalname,
            size: result.bytes,
            width: result.width,
            height: result.height,
            format: result.format
          });
        }
      );

      // Pipe the buffer to Cloudinary
      uploadStream.end(req.file.buffer);
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Błąd przesyłania zdjęcia: ' + error.message
      });
    }
  });
});

// Delete image from Cloudinary
router.delete('/delete-image/:publicId', requireAuth, requireInstructor, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.json({
        success: true,
        message: 'Cloudinary nie jest skonfigurowany - zdjęcie usunięte lokalnie'
      });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Zdjęcie zostało usunięte z Cloudinary',
        result: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Nie udało się usunąć zdjęcia z Cloudinary',
        result: result
      });
    }
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd usuwania zdjęcia: ' + error.message
    });
  }
});

// Create new news
router.post('/', requireAuth, requireInstructor, [
  body('title').trim().isLength({ min: 3 }),
  body('contentHTML').trim().notEmpty(),
  body('imageUrl').optional().trim(), // Allow both URLs and file paths
  body('excerpt').optional().trim().isLength({ max: 300 }),
  body('featured').optional().isBoolean(),
  body('tags').optional().isArray(),
  body('publishedAt').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const newsData = {
      ...req.body,
      author: req.user._id
    };

    // Only admin and redaktor can publish directly
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      newsData.status = 'draft';
    }

    const news = new News(newsData);
    await news.save();
    await news.populate('author', 'firstName lastName');

    res.status(201).json({ news });
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Update news
router.put('/:id', requireAuth, requireInstructor, [
  body('title').optional().trim().isLength({ min: 3 }),
  body('contentHTML').optional().trim().notEmpty(),
  body('imageUrl').optional().trim(), // Allow both URLs and file paths
  body('excerpt').optional().trim().isLength({ max: 300 }),
  body('status').optional().isIn(['draft', 'published', 'archived']),
  body('featured').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  body('tags').optional().isArray(),
  body('publishedAt').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'Artykuł nie został znaleziony' });
    }

    // Check ownership if not admin/redaktor
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      if (news.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Brak uprawnień' });
      }
    }

    // Only admin and redaktor can change status to published
    if (req.body.status === 'published' && req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      req.body.status = 'draft';
    }

    Object.assign(news, req.body);
    
    // Set publishedAt when publishing
    if (req.body.status === 'published' && news.status !== 'published') {
      news.publishedAt = new Date();
    }

    await news.save();
    await news.populate('author', 'firstName lastName');

    res.json({ news });
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Delete news
router.delete('/:id', requireAuth, requireInstructor, async (req, res) => {
  try {
    const news = await News.findById(req.params.id);
    if (!news) {
      return res.status(404).json({ message: 'Artykuł nie został znaleziony' });
    }

    // Check ownership if not admin/redaktor
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      if (news.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Brak uprawnień' });
      }
    }

    await News.findByIdAndDelete(req.params.id);

    res.json({ message: 'Artykuł został usunięty' });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get featured news (public)
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 3 } = req.query;

    const news = await News.find({ 
      status: 'published', 
      featured: true 
    })
      .populate('author', 'firstName lastName')
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit));

    res.json({ news });
  } catch (error) {
    console.error('Get featured news error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;

