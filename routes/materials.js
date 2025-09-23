const express = require('express');
const { body, validationResult } = require('express-validator');
const Material = require('../models/Material');
const Course = require('../models/Course');
const { requireAuth, requireInstructor } = require('../auth/middleware');

const router = express.Router();

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

    // Increment download count
    await material.incrementDownload();

    res.json({ 
      downloadUrl: material.fileUrl,
      fileName: material.fileName || material.title
    });
  } catch (error) {
    console.error('Download material error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
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
  body('title').trim().isLength({ min: 3 }),
  body('type').isIn(['document', 'video', 'presentation', 'exercise', 'test', 'link']),
  body('fileUrl').trim().isURL(),
  body('topic').trim().isLength({ min: 2 }),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('description').optional().trim(),
  body('courses').optional().isArray(),
  body('isPublic').optional().isBoolean()
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

    // Verify courses exist and user has access
    if (courses && courses.length > 0) {
      const courseFilter = { _id: { $in: courses } };
      if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
        courseFilter.author = req.user._id;
      }
      
      const existingCourses = await Course.find(courseFilter);
      if (existingCourses.length !== courses.length) {
        return res.status(400).json({ message: 'Niektóre kursy nie zostały znalezione lub brak uprawnień' });
      }
    }

    const material = new Material({
      ...materialData,
      author: req.user._id,
      courses: courses || []
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
  body('title').optional().trim().isLength({ min: 3 }),
  body('type').optional().isIn(['document', 'video', 'presentation', 'exercise', 'test', 'link']),
  body('fileUrl').optional().trim().isURL(),
  body('topic').optional().trim().isLength({ min: 2 }),
  body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('description').optional().trim(),
  body('courses').optional().isArray(),
  body('isPublic').optional().isBoolean()
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

    // Verify courses if provided
    if (req.body.courses) {
      const courseFilter = { _id: { $in: req.body.courses } };
      if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
        courseFilter.author = req.user._id;
      }
      
      const existingCourses = await Course.find(courseFilter);
      if (existingCourses.length !== req.body.courses.length) {
        return res.status(400).json({ message: 'Niektóre kursy nie zostały znalezione lub brak uprawnień' });
      }
    }

    Object.assign(material, req.body);
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

module.exports = router;

