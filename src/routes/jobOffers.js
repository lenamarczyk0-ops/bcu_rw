const express = require('express');
const { body, validationResult } = require('express-validator');
const JobOffer = require('../models/JobOffer');
const { requireAuth, requireJobManager } = require('../auth/middleware');

const router = express.Router();

// Get all published job offers (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 6, search, location, employmentType, experienceLevel } = req.query;
    const filter = { 
      status: 'published',
      expireAt: { $gt: new Date() },
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
            { companyName: { $regex: search, $options: 'i' } },
            { descriptionHTML: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      // Remove the top-level $or when using $and
      delete filter.$or;
    }
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (employmentType) filter.employmentType = employmentType;
    if (experienceLevel) filter.experienceLevel = experienceLevel;

    const jobOffers = await JobOffer.find(filter)
      .populate('owner', 'firstName lastName companyName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await JobOffer.countDocuments(filter);

    res.json({
      success: true,
      jobOffers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get job offers error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get job offer by ID (admin)
router.get('/id/:id', requireAuth, requireJobManager, async (req, res) => {
  try {
    const jobOffer = await JobOffer.findById(req.params.id)
      .populate('owner', 'firstName lastName companyName');

    if (!jobOffer) {
      return res.status(404).json({ 
        success: false,
        message: 'Oferta pracy nie została znaleziona' 
      });
    }

    res.json({ 
      success: true,
      jobOffer 
    });
  } catch (error) {
    console.error('Get job offer by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera' 
    });
  }
});

// Get job offer by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const jobOffer = await JobOffer.findOne({ 
      _id: req.params.id, 
      status: 'published',
      expireAt: { $gt: new Date() }
    }).populate('owner', 'firstName lastName companyName');

    if (!jobOffer) {
      return res.status(404).json({ message: 'Oferta pracy nie została znaleziona' });
    }

    res.json({ jobOffer });
  } catch (error) {
    console.error('Get job offer error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get job offers for admin/employer (authenticated)
router.get('/admin/list', requireAuth, requireJobManager, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    // If not admin/redaktor, only show own job offers
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      filter.owner = req.user._id;
    }

    const jobOffers = await JobOffer.find(filter)
      .populate('owner', 'firstName lastName companyName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await JobOffer.countDocuments(filter);

    res.json({
      success: true,
      jobOffers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get admin job offers error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Create new job offer
router.post('/', requireAuth, requireJobManager, [
  body('title').trim().isLength({ min: 3 }).withMessage('Tytuł musi mieć co najmniej 3 znaki'),
  body('companyName').trim().isLength({ min: 2 }).withMessage('Nazwa firmy musi mieć co najmniej 2 znaki'),
  body('location').trim().isLength({ min: 2 }).withMessage('Lokalizacja musi mieć co najmniej 2 znaki'),
  body('descriptionHTML').trim().notEmpty().withMessage('Opis jest wymagany'),
  body('requirements').optional().trim(),
  body('benefits').optional().trim(),
  body('salaryFrom').optional().isFloat({ min: 0 }).withMessage('Wynagrodzenie od musi być liczbą nieujemną'),
  body('salaryTo').optional().isFloat({ min: 0 }).withMessage('Wynagrodzenie do musi być liczbą nieujemną'),
  body('employmentType').optional().isIn(['full-time', 'part-time', 'contract', 'internship']).withMessage('Nieprawidłowy typ zatrudnienia'),
  body('experienceLevel').optional().isIn(['junior', 'mid', 'senior', 'any']).withMessage('Nieprawidłowy poziom doświadczenia'),
  body('applyUrl').optional().isURL().withMessage('Link do aplikacji musi być poprawnym adresem URL'),
  body('contactEmail').optional().isEmail().withMessage('E-mail kontaktowy musi być poprawny'),
  body('expireAt').optional().isISO8601().withMessage('Data wygaśnięcia musi być prawidłową datą'),
  body('tags').optional().isArray().withMessage('Tagi muszą być tablicą')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const jobOfferData = {
      ...req.body,
      owner: req.user._id
    };

    // Only admin and redaktor can publish directly
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      jobOfferData.status = 'draft';
    }

    const jobOffer = new JobOffer(jobOfferData);
    await jobOffer.save();
    await jobOffer.populate('owner', 'firstName lastName companyName');

    res.status(201).json({ jobOffer });
  } catch (error) {
    console.error('Create job offer error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Update job offer
router.put('/:id', requireAuth, requireJobManager, [
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Tytuł musi mieć co najmniej 3 znaki'),
  body('companyName').optional().trim().isLength({ min: 2 }).withMessage('Nazwa firmy musi mieć co najmniej 2 znaki'),
  body('location').optional().trim().isLength({ min: 2 }).withMessage('Lokalizacja musi mieć co najmniej 2 znaki'),
  body('descriptionHTML').optional().trim().notEmpty().withMessage('Opis nie może być pusty'),
  body('requirements').optional().trim(),
  body('benefits').optional().trim(),
  body('salaryFrom').optional().isFloat({ min: 0 }).withMessage('Wynagrodzenie od musi być liczbą nieujemną'),
  body('salaryTo').optional().isFloat({ min: 0 }).withMessage('Wynagrodzenie do musi być liczbą nieujemną'),
  body('employmentType').optional().isIn(['full-time', 'part-time', 'contract', 'internship']).withMessage('Nieprawidłowy typ zatrudnienia'),
  body('experienceLevel').optional().isIn(['junior', 'mid', 'senior', 'any']).withMessage('Nieprawidłowy poziom doświadczenia'),
  body('applyUrl').optional().isURL().withMessage('Link do aplikacji musi być poprawnym adresem URL'),
  body('contactEmail').optional().isEmail().withMessage('E-mail kontaktowy musi być poprawny'),
  body('expireAt').optional().isISO8601().withMessage('Data wygaśnięcia musi być prawidłową datą'),
  body('status').optional().isIn(['draft', 'published', 'archived', 'expired']).withMessage('Nieprawidłowy status'),
  body('isActive').optional().isBoolean().withMessage('isActive musi być boolean'),
  body('tags').optional().isArray().withMessage('Tagi muszą być tablicą')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const jobOffer = await JobOffer.findById(req.params.id);
    if (!jobOffer) {
      return res.status(404).json({ message: 'Oferta pracy nie została znaleziona' });
    }

    // Check ownership if not admin/redaktor
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      if (jobOffer.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Brak uprawnień' });
      }
    }

    // Only admin and redaktor can change status to published
    if (req.body.status === 'published' && req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      req.body.status = 'draft';
    }

    Object.assign(jobOffer, req.body);
    await jobOffer.save();
    await jobOffer.populate('owner', 'firstName lastName companyName');

    res.json({ jobOffer });
  } catch (error) {
    console.error('Update job offer error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Delete job offer
router.delete('/:id', requireAuth, requireJobManager, async (req, res) => {
  try {
    const jobOffer = await JobOffer.findById(req.params.id);
    if (!jobOffer) {
      return res.status(404).json({ message: 'Oferta pracy nie została znaleziona' });
    }

    // Check ownership if not admin/redaktor
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      if (jobOffer.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Brak uprawnień' });
      }
    }

    await JobOffer.findByIdAndDelete(req.params.id);

    res.json({ message: 'Oferta pracy została usunięta' });
  } catch (error) {
    console.error('Delete job offer error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get job offer statistics (admin)
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    const stats = await JobOffer.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await JobOffer.countDocuments();
    const active = await JobOffer.countDocuments({ 
      status: 'published',
      expireAt: { $gt: new Date() }
    });
    const expired = await JobOffer.countDocuments({ 
      expireAt: { $lt: new Date() }
    });

    res.json({
      stats: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      total,
      active,
      expired
    });
  } catch (error) {
    console.error('Get job offer stats error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;

