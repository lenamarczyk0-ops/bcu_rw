const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const Material = require('../models/Material');
const Course = require('../models/Course');
const { requireAuth, requireInstructor } = require('../auth/middleware');

// For Node.js versions without built-in fetch
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  console.warn('Fetch not available, URL validation disabled');
  fetch = null;
}

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer configuration for memory storage (Cloudinary upload)
const storage = multer.memoryStorage();

// File filter - various document types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nieobsługiwany typ pliku'), false);
  }
};

// Multer upload configuration for materials - different limits based on user role
const createUploadMiddleware = (maxSize) => {
  return multer({
    storage: storage,
    limits: {
      fileSize: maxSize
    },
    fileFilter: fileFilter
  });
};

// Default upload for instructors (10MB)
const upload = createUploadMiddleware(10 * 1024 * 1024);

// Admin upload (20MB)
const adminUpload = createUploadMiddleware(20 * 1024 * 1024);

// Get all public materials (public)
router.get('/public', async (req, res) => {
  try {
    const { page = 1, limit = 12, type, topic, level, search } = req.query;
    const filter = { isPublic: true };
    
    if (type) filter.type = type;
    if (topic) filter.topic = { $regex: topic, $options: 'i' };
    if (level) filter.level = level;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const materials = await Material.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Material.countDocuments(filter);

    res.json({
      materials,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get public materials error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get materials for course (public, but limited info)
router.get('/course/:courseId', async (req, res) => {
  try {
    const course = await Course.findOne({ 
      _id: req.params.courseId, 
      status: 'published' 
    });
    
    if (!course) {
      return res.status(404).json({ message: 'Kurs nie został znaleziony' });
    }

    const materials = await Material.find({ 
      courses: req.params.courseId,
      isPublic: true
    })
      .select('title type topic level description downloadCount')
      .sort({ topic: 1, level: 1 });

    res.json({ materials });
  } catch (error) {
    console.error('Get course materials error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Download material for admin/instructor (authenticated)
router.get('/admin/download/:id', requireAuth, requireInstructor, async (req, res) => {
  try {
    let filter = { _id: req.params.id };

    // If not admin/redaktor, only allow downloading own materials
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      filter.author = req.user._id;
    }

    const material = await Material.findOne(filter);

    if (!material) {
      return res.status(404).json({ message: 'Materiał nie został znaleziony lub nie masz uprawnień do jego pobrania' });
    }

    // Increment download count
    await material.incrementDownload();

    // Determine proper filename with extension
    let downloadFileName = material.fileName || `${material.title || 'material'}`;
    
    // Ensure filename has an extension
    if (!path.extname(downloadFileName)) {
      // Try to extract extension from Cloudinary URL
      const urlMatch = material.fileUrl.match(/\/([^\/]+\.[a-zA-Z0-9]+)(?:\?|$)/);
      if (urlMatch && urlMatch[1]) {
        const cloudinaryFileName = decodeURIComponent(urlMatch[1]);
        const extension = path.extname(cloudinaryFileName);
        if (extension) {
          downloadFileName += extension;
        } else {
          downloadFileName += '.pdf'; // Default fallback
        }
      } else {
        downloadFileName += '.pdf'; // Default fallback
      }
    }

    res.json({ 
      downloadUrl: material.fileUrl,
      fileName: downloadFileName
    });
  } catch (error) {
    console.error('Admin download material error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Download material (public)
router.get('/download/:id', async (req, res) => {
  try {
    const material = await Material.findOne({ 
      _id: req.params.id,
      isPublic: true
    });

    if (!material) {
      return res.status(404).json({ message: 'Materiał nie został znaleziony' });
    }

    console.log('Downloading material:', {
      id: material._id,
      title: material.title,
      fileUrl: material.fileUrl,
      fileName: material.fileName
    });

    // Check if the URL is accessible
    if (!material.fileUrl) {
      return res.status(400).json({ message: 'Brak URL pliku' });
    }

    // If it's a Cloudinary URL, try to validate it (if fetch is available)
    if (material.fileUrl.includes('cloudinary.com') && fetch) {
      try {
        // Test if the Cloudinary URL is accessible
        const testResponse = await fetch(material.fileUrl, { method: 'HEAD' });
        if (!testResponse.ok) {
          console.error('Cloudinary URL not accessible:', material.fileUrl, 'Status:', testResponse.status);
          return res.status(404).json({ 
            message: 'Plik nie jest dostępny na serwerze',
            debug: `Cloudinary status: ${testResponse.status}`
          });
        }
      } catch (fetchError) {
        console.error('Error testing Cloudinary URL:', fetchError);
        // Don't fail completely, just log the error and continue
        console.warn('Continuing with download despite validation error');
      }
    }

    // Increment download count
    await material.incrementDownload();

    // Determine proper filename with extension
    let downloadFileName = material.fileName || `${material.title || 'material'}`;
    
    // Ensure filename has an extension
    if (!path.extname(downloadFileName)) {
      // Try to extract extension from Cloudinary URL
      const urlMatch = material.fileUrl.match(/\/([^\/]+\.[a-zA-Z0-9]+)(?:\?|$)/);
      if (urlMatch && urlMatch[1]) {
        const cloudinaryFileName = decodeURIComponent(urlMatch[1]);
        const extension = path.extname(cloudinaryFileName);
        if (extension) {
          downloadFileName += extension;
        } else {
          downloadFileName += '.pdf'; // Default fallback
        }
      } else {
        downloadFileName += '.pdf'; // Default fallback
      }
    }

    res.json({ 
      downloadUrl: material.fileUrl,
      fileName: downloadFileName,
      fileSize: material.fileSize,
      contentType: material.fileUrl.includes('.pdf') ? 'application/pdf' : 'application/octet-stream'
    });
  } catch (error) {
    console.error('Download material error:', error);
    res.status(500).json({ message: 'Błąd serwera', debug: error.message });
  }
});

// Alternative download route that proxies the file or redirects
router.get('/proxy/:id', async (req, res) => {
  try {
    const material = await Material.findOne({ 
      _id: req.params.id,
      isPublic: true
    });

    if (!material) {
      return res.status(404).json({ message: 'Materiał nie został znaleziony' });
    }

    if (!material.fileUrl) {
      return res.status(400).json({ message: 'Brak URL pliku' });
    }

    console.log('Proxying material download:', {
      id: material._id,
      title: material.title,
      fileUrl: material.fileUrl,
      fileName: material.fileName
    });

    // Increment download count
    await material.incrementDownload();

    // For Cloudinary URLs, try direct redirect first (simpler and more reliable)
    if (material.fileUrl.includes('cloudinary.com')) {
      console.log('Redirecting to Cloudinary URL directly');
      
      // Determine proper filename with extension
      let downloadFileName = material.fileName || `${material.title || 'material'}`;
      
      // Ensure filename has an extension
      if (!path.extname(downloadFileName)) {
        // Try to extract extension from Cloudinary URL
        const urlMatch = material.fileUrl.match(/\/([^\/]+\.[a-zA-Z0-9]+)(?:\?|$)/);
        if (urlMatch && urlMatch[1]) {
          const cloudinaryFileName = decodeURIComponent(urlMatch[1]);
          const extension = path.extname(cloudinaryFileName);
          if (extension) {
            downloadFileName += extension;
          } else {
            downloadFileName += '.pdf'; // Default fallback
          }
        } else {
          downloadFileName += '.pdf'; // Default fallback
        }
      }
      
      // Set headers to force download with proper filename
      res.set({
        'Content-Disposition': `attachment; filename="${downloadFileName}"`
      });
      
      // Redirect to the Cloudinary URL
      return res.redirect(302, material.fileUrl);
    }

    // For other URLs, also redirect
    console.log('Redirecting to external URL');
    res.redirect(302, material.fileUrl);

  } catch (error) {
    console.error('Proxy download error:', error);
    res.status(500).json({ 
      message: 'Błąd serwera', 
      debug: error.message,
      url: req.originalUrl
    });
  }
});

// Test endpoint to check if Cloudinary URL is accessible
router.get('/test-url/:id', async (req, res) => {
  try {
    const material = await Material.findOne({ 
      _id: req.params.id,
      isPublic: true
    });

    if (!material) {
      return res.status(404).json({ message: 'Materiał nie został znaleziony' });
    }

    const urlInfo = {
      materialId: material._id,
      title: material.title,
      fileUrl: material.fileUrl,
      fileName: material.fileName,
      fileSize: material.fileSize,
      isCloudinary: material.fileUrl.includes('cloudinary.com'),
      downloadCount: material.downloadCount
    };

    // If fetch is available, test the URL
    if (fetch && material.fileUrl.includes('cloudinary.com')) {
      try {
        const testResponse = await fetch(material.fileUrl, { method: 'HEAD' });
        urlInfo.status = testResponse.status;
        urlInfo.statusText = testResponse.statusText;
        urlInfo.accessible = testResponse.ok;
        urlInfo.headers = Object.fromEntries(testResponse.headers.entries());
      } catch (fetchError) {
        urlInfo.accessible = false;
        urlInfo.error = fetchError.message;
      }
    } else {
      urlInfo.testSkipped = 'Fetch not available or not Cloudinary URL';
    }

    res.json(urlInfo);

  } catch (error) {
    console.error('Test URL error:', error);
    res.status(500).json({ message: 'Błąd serwera', debug: error.message });
  }
});

// Get all materials for admin/instructor (authenticated)
router.get('/', requireAuth, requireInstructor, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, topic, level, course, isPublic } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (topic) filter.topic = { $regex: topic, $options: 'i' };
    if (level) filter.level = level;
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
    
    if (course) filter.courses = course;
    
    // If not admin/redaktor, only show own materials
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      filter.author = req.user._id;
    }

    const materials = await Material.find(filter)
      .populate('author', 'firstName lastName')
      .populate('courses', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Material.countDocuments(filter);

    res.json({
      materials,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get material by ID
router.get('/:id', requireAuth, requireInstructor, async (req, res) => {
  try {
    let filter = { _id: req.params.id };

    // If not admin/redaktor, only show own materials
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      filter.author = req.user._id;
    }

    const material = await Material.findOne(filter)
      .populate('author', 'firstName lastName')
      .populate('courses', 'title');

    if (!material) {
      return res.status(404).json({ message: 'Materiał nie został znaleziony' });
    }

    res.json({ material });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Create new material
router.post('/', requireAuth, requireInstructor, [
  body('title').trim().isLength({ min: 3 }).withMessage('Tytuł musi mieć co najmniej 3 znaki'),
  body('type').isIn(['document', 'video', 'presentation', 'exercise', 'test', 'link']).withMessage('Nieprawidłowy typ materiału'),
  body('fileUrl').trim().notEmpty().withMessage('URL pliku lub lokalna ścieżka jest wymagana'),
  body('topic').optional().trim(),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Nieprawidłowy poziom'),
  body('description').optional().trim(),
  body('courses').optional(),
  body('isPublic').optional().isBoolean().withMessage('isPublic musi być boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const { courses, ...materialData } = req.body;

    // Normalizacja pól z formularza
    if (typeof materialData.isPublic === 'string') {
      materialData.isPublic = materialData.isPublic === 'true';
    }
    let normalizedCourses = [];
    if (Array.isArray(courses)) {
      normalizedCourses = courses;
    } else if (typeof courses === 'string' && courses.trim().length > 0) {
      normalizedCourses = [courses.trim()];
    }

    // Verify courses exist and user has access
    if (normalizedCourses && normalizedCourses.length > 0) {
      const courseFilter = { _id: { $in: normalizedCourses } };
      if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
        courseFilter.author = req.user._id;
      }
      
      const existingCourses = await Course.find(courseFilter);
      if (existingCourses.length !== normalizedCourses.length) {
        return res.status(400).json({ message: 'Niektóre kursy nie zostały znalezione lub brak uprawnień' });
      }
    }

    const material = new Material({
      ...materialData,
      author: req.user._id,
      courses: normalizedCourses || []
    });

    await material.save();
    await material.populate('author', 'firstName lastName');
    await material.populate('courses', 'title');

    res.status(201).json({ material });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Update material
router.put('/:id', requireAuth, requireInstructor, [
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Tytuł musi mieć co najmniej 3 znaki'),
  body('type').optional().isIn(['document', 'video', 'presentation', 'exercise', 'test', 'link']).withMessage('Nieprawidłowy typ materiału'),
  body('fileUrl').optional().trim().notEmpty().withMessage('URL pliku lub lokalna ścieżka jest wymagana'),
  body('topic').optional().trim(),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Nieprawidłowy poziom'),
  body('description').optional().trim(),
  body('courses').optional(),
  body('isPublic').optional().isBoolean().withMessage('isPublic musi być boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Materiał nie został znaleziony' });
    }

    // Check ownership if not admin/redaktor
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      if (material.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Brak uprawnień' });
      }
    }

    // Normalizacja i weryfikacja kursów, jeśli podane
    let normalizedCourses = [];
    if (Array.isArray(req.body.courses)) {
      normalizedCourses = req.body.courses;
    } else if (typeof req.body.courses === 'string' && req.body.courses.trim().length > 0) {
      normalizedCourses = [req.body.courses.trim()];
    }

    if (normalizedCourses.length > 0) {
      const courseFilter = { _id: { $in: normalizedCourses } };
      if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
        courseFilter.author = req.user._id;
      }
      
      const existingCourses = await Course.find(courseFilter);
      if (existingCourses.length !== normalizedCourses.length) {
        return res.status(400).json({ message: 'Niektóre kursy nie zostały znalezione lub brak uprawnień' });
      }
    }

    // Zastosuj normalizacje boolean i courses
    const updateData = { ...req.body };
    if (typeof updateData.isPublic === 'string') {
      updateData.isPublic = updateData.isPublic === 'true';
    }
    if (normalizedCourses.length > 0) {
      updateData.courses = normalizedCourses;
    }

    Object.assign(material, updateData);
    await material.save();
    await material.populate('author', 'firstName lastName');
    await material.populate('courses', 'title');

    res.json({ material });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Delete material
router.delete('/:id', requireAuth, requireInstructor, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Materiał nie został znaleziony' });
    }

    // Check ownership if not admin/redaktor
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      if (material.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Brak uprawnień' });
      }
    }

    await Material.findByIdAndDelete(req.params.id);

    res.json({ message: 'Materiał został usunięty' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get material statistics (admin/instructor)
router.get('/stats/overview', requireAuth, requireInstructor, async (req, res) => {
  try {
    let matchFilter = {};

    // If not admin/redaktor, only show stats for own materials
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      matchFilter.author = req.user._id;
    }

    const stats = await Material.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalDownloads: { $sum: '$downloadCount' }
        }
      }
    ]);

    const total = await Material.countDocuments(matchFilter);
    const public = await Material.countDocuments({ ...matchFilter, isPublic: true });

    res.json({
      stats: stats.reduce((acc, item) => {
        acc[item._id] = { count: item.count, downloads: item.totalDownloads };
        return acc;
      }, {}),
      total,
      public
    });
  } catch (error) {
    console.error('Get material stats error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Upload file for materials to Cloudinary
router.post('/upload-file', requireAuth, requireInstructor, (req, res) => {
  // Choose upload middleware based on user role
  const uploadMiddleware = req.user.role === 'admin' ? adminUpload : upload;
  const maxSizeMB = req.user.role === 'admin' ? '20MB' : '10MB';
  
  uploadMiddleware.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `Plik jest za duży. Maksymalny rozmiar to ${maxSizeMB}.`
        });
      }
      
      if (err.message === 'Nieobsługiwany typ pliku') {
        return res.status(400).json({
          success: false,
          message: 'Nieobsługiwany typ pliku. Obsługiwane formaty: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, RAR, TXT'
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
        const fileUrl = `/materials/uploads/material-${Date.now()}-${Math.round(Math.random() * 1E9)}.${req.file.originalname.split('.').pop()}`;
        
        return res.json({
          success: true,
          message: 'Plik został przesłany (lokalnie)',
          fileUrl: fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size
        });
      }

      // Get file extension
      const fileExtension = path.extname(req.file.originalname) || '.pdf';
      const baseName = path.basename(req.file.originalname, fileExtension);
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
      
      // Upload to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'bcu-spedycja/materials', // Organize in folders
          resource_type: 'auto', // Let Cloudinary auto-detect MIME type (PDF → application/pdf)
          public_id: `${sanitizedBaseName}-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`,
          use_filename: false, // We're creating our own filename
          unique_filename: false
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({
              success: false,
              message: 'Błąd przesyłania do Cloudinary: ' + error.message
            });
          }

          res.json({
            success: true,
            message: 'Plik został pomyślnie przesłany',
            fileUrl: result.secure_url,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            cloudinaryId: result.public_id
          });
        }
      );

      // Pipe the buffer to Cloudinary
      uploadStream.end(req.file.buffer);

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Błąd serwera podczas przesyłania pliku'
      });
    }
  });
});

// Helper endpoint to fix Cloudinary URLs (change from 'image' to 'raw' resource type)
router.post('/fix-cloudinary-urls', requireAuth, requireInstructor, async (req, res) => {
  try {
    // Only admins can run this operation
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Tylko administratorzy mogą wykonać tę operację' });
    }

    const materials = await Material.find({
      fileUrl: { $regex: 'cloudinary.com.*image/upload' }
    });

    console.log(`Found ${materials.length} materials with image/upload URLs`);
    
    let fixed = 0;
    const results = [];

    for (const material of materials) {
      const oldUrl = material.fileUrl;
      
      // Replace 'image/upload' with 'raw/upload' in Cloudinary URLs
      if (oldUrl.includes('image/upload')) {
        const newUrl = oldUrl.replace('image/upload', 'raw/upload');
        
        material.fileUrl = newUrl;
        await material.save();
        
        fixed++;
        results.push({
          id: material._id,
          title: material.title,
          oldUrl: oldUrl,
          newUrl: newUrl
        });
        
        console.log(`Fixed: ${material.title} - ${oldUrl} -> ${newUrl}`);
      }
    }

    res.json({
      message: `Naprawiono ${fixed} URL-i materiałów`,
      fixed: fixed,
      total: materials.length,
      results: results
    });

  } catch (error) {
    console.error('Fix Cloudinary URLs error:', error);
    res.status(500).json({ message: 'Błąd serwera', debug: error.message });
  }
});

module.exports = router;

