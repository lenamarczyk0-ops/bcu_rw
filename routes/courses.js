const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const { requireAuth, requireInstructor } = require('../auth/middleware');

const router = express.Router();

// Get all published courses (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 6, search, status } = req.query;
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

    const courses = await Course.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ startDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(filter);

    res.json({
      success: true,
      courses,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get course by ID (admin)
router.get('/id/:id', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('author', 'firstName lastName');

    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Kurs nie został znaleziony' 
      });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get course by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({ 
      slug: req.params.slug, 
      status: 'published',
      $or: [
        { isActive: true },
        { isActive: { $exists: false } }
      ]
    }).populate('author', 'firstName lastName');

    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Kurs nie został znaleziony' 
      });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get all courses for admin (requires authentication)
router.get('/admin/list', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(filter);

    res.json({
      success: true,
      courses,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get admin courses error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Create new course (requires authentication)
router.post('/', requireAuth, [
  body('title').notEmpty().withMessage('Tytuł jest wymagany'),
  body('excerpt').notEmpty().withMessage('Opis jest wymagany'),
  body('contentHTML').optional(),
  body('startDate').optional().isISO8601().withMessage('Data rozpoczęcia musi być prawidłową datą'),
  body('duration').optional(),
  body('isPaid').optional(),
  body('isActive').optional(),
  body('isCompleted').optional(),
  body('targetUrl').optional(),
  body('price').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const courseData = {
      ...req.body,
      author: req.user._id
    };
    
    // Sanitizacja boolean
    if (courseData.isActive !== undefined) courseData.isActive = courseData.isActive === true || courseData.isActive === 'true' || courseData.isActive === 'on';
    if (courseData.isCompleted !== undefined) courseData.isCompleted = courseData.isCompleted === true || courseData.isCompleted === 'true' || courseData.isCompleted === 'on';
    if (courseData.isPaid !== undefined) courseData.isPaid = courseData.isPaid === true || courseData.isPaid === 'true' || courseData.isPaid === 'on';

    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Kurs został utworzony',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Update course (requires authentication)
router.put('/:id', requireAuth, [
  body('title').optional().notEmpty().withMessage('Tytuł nie może być pusty'),
  body('excerpt').optional().notEmpty().withMessage('Opis nie może być pusty'),
  body('contentHTML').optional(),
  body('startDate').optional().isISO8601().withMessage('Nieprawidłowa data rozpoczęcia'),
  body('duration').optional(),
  body('isActive').optional(),
  body('isPaid').optional(),
  body('isCompleted').optional(),
  body('targetUrl').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Błędy walidacji',
        errors: errors.array()
      });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs nie został znaleziony'
      });
    }

    // Check if user is the author or admin
    if (course.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Brak uprawnień do edycji tego kursu'
      });
    }

    console.log('Updating course with data:', req.body);
    
    // Sanitizacja boolean przed aktualizacją
    const updateData = { ...req.body };
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === true || updateData.isActive === 'true' || updateData.isActive === 'on';
    if (updateData.isCompleted !== undefined) updateData.isCompleted = updateData.isCompleted === true || updateData.isCompleted === 'true' || updateData.isCompleted === 'on';
    if (updateData.isPaid !== undefined) updateData.isPaid = updateData.isPaid === true || updateData.isPaid === 'true' || updateData.isPaid === 'on';
    
    Object.assign(course, updateData);
    await course.save();
    console.log('Course after save:', { isActive: course.isActive, isCompleted: course.isCompleted });

    res.json({
      success: true,
      message: 'Kurs został zaktualizowany',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Delete course (requires authentication)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs nie został znaleziony'
      });
    }

    // Check if user is the author or admin
    if (course.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Brak uprawnień do usunięcia tego kursu'
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Kurs został usunięty'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Toggle course status (requires authentication)
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy status'
      });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs nie został znaleziony'
      });
    }

    // Check if user is the author or admin
    if (course.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Brak uprawnień do zmiany statusu tego kursu'
      });
    }

    course.status = status;
    await course.save();

    res.json({
      success: true,
      message: `Status kursu został zmieniony na ${status}`,
      course
    });
  } catch (error) {
    console.error('Toggle course status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get course statistics (admin only)
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Brak uprawnień administratora'
      });
    }

    const total = await Course.countDocuments();
    const published = await Course.countDocuments({ status: 'published' });
    const draft = await Course.countDocuments({ status: 'draft' });
    const archived = await Course.countDocuments({ status: 'archived' });

    res.json({
      success: true,
      stats: {
        total,
        published,
        draft,
        archived
      }
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get courses grouped by title (admin)
router.get('/admin/grouped', requireAuth, async (req, res) => {
  try {
    const courses = await Course.find({})
      .populate('author', 'firstName lastName')
      .populate('applications')
      .sort({ title: 1, startDate: 1 });

    // Group courses by title
    const groupedCourses = {};
    courses.forEach(course => {
      const title = course.title;
      if (!groupedCourses[title]) {
        groupedCourses[title] = [];
      }
      groupedCourses[title].push(course);
    });

    // Convert to array format with additional metadata
    const groupedArray = Object.keys(groupedCourses).map(title => ({
      title,
      courses: groupedCourses[title],
      totalCourses: groupedCourses[title].length,
      totalApplications: groupedCourses[title].reduce((sum, course) => 
        sum + (course.applications ? course.applications.length : 0), 0),
      statuses: {
        published: groupedCourses[title].filter(c => c.status === 'published').length,
        draft: groupedCourses[title].filter(c => c.status === 'draft').length,
        archived: groupedCourses[title].filter(c => c.status === 'archived').length
      },
      activeCount: groupedCourses[title].filter(c => c.isActive !== false).length,
      nextStartDate: groupedCourses[title]
        .filter(c => c.startDate && new Date(c.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0]?.startDate
    }));

    res.json({
      success: true,
      groups: groupedArray,
      totalGroups: groupedArray.length,
      totalCourses: courses.length
    });
  } catch (error) {
    console.error('Get grouped courses error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Temporary endpoint to update existing courses with isActive field
router.post('/admin/update-active-field', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Tylko admin może wykonać tę operację'
      });
    }

    // Update all courses without isActive field
    const result = await Course.updateMany(
      { isActive: { $exists: false } },
      { 
        $set: { 
          isActive: true,
          isPaid: false 
        } 
      }
    );

    res.json({
      success: true,
      message: `Zaktualizowano ${result.modifiedCount} kursów`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Update courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd aktualizacji kursów'
    });
  }
});

module.exports = router;