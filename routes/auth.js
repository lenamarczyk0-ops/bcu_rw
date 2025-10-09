const express = require('express');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../auth/middleware');

const router = express.Router();

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  body('role').optional().isIn(['wykladowca', 'redaktor', 'pracodawca', 'kursant']),
  body('companyName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName, role = 'kursant', companyName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Użytkownik o tym emailu już istnieje' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role,
      companyName: role === 'pracodawca' ? companyName : undefined,
      phone,
      isActive: false, // Requires admin approval
      isVerified: false
    });

    await user.save();

    res.status(201).json({ 
      message: 'Konto zostało utworzone. Oczekuje na zatwierdzenie przez administratora.',
      userId: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Nieprawidłowe dane',
      errors: errors.array()
    });
  }

  // Passport authentication
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Błąd serwera' });
    }
    
    if (!user) {
      return res.status(401).json({ message: info.message || 'Nieprawidłowe dane logowania' });
    }
    
    req.login(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Błąd podczas logowania' });
      }
      
      console.log('User logged in successfully:', user.email);
      console.log('Session ID:', req.sessionID);
      console.log('Is authenticated:', req.isAuthenticated());
      
      // Update last login
      User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).exec();
      
      res.json({ 
        message: 'Zalogowano pomyślnie',
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          companyName: user.companyName,
          phone: user.phone
        },
        token: 'session-based', // For session-based auth
        sessionId: req.sessionID,
        isAuthenticated: req.isAuthenticated()
      });
    });
  })(req, res, next);
});

// Logout user
router.post('/logout', requireAuth, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Błąd podczas wylogowywania' });
    }
    res.json({ message: 'Wylogowano pomyślnie' });
  });
});

// Get current user - moved below

// Update user profile
router.put('/profile', requireAuth, [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('phone').optional().trim(),
  body('companyName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const allowedUpdates = ['firstName', 'lastName', 'phone'];
    if (req.user.role === 'pracodawca') {
      allowedUpdates.push('companyName');
    }

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({ user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Change password
router.put('/password', requireAuth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: 'Nieprawidłowe obecne hasło' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Hasło zostało zmienione' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Get current user info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Admin: Get all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    const filter = {};
    
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

// Admin: Update user status/role
router.put('/users/:id', requireAdmin, [
  body('role').optional().isIn(['admin', 'wykladowca', 'redaktor', 'pracodawca', 'kursant']),
  body('isActive').optional().isBoolean(),
  body('isVerified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane',
        errors: errors.array()
      });
    }

    const { role, isActive, isVerified } = req.body;
    const updates = {};

    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    if (isVerified !== undefined) updates.isVerified = isVerified;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Błąd serwera' });
  }
});

module.exports = router;

