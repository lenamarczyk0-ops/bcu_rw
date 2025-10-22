require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configurations
const connectDB = require('./config/database');
const sessionConfig = require('./config/session');

// AdminJS disabled - using HTML admin panel instead
let adminJs = null, adminRouter = null;
console.log('✅ AdminJS disabled - using HTML admin panel');

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const newsRoutes = require('./routes/news');
const jobOfferRoutes = require('./routes/jobOffers');
const materialRoutes = require('./routes/materials');
const applicationRoutes = require('./routes/applications');

// Import passport configuration
require('./auth/passport');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // W produkcji na Railway, dodaj automatycznie domenę Railway
    if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_PUBLIC_DOMAIN) {
      allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    }
    
    // Automatycznie dodaj warianty domen produkcyjnych (z www i bez www)
    if (process.env.NODE_ENV === 'production') {
      const productionDomains = [
        'https://app.bcu-spedycja.pl',
        'https://www.bcu-spedycja.pl',
        'https://bcu-spedycja.pl'
      ];
      allowedOrigins.push(...productionDomains);
    }
    
    // Pozwól na żądania bez origin (np. Postman, server-side requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      console.warn(`✅ Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Zbyt wiele żądań, spróbuj ponownie później'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  ...sessionConfig,
  name: 'bcu.sid'
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static files - serve from root directory
app.use(express.static(path.join(__dirname, '../'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0'
}));

// AdminJS disabled - redirect to HTML admin panel
async function initializeAdminJS() {
  console.log('✅ AdminJS disabled - redirecting to HTML admin panel');
  
  // Redirect /admin to HTML admin panel
  app.get('/admin*', (req, res) => {
    res.redirect('/admin-panel.html');
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/job-offers', jobOfferRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/applications', applicationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    res.status(200).json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      nodeVersion: process.version,
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint for Railway troubleshooting
app.get('/debug', (req, res) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      port: process.env.PORT,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasAdminEmail: !!process.env.ADMIN_EMAIL,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      mongooseState: mongoose.connection.readyState,
      mongooseStateText: getMongooseStateText(mongoose.connection.readyState),
      adminJsAvailable: !!adminJs,
      adminRouterAvailable: !!adminRouter,
      filesExist: {
        'src/admin/adminjs.js': require('fs').existsSync('./src/admin/adminjs.js'),
        'src/models/User.js': require('fs').existsSync('./src/models/User.js'),
        'package.json': require('fs').existsSync('./package.json')
      },
      workingDirectory: process.cwd(),
      processId: process.pid,
      uptime: process.uptime()
    };
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Helper function for mongoose state
function getMongooseStateText(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
}

// Delete admin endpoint for Railway (temporary)
app.delete('/api/auth/delete-admin', async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Delete admin user
    const result = await User.deleteOne({ 
      email: process.env.ADMIN_EMAIL 
    });

    if (result.deletedCount > 0) {
      res.json({ 
        message: 'Admin user deleted successfully',
        email: process.env.ADMIN_EMAIL
      });
    } else {
      res.json({ 
        message: 'Admin user not found',
        email: process.env.ADMIN_EMAIL
      });
    }
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to delete admin user'
    });
  }
});

// Alternative delete admin endpoint
app.get('/api/delete-admin', async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Delete admin user
    const result = await User.deleteOne({ 
      email: process.env.ADMIN_EMAIL 
    });

    if (result.deletedCount > 0) {
      res.json({ 
        message: 'Admin user deleted successfully',
        email: process.env.ADMIN_EMAIL
      });
    } else {
      res.json({ 
        message: 'Admin user not found',
        email: process.env.ADMIN_EMAIL
      });
    }
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to delete admin user'
    });
  }
});

// Seed endpoint for Railway (temporary)
app.post('/api/seed', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production' || req.headers['x-admin-seed'] === 'true' || true) {
      const User = require('./models/User');
      
      // Check if admin already exists
      const existingAdmin = await User.findOne({ 
        email: process.env.ADMIN_EMAIL 
      });

      if (existingAdmin) {
        return res.json({ 
          message: 'Admin user already exists',
          email: existingAdmin.email,
          role: existingAdmin.role
        });
      }

      // Create admin user
      const admin = new User({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        firstName: 'Administrator',
        lastName: 'Systemu',
        role: 'admin',
        isActive: true,
        isVerified: true
      });

      await admin.save();
      
      res.json({ 
        message: 'Admin user created successfully',
        email: admin.email,
        role: admin.role
      });
    } else {
      res.status(403).json({ message: 'Not allowed in production' });
    }
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Failed to create admin user'
    });
  }
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  try {
    if (req.isAuthenticated()) {
      res.json({
        authenticated: true,
        user: {
          _id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          isActive: req.user.isActive,
          isVerified: req.user.isVerified
        }
      });
    } else {
      res.json({
        authenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ 
      authenticated: false,
      error: 'Błąd sprawdzania statusu autoryzacji'
    });
  }
});

// Alternative auth endpoint for admin panel
app.get('/api/auth/me', (req, res) => {
  try {
    if (req.isAuthenticated()) {
      res.json({
        authenticated: true,
        user: {
          _id: req.user._id,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          role: req.user.role,
          isActive: req.user.isActive,
          isVerified: req.user.isVerified
        }
      });
    } else {
      res.json({
        authenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ 
      authenticated: false,
      error: 'Błąd sprawdzania statusu autoryzacji'
    });
  }
});

// Serve main HTML files
app.get('/', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../build.html');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving main page:', error);
    res.status(500).send('Błąd serwera - strona główna niedostępna');
  }
});

app.get('/courses', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../courses.html');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving courses page:', error);
    res.status(500).send('Błąd serwera - strona kursów niedostępna');
  }
});

app.get('/job-offers', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../job-offers.html');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving job offers page:', error);
    res.status(500).send('Błąd serwera - strona ofert pracy niedostępna');
  }
});

app.get('/news', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../news.html');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving news page:', error);
    res.status(500).send('Błąd serwera - strona aktualności niedostępna');
  }
});

// Admin login page
app.get('/admin-login', (req, res) => {
  try {
    // Disable CSP for admin pages
    res.setHeader('Content-Security-Policy', '');
    const filePath = path.join(__dirname, '../admin-login.html');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving admin login page:', error);
    res.status(500).send('Błąd serwera - strona logowania niedostępna');
  }
});

// Simple admin panel (fallback)
app.get('/admin-panel', (req, res) => {
  try {
    // Disable CSP for admin pages
    res.setHeader('Content-Security-Policy', '');
    const filePath = path.join(__dirname, '../admin-panel.html');
    console.log('Serving admin panel from:', filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving admin panel:', error);
    res.status(500).send('Błąd serwera - panel admin niedostępny');
  }
});

// Redirect old admin routes to new admin panel
app.get('/joboffers-admin.html', (req, res) => {
  res.redirect('/admin-panel.html');
});

app.get('/joboffers-admin', (req, res) => {
  res.redirect('/admin-panel.html');
});

app.get('/admin/joboffers', (req, res) => {
  res.redirect('/admin-panel.html');
});

app.get('/news-admin.html', (req, res) => {
  res.redirect('/admin-panel.html');
});

app.get('/admin/news', (req, res) => {
  res.redirect('/admin-panel.html');
});

app.get('/courses-admin.html', (req, res) => {
  res.redirect('/admin-panel.html');
});

app.get('/admin/courses', (req, res) => {
  res.redirect('/admin-panel.html');
});

// Admin simple panel
app.get('/admin-simple.html', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../admin-simple.html');
    console.log('Serving admin simple panel from:', filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving admin simple panel:', error);
    res.status(500).send('Błąd serwera - panel administratora niedostępny');
  }
});

// Alternative route for admin simple panel
app.get('/admin-simple', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../admin-simple.html');
    console.log('Serving admin simple panel from:', filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving admin simple panel:', error);
    res.status(500).send('Błąd serwera - panel administratora niedostępny');
  }
});

// New admin panel
app.get('/admin-panel.html', (req, res) => {
  try {
    // Disable CSP for admin pages
    res.setHeader('Content-Security-Policy', '');
    const filePath = path.join(__dirname, '../admin-panel.html');
    console.log('Serving new admin panel from:', filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving new admin panel:', error);
    res.status(500).send('Błąd serwera - panel administratora niedostępny');
  }
});

// Alternative route for new admin panel
app.get('/admin', (req, res) => {
  try {
    // Disable CSP for admin pages
    res.setHeader('Content-Security-Policy', '');
    const filePath = path.join(__dirname, '../admin-panel.html');
    console.log('Serving new admin panel from:', filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving new admin panel:', error);
    res.status(500).send('Błąd serwera - panel administratora niedostępny');
  }
});

// Admin login page
app.get('/admin-login.html', (req, res) => {
  try {
    // Disable CSP for admin pages
    res.setHeader('Content-Security-Policy', '');
    const filePath = path.join(__dirname, '../admin-login.html');
    console.log('Serving admin login from:', filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving admin login:', error);
    res.status(500).send('Błąd serwera - strona logowania niedostępna');
  }
});

// Alternative route for admin login
app.get('/login', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../admin-login.html');
    console.log('Serving admin login from:', filePath);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving admin login:', error);
    res.status(500).send('Błąd serwera - strona logowania niedostępna');
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'Endpoint nie został znaleziony' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Błąd walidacji',
      errors 
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ 
      message: `${field} już istnieje` 
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      message: 'Nieprawidłowy format danych' 
    });
  }

  // Default error
  res.status(err.status || 500).json({ 
    message: err.message || 'Wewnętrzny błąd serwera' 
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Initialize AdminJS before starting server
async function startServer() {
  try {
    // Initialize AdminJS
    await initializeAdminJS();
    
    // Start server
    const server = app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Node version: ${process.version}`);
      console.log(`📊 Memory: ${JSON.stringify(process.memoryUsage())}`);
      
      if (process.env.NODE_ENV === 'production') {
        console.log(`📊 Admin panel: https://${process.env.RAILWAY_PUBLIC_DOMAIN}/admin`);
        console.log(`🌐 Website: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
        console.log(`📚 API: https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api`);
      } else {
        console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
        console.log(`🌐 Website: http://localhost:${PORT}`);
        console.log(`📚 API: http://localhost:${PORT}/api`);
      }
    });
    
    // Server timeout configuration
    server.timeout = 30000; // 30 seconds
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
    });
    
    return server;
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;

