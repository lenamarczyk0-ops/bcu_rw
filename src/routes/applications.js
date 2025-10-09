const express = require('express');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Course = require('../models/Course');
const JobOffer = require('../models/JobOffer');
const { requireAuth, requireApplicationAccess } = require('../auth/middleware');

const router = express.Router();

// Submit application for course or job (public)
router.post('/', [
  body('applicationType').optional().isIn(['course', 'job']),
  body('course').optional().isMongoId(),
  body('jobOffer').optional().isMongoId(),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 9 }),
  body('company').optional().trim(),
  body('position').optional().trim(),
  body('experience').optional().isIn(['none', 'beginner', 'intermediate', 'advanced']),
  body('motivation').optional().trim(),
  body('consentRODO').isBoolean().custom(value => value === true),
  body('consentMarketing').optional().isBoolean(),
  body('consentNoEUCourses').isBoolean().custom(value => value === true).withMessage('Musisz oświadczyć, że nie korzystałeś/aś z innych kursów UE'),
  body('consentDataAccuracy').isBoolean().custom(value => value === true).withMessage('Musisz potwierdzić zgodność danych ze stanem faktycznym'),
  // Wymagaj odpowiednich pól w zależności od typu aplikacji
  body().custom(body => {
    if (body.applicationType === 'job') {
      if (!body.jobOffer && !body.jobOfferTitle) {
        throw new Error('Wymagane: jobOffer lub jobOfferTitle dla aplikacji na pracę');
      }
    } else {
      if (!body.course && !body.courseTitle) {
        throw new Error('Wymagane: course lub courseTitle dla aplikacji na kurs');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const { applicationType, course, courseTitle, courseFileId, jobOffer, jobOfferTitle, firstName, lastName, email, phone, company, position, experience, motivation, consentRODO, consentMarketing, consentNoEUCourses, consentDataAccuracy } = req.body;

    let applicationPayload = {
      applicationType: applicationType || 'course',
      firstName,
      lastName,
      email,
      phone,
      company,
      position,
      experience: experience || 'none',
      motivation,
      consentRODO,
      consentMarketing: consentMarketing || false,
      consentNoEUCourses,
      consentDataAccuracy,
      status: 'new'
    };

    if (applicationPayload.applicationType === 'job') {
      // Handle job application
      if (jobOffer) {
        // Ścieżka z modelem oferty pracy (Mongoose)
        const jobExists = await JobOffer.findOne({ _id: jobOffer, status: 'published' });
        if (!jobExists) {
          return res.status(404).json({ message: 'Oferta pracy nie została znaleziona lub nie jest dostępna' });
        }

        // Sprawdź duplikat dla tej samej oferty pracy (ObjectId)
        const existingApplication = await Application.findOne({ jobOffer, email });
        if (existingApplication) {
          return res.status(400).json({ message: 'Już złożyłeś aplikację na tę ofertę pracy' });
        }

        applicationPayload.jobOffer = jobOffer;
      } else {
        // Ścieżka fallback (oferty plikowe)
        if (!jobOfferTitle) {
          return res.status(400).json({ message: 'Brak jobOfferTitle dla aplikacji' });
        }
        // Sprawdź duplikat dla tytułu oferty + email
        const existingApplication = await Application.findOne({ jobOfferTitle, email });
        if (existingApplication) {
          return res.status(400).json({ message: 'Już złożyłeś aplikację na tę ofertę pracy' });
        }
        applicationPayload.jobOfferTitle = jobOfferTitle;
      }
    } else if (course) {
      // Ścieżka z modelem kursu (Mongoose)
      const courseExists = await Course.findOne({ _id: course, status: 'published' });
      if (!courseExists) {
        return res.status(404).json({ message: 'Kurs nie został znaleziony lub nie jest dostępny' });
      }

      // Sprawdź duplikat dla tego samego kursu (ObjectId)
      const existingApplication = await Application.findOne({ course, email });
      if (existingApplication) {
        return res.status(400).json({ message: 'Już złożyłeś aplikację na ten kurs' });
      }

      // Limity miejsc
      const applicationCount = await Application.countDocuments({ 
        course, 
        status: { $in: ['new', 'accepted', 'waiting'] } 
      });
      
      if (applicationCount >= courseExists.maxParticipants) {
        return res.status(400).json({ message: 'Brak wolnych miejsc na tym kursie' });
      }

      applicationPayload.course = course;
    } else {
      // Ścieżka fallback (kursy plikowe) — zapisz nazwę i id plikowe
      if (!courseTitle) {
        return res.status(400).json({ message: 'Brak courseTitle dla aplikacji' });
      }
      // Sprawdź duplikat dla tytułu kursu + email
      const existingApplication = await Application.findOne({ courseTitle, email });
      if (existingApplication) {
        return res.status(400).json({ message: 'Już złożyłeś aplikację na ten kurs' });
      }
      applicationPayload.courseTitle = courseTitle;
      if (courseFileId) applicationPayload.courseFileId = String(courseFileId);
    }

    const application = new Application(applicationPayload);
    await application.save();
    if (application.course) {
      await application.populate('course', 'title startDate');
    }
    if (application.jobOffer) {
      await application.populate('jobOffer', 'title location');
    }

    const message = applicationPayload.applicationType === 'job' ? 
      'Aplikacja na pracę została złożona pomyślnie' : 
      'Aplikacja na kurs została złożona pomyślnie';

    res.status(201).json({ 
      message,
      application 
    });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get all applications (admin/instructor)
router.get('/', requireAuth, requireApplicationAccess, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, course, search } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (course) filter.course = course;
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // If instructor, only show applications for their courses
    if (req.user.role === 'wykladowca') {
      const userCourses = await Course.find({ author: req.user._id }).select('_id');
      const courseIds = userCourses.map(c => c._id);
      filter.course = { $in: courseIds };
    }

    const applications = await Application.find(filter)
      .populate('course', 'title startDate')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

    res.json({
      applications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get application by ID
router.get('/:id', requireAuth, requireApplicationAccess, async (req, res) => {
  try {
    let filter = { _id: req.params.id };

    // If instructor, only show applications for their courses
    if (req.user.role === 'wykladowca') {
      const userCourses = await Course.find({ author: req.user._id }).select('_id');
      const courseIds = userCourses.map(c => c._id);
      filter.course = { $in: courseIds };
    }

    const application = await Application.findOne(filter)
      .populate('course', 'title startDate duration')
      .populate('reviewedBy', 'firstName lastName');

    if (!application) {
      return res.status(404).json({ message: 'Aplikacja nie została znaleziona' });
    }

    res.json({ application });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Update application status
router.put('/:id', requireAuth, requireApplicationAccess, [
  body('status').isIn(['new', 'accepted', 'rejected', 'waiting']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const { status, notes } = req.body;

    let filter = { _id: req.params.id };

    // If instructor, only allow updates for their courses
    if (req.user.role === 'wykladowca') {
      const userCourses = await Course.find({ author: req.user._id }).select('_id');
      const courseIds = userCourses.map(c => c._id);
      filter.course = { $in: courseIds };
    }

    const application = await Application.findOne(filter);
    if (!application) {
      return res.status(404).json({ message: 'Aplikacja nie została znaleziona' });
    }

    application.status = status;
    if (notes) application.notes = notes;
    application.reviewedBy = req.user._id;

    await application.save();
    await application.populate('course', 'title startDate');

    res.json({ application });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Delete application (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'redaktor') {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Aplikacja nie została znaleziona' });
    }

    await Application.findByIdAndDelete(req.params.id);

    res.json({ message: 'Aplikacja została usunięta' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get application statistics (admin/instructor)
router.get('/stats/overview', requireAuth, requireApplicationAccess, async (req, res) => {
  try {
    let matchFilter = {};

    // If instructor, only show stats for their courses
    if (req.user.role === 'wykladowca') {
      const userCourses = await Course.find({ author: req.user._id }).select('_id');
      const courseIds = userCourses.map(c => c._id);
      matchFilter.course = { $in: courseIds };
    }

    const stats = await Application.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Application.countDocuments(matchFilter);
    const recent = await Application.countDocuments({
      ...matchFilter,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      stats: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      total,
      recent
    });
  } catch (error) {
    console.error('Get application stats error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get all applications for admin (requires authentication)
router.get('/admin/list', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, courseId } = req.query;
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (courseId) {
      filter.course = courseId;
    }

    const applications = await Application.find(filter)
      .populate('course', 'title slug')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Application.countDocuments(filter);

    res.json({
      success: true,
      applications,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get admin applications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get application by ID (admin)
router.get('/id/:id', requireAuth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('course', 'title slug');

    if (!application) {
      return res.status(404).json({ 
        success: false,
        message: 'Zgłoszenie nie zostało znalezione' 
      });
    }

    res.json({ 
      success: true,
      application 
    });
  } catch (error) {
    console.error('Get application by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera' 
    });
  }
});

// Update application status (admin)
router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['new', 'accepted', 'rejected', 'waiting'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy status'
      });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Zgłoszenie nie zostało znalezione'
      });
    }

    application.status = status;
    application.notes = notes;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    
    await application.save();

    res.json({
      success: true,
      message: `Status zgłoszenia został zmieniony na ${status}`,
      application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get applications grouped by course (admin)
router.get('/admin/grouped', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build filter for course applications only
    const filter = {
      applicationType: 'course'
    };
    if (status) {
      filter.status = status;
    }

    // Get all applications with course data
    const applications = await Application.find(filter)
      .populate('course', 'title slug startDate')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Group applications by course
    const groupedApplications = {};
    
    applications.forEach(app => {
      // Use course title from populated course or fallback to courseTitle field
      const courseTitle = app.course?.title || app.courseTitle || 'Nieznany kurs';
      const courseId = app.course?._id?.toString() || app.courseTitle || 'unknown';
      
      if (!groupedApplications[courseId]) {
        groupedApplications[courseId] = {
          courseTitle,
          courseId: app.course?._id || null,
          courseSlug: app.course?.slug || null,
          startDate: app.course?.startDate || null,
          applications: [],
          totalApplications: 0,
          statusCounts: {
            new: 0,
            accepted: 0,
            rejected: 0,
            waiting: 0
          }
        };
      }
      
      groupedApplications[courseId].applications.push(app);
      groupedApplications[courseId].totalApplications++;
      groupedApplications[courseId].statusCounts[app.status]++;
    });

    // Convert to array and sort by course title
    const groupedArray = Object.values(groupedApplications)
      .sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));

    res.json({
      success: true,
      groups: groupedArray,
      totalGroups: groupedArray.length,
      totalApplications: applications.length
    });
  } catch (error) {
    console.error('Get grouped applications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

// Get job applications grouped by job offer (admin)
router.get('/admin/job-applications/grouped', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build filter for job applications only
    const filter = {
      applicationType: 'job'
    };
    if (status) {
      filter.status = status;
    }

    // Get all job applications with job offer data
    const applications = await Application.find(filter)
      .populate('jobOffer', 'title companyName location expireAt')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Group applications by job offer
    const groupedApplications = {};
    
    applications.forEach(app => {
      // Use job offer title from populated jobOffer or fallback to jobOfferTitle field
      const jobOfferTitle = app.jobOffer?.title || app.jobOfferTitle || 'Nieznana oferta pracy';
      const jobOfferId = app.jobOffer?._id?.toString() || app.jobOfferTitle || 'unknown';
      
      if (!groupedApplications[jobOfferId]) {
        groupedApplications[jobOfferId] = {
          jobOfferTitle,
          jobOfferId: app.jobOffer?._id || null,
          companyName: app.jobOffer?.companyName || 'Nieznana firma',
          location: app.jobOffer?.location || 'Nieznana lokalizacja',
          expireAt: app.jobOffer?.expireAt || null,
          applications: [],
          totalApplications: 0,
          statusCounts: {
            new: 0,
            accepted: 0,
            rejected: 0,
            waiting: 0
          }
        };
      }
      
      groupedApplications[jobOfferId].applications.push(app);
      groupedApplications[jobOfferId].totalApplications++;
      groupedApplications[jobOfferId].statusCounts[app.status]++;
    });

    // Convert to array and sort by job offer title
    const groupedArray = Object.values(groupedApplications)
      .sort((a, b) => a.jobOfferTitle.localeCompare(b.jobOfferTitle));

    res.json({
      success: true,
      groups: groupedArray,
      totalGroups: groupedArray.length,
      totalApplications: applications.length
    });
  } catch (error) {
    console.error('Get grouped job applications error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Błąd serwera',
      error: error.message 
    });
  }
});

module.exports = router;

