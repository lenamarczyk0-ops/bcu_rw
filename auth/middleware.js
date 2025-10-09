const User = require('../models/User');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Wymagane logowanie' });
};

// Middleware to check if user has specific role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Wymagane logowanie' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Brak uprawnień' });
    }
    
    next();
  };
};

// Middleware to check if user is admin
const requireAdmin = requireRole('admin');

// Middleware to check if user can manage content
const requireContentManager = requireRole('admin', 'redaktor');

// Middleware to check if user can create courses/news
const requireInstructor = requireRole('admin', 'wykladowca', 'redaktor');

// Middleware to check if user can manage job offers
const requireJobManager = requireRole('admin', 'pracodawca', 'redaktor');

// Middleware to check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceField = 'author') => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Wymagane logowanie' });
    }
    
    if (req.user.role === 'admin') {
      return next();
    }
    
    const resourceId = req.params.id || req.body[resourceField];
    if (!resourceId) {
      return res.status(400).json({ message: 'Brak ID zasobu' });
    }
    
    // Check ownership in the route handler
    req.checkOwnership = (resource) => {
      return resource[resourceField].toString() === req.user._id.toString();
    };
    
    next();
  };
};

// Middleware to check if user can view applications for their courses
const requireApplicationAccess = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Wymagane logowanie' });
  }
  
  if (req.user.role === 'admin' || req.user.role === 'redaktor') {
    return next();
  }
  
  if (req.user.role === 'wykladowca') {
    const courseId = req.params.courseId || req.body.course;
    if (courseId) {
      const Course = require('../models/Course');
      const course = await Course.findById(courseId);
      if (course && course.author.toString() === req.user._id.toString()) {
        return next();
      }
    }
  }
  
  res.status(403).json({ message: 'Brak uprawnień do tych aplikacji' });
};

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireContentManager,
  requireInstructor,
  requireJobManager,
  requireOwnershipOrAdmin,
  requireApplicationAccess
};

