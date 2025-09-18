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
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
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

// Seed courses endpoint
app.post('/api/seed-courses', async (req, res) => {
  try {
    const User = require('./models/User');
    const Course = require('./models/Course');
    
    // Get admin user to assign as author
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      return res.status(400).json({ 
        success: false,
        message: 'No admin user found, cannot seed courses'
      });
    }

    // Remove all existing courses
    await Course.deleteMany({});
    console.log('🗑️  Removed all existing courses');

    const courses = [
      {
        title: 'Marketing firmy transportowej',
        excerpt: 'Poznaj nowoczesne strategie marketingowe dla firm transportowych. Dowiedz się jak skutecznie promować usługi logistyczne i budować markę w branży TSL.',
        contentHTML: '<h2>Marketing firmy transportowej</h2><p>Ten kurs dotyczy nowoczesnych strategii marketingowych dedykowanych firmom transportowym. Poznasz techniki promocji usług logistycznych, budowania marki oraz skutecznego dotarcia do klientów w branży TSL.</p><h3>Program kursu:</h3><ul><li>Analiza rynku transportowego</li><li>Strategie marketingu cyfrowego</li><li>Budowanie relacji z klientami</li><li>Marketing usług logistycznych</li></ul>',
        imageUrl: './imgs/transport-logistics-concept.jpg',
        startDate: new Date('2025-02-15'),
        duration: '40 godzin',
        targetGroup: 'uczniowie i studenci',
        hours: 15,
        maxParticipants: 25,
        price: 1500,
        isPaid: true,
        status: 'published',
        tags: ['marketing', 'transport', 'logistyka', 'promocja'],
        author: admin._id
      },
      {
        title: 'Kody kreskowe i ich rola w zarządzaniu łańcuchem dostaw',
        excerpt: 'Naucz się wykorzystywać kody kreskowe w zarządzaniu magazynem i łańcuchem dostaw. Poznaj różne typy kodów, technologie skanowania i systemy śledzenia.',
        contentHTML: '<h2>Kody kreskowe w zarządzaniu łańcuchem dostaw</h2><p>Kompleksowy kurs dotyczący wykorzystania kodów kreskowych w nowoczesnej logistyce. Poznasz różne standardy kodów, technologie skanowania oraz systemy śledzenia przesyłek.</p><h3>Tematy:</h3><ul><li>Standardy kodów kreskowych</li><li>Technologie skanowania</li><li>Systemy WMS</li><li>Optymalizacja procesów magazynowych</li></ul>',
        imageUrl: './imgs/warehouse-worker-checking-inventory-arrived-goods-packages-storage-department.jpg',
        startDate: new Date('2025-02-20'),
        duration: '32 godziny',
        maxParticipants: 20,
        price: 1200,
        isPaid: true,
        status: 'published',
        tags: ['kody kreskowe', 'magazyn', 'WMS', 'skanowanie'],
        author: admin._id
      },
      {
        title: 'Jak zarabiać na transporcie? Kosztorysowanie i rozliczanie zleceń',
        excerpt: 'Kompleksowy kurs kalkulacji kosztów transportu. Poznaj metody wyceny zleceń, optymalizacji tras i maksymalizacji zysków w działalności transportowej.',
        contentHTML: '<h2>Kosztorysowanie i rozliczanie w transporcie</h2><p>Praktyczny kurs dotyczący wyceny usług transportowych. Nauczysz się kalkulować koszty, optymalizować trasy oraz maksymalizować zyski z działalności przewozowej.</p><h3>Zagadnienia:</h3><ul><li>Kalkulacja kosztów operacyjnych</li><li>Wycena zleceń transportowych</li><li>Optymalizacja tras</li><li>Analiza rentowności</li></ul>',
        imageUrl: './imgs/truck-logistics-operation-dusk.jpg',
        startDate: new Date('2025-03-01'),
        duration: '48 godzin',
        maxParticipants: 30,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['kosztorysowanie', 'finanse', 'optymalizacja', 'zyski'],
        author: admin._id
      },
      {
        title: 'Eksport i import ładunków – jak to robić z głową?',
        excerpt: 'Poznaj procedury międzynarodowego handlu. Dowiedz się o dokumentacji celnej, procedurach eksportowo-importowych i przepisach międzynarodowych.',
        contentHTML: '<h2>Eksport i import ładunków</h2><p>Kompleksowy przewodnik po międzynarodowym handlu towarami. Poznasz procedury celne, wymaganą dokumentację oraz przepisy regulujące handel zagraniczny.</p><h3>Program:</h3><ul><li>Procedury celne</li><li>Dokumentacja handlu zagranicznego</li><li>Incoterms 2020</li><li>Ubezpieczenia transportowe</li></ul>',
        imageUrl: './imgs/transportation-logistics-container-cargo-ship-cargo-plane.jpg',
        startDate: new Date('2025-03-10'),
        duration: '56 godzin',
        maxParticipants: 25,
        price: 2200,
        isPaid: true,
        status: 'published',
        tags: ['eksport', 'import', 'cło', 'handel zagraniczny'],
        author: admin._id
      },
      {
        title: 'Automatyzacja i optymalizacja transportu bliskiego w magazynie',
        excerpt: 'Nowoczesne rozwiązania automatyzacji w magazynach. Poznaj systemy WMS, roboty magazynowe i technologie optymalizujące przepływ towarów.',
        contentHTML: '<h2>Automatyzacja transportu magazynowego</h2><p>Kurs dotyczący nowoczesnych technologii automatyzacji w magazynach. Poznasz systemy WMS, roboty magazynowe oraz rozwiązania IoT optymalizujące procesy logistyczne.</p><h3>Technologie:</h3><ul><li>Systemy WMS/WCS</li><li>Roboty magazynowe AGV</li><li>Technologie IoT</li><li>Sztuczna inteligencja w logistyce</li></ul>',
        imageUrl: './imgs/cargo-transport-robot-is-parked-floor-near-shelves-with-merchandise-spacious-warehouse-that-is-lit-night-by-generative-ai.jpg',
        startDate: new Date('2025-03-15'),
        duration: '44 godzin',
        maxParticipants: 20,
        price: 2000,
        isPaid: true,
        status: 'published',
        tags: ['automatyzacja', 'WMS', 'roboty', 'IoT'],
        author: admin._id
      },
      {
        title: 'Jak latać bez samolotu? Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego',
        excerpt: 'Przyszłość dostaw dronem. Poznaj regulacje prawne, technologie dronów cargo i możliwości wykorzystania BSP w logistyce ostatniej mili.',
        contentHTML: '<h2>Transport dronami w logistyce</h2><p>Innowacyjny kurs o wykorzystaniu dronów w transporcie przesyłek. Poznasz regulacje prawne, technologie BSP oraz praktyczne zastosowania w logistyce ostatniej mili.</p><h3>Zagadnienia:</h3><ul><li>Regulacje prawne ULC</li><li>Technologie dronów cargo</li><li>Planowanie tras BSP</li><li>Bezpieczeństwo operacji</li></ul>',
        imageUrl: './imgs/drone-flying-modern-warehouse.jpg',
        startDate: new Date('2025-03-25'),
        duration: '36 godzin',
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['drony', 'BSP', 'innowacje', 'ostatnia mila'],
        author: admin._id
      },
      {
        title: 'Prowadzenie firmy spedycyjnej w zmieniającym się świecie',
        excerpt: 'Zarządzanie firmą spedycyjną w dobie transformacji cyfrowej. Poznaj trendy, wyzwania i strategie rozwoju w nowoczesnej logistyce.',
        contentHTML: '<h2>Prowadzenie firmy spedycyjnej</h2><p>Strategiczny kurs dla przedsiębiorców z branży TSL. Poznasz nowoczesne metody zarządzania, trendy rynkowe oraz strategie adaptacji do zmieniających się warunków biznesowych.</p><h3>Tematy:</h3><ul><li>Transformacja cyfrowa w TSL</li><li>Zarządzanie zmianą</li><li>Strategie rozwoju</li><li>Analiza konkurencji</li></ul>',
        imageUrl: './imgs/transport-logistic-manager-checking-control-logistic-network-distribution-customer.jpg',
        startDate: new Date('2025-04-01'),
        duration: '52 godzin',
        maxParticipants: 30,
        price: 2400,
        isPaid: true,
        status: 'published',
        tags: ['zarządzanie', 'strategia', 'rozwój', 'cyfryzacja'],
        author: admin._id
      },
      {
        title: 'Prawidłowa realizacja obrotu towarowego z zagranicą – export/import',
        excerpt: 'Procedury prawne handlu zagranicznego. Poznaj dokumentację celną, certyfikaty, procedury VAT i compliance w handlu międzynarodowym.',
        contentHTML: '<h2>Realizacja obrotu z zagranicą</h2><p>Szczegółowy kurs procedur prawnych w handlu zagranicznym. Poznasz wymagania dokumentacyjne, procedury celne oraz aspekty prawno-podatkowe handlu międzynarodowego.</p><h3>Procedury:</h3><ul><li>Dokumentacja celna</li><li>Procedury VAT w UE</li><li>Certyfikaty pochodzenia</li><li>Compliance i audyty</li></ul>',
        imageUrl: './imgs/courier-with-delivery-cardboard-box-by-car.jpg',
        startDate: new Date('2025-04-10'),
        duration: '48 godzin',
        maxParticipants: 25,
        price: 1900,
        isPaid: true,
        status: 'published',
        tags: ['prawo', 'export', 'import', 'dokumentacja'],
        author: admin._id
      },
      {
        title: 'Dobór urządzeń do mechanizacji prac ładunkowych',
        excerpt: 'Wybór i eksploatacja sprzętu do prac ładunkowych. Poznaj różne typy urządzeń, kryteria doboru i zasady bezpiecznej eksploatacji.',
        contentHTML: '<h2>Mechanizacja prac ładunkowych</h2><p>Praktyczny kurs dotyczący doboru i eksploatacji urządzeń do prac ładunkowych. Poznasz różne typy sprzętu, kryteria ekonomiczne wyboru oraz zasady bezpiecznego użytkowania.</p><h3>Urządzenia:</h3><ul><li>Wózki widłowe</li><li>Suwnice i żurawie</li><li>Przenośniki</li><li>Systemy automatyczne</li></ul>',
        imageUrl: './imgs/suwnica2.jpg',
        startDate: new Date('2025-04-20'),
        duration: '40 godzin',
        maxParticipants: 20,
        price: 1700,
        isPaid: true,
        status: 'published',
        tags: ['mechanizacja', 'sprzęt', 'wózki widłowe', 'bezpieczeństwo'],
        author: admin._id
      },
      {
        title: 'Harmonogramowanie czynności manipulacyjnych w magazynie',
        excerpt: 'Optymalizacja procesów magazynowych. Naucz się planowania pracy, zarządzania zasobami i harmonogramowania operacji w magazynie.',
        contentHTML: '<h2>Harmonogramowanie w magazynie</h2><p>Kurs optymalizacji procesów magazynowych poprzez skuteczne planowanie i harmonogramowanie. Poznasz metody organizacji pracy i zarządzania zasobami ludzkimi i technicznymi.</p><h3>Zagadnienia:</h3><ul><li>Planowanie operacji magazynowych</li><li>Zarządzanie zasobami</li><li>Optymalizacja przepływów</li><li>KPI w magazynie</li></ul>',
        imageUrl: './imgs/warehouse-operative-checking-purchase-order.jpg',
        startDate: new Date('2025-05-01'),
        duration: '36 godzin',
        maxParticipants: 25,
        price: 1400,
        isPaid: true,
        status: 'published',
        tags: ['harmonogramowanie', 'planowanie', 'optymalizacja', 'KPI'],
        author: admin._id
      },
      {
        title: 'Automatyczna identyfikacja ładunków w procesie komisjonowania przesyłek',
        excerpt: 'Nowoczesne technologie identyfikacji w komisjonowaniu. Poznaj systemy RFID, kody QR i inne technologie automatycznej identyfikacji.',
        contentHTML: '<h2>Automatyczna identyfikacja ładunków</h2><p>Zaawansowany kurs technologii automatycznej identyfikacji w procesach magazynowych. Poznasz systemy RFID, kody QR oraz inne nowoczesne rozwiązania wspierające komisjonowanie.</p><h3>Technologie:</h3><ul><li>Systemy RFID</li><li>Kody QR i DataMatrix</li><li>Technologie NFC</li><li>Systemy pick-by-light</li></ul>',
        imageUrl: './imgs/happy-employee-holding-scanner-distribution-warehouse.jpg',
        startDate: new Date('2025-05-10'),
        duration: '42 godzin',
        maxParticipants: 20,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['RFID', 'identyfikacja', 'komisjonowanie', 'automatyzacja'],
        author: admin._id
      },
      {
        title: 'Planowanie czynności manipulacyjnych podczas przeładunku',
        excerpt: 'Efektywne zarządzanie operacjami przeładunkowymi. Poznaj metody planowania, optymalizacji i koordynacji prac przeładunkowych.',
        contentHTML: '<h2>Planowanie operacji przeładunkowych</h2><p>Kompleksowy kurs zarządzania operacjami przeładunkowymi. Nauczysz się planować, koordynować i optymalizować procesy przeładunku w różnych typach terminali.</p><h3>Operacje:</h3><ul><li>Planowanie przeładunków</li><li>Koordynacja zespołów</li><li>Optymalizacja czasów</li><li>Zarządzanie zasobami</li></ul>',
        imageUrl: './imgs/medium-shot-smiley-man-warehouse.jpg',
        startDate: new Date('2025-05-20'),
        duration: '38 godzin',
        maxParticipants: 22,
        price: 1500,
        isPaid: true,
        status: 'published',
        tags: ['przeładunek', 'planowanie', 'koordynacja', 'terminale'],
        author: admin._id
      },
      {
        title: 'Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego',
        excerpt: 'Praktyczne wykorzystanie dronów w dostawach. Poznaj procedury operacyjne, planowanie misji i zarządzanie flotą dronów dostawczych.',
        contentHTML: '<h2>Transport dronami - aspekty praktyczne</h2><p>Praktyczny kurs operacji transportowych z wykorzystaniem dronów. Poznasz procedury planowania misji, zarządzanie flotą BSP oraz aspekty ekonomiczne dostaw dronami.</p><h3>Operacje:</h3><ul><li>Planowanie misji BSP</li><li>Zarządzanie flotą</li><li>Analiza ekonomiczna</li><li>Integracja z systemami logistycznymi</li></ul>',
        imageUrl: './imgs/white-truck-delivery-shipping-service-3d-rendering.jpg',
        startDate: new Date('2025-06-01'),
        duration: '44 godzin',
        maxParticipants: 18,
        price: 1900,
        isPaid: true,
        status: 'published',
        tags: ['drony', 'dostawy', 'planowanie misji', 'flota'],
        author: admin._id
      },
      {
        title: 'Język angielski w spedycji',
        excerpt: 'Angielski specjalistyczny dla branży TSL. Poznaj terminologię, dokumentację i komunikację w języku angielskim w międzynarodowej logistyce.',
        contentHTML: '<h2>Język angielski w spedycji</h2><p>Specjalistyczny kurs języka angielskiego dla pracowników branży TSL. Poznasz terminologię spedycyjną, dokumentację międzynarodową oraz komunikację biznesową w języku angielskim.</p><h3>Zakres:</h3><ul><li>Terminologia spedycyjna</li><li>Dokumentacja handlowa</li><li>Korespondencja biznesowa</li><li>Negocjacje w j. angielskim</li></ul>',
        imageUrl: './imgs/medium-shot-woman-with-tablet.jpg',
        startDate: new Date('2025-06-10'),
        duration: '60 godzin',
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['język angielski', 'terminologia', 'komunikacja', 'spedycja'],
        author: admin._id
      },
      {
        title: 'Język niemiecki w spedycji',
        excerpt: 'Niemiecki specjalistyczny dla logistyki. Naucz się komunikacji z partnerami niemieckimi, terminologii i dokumentacji w języku niemieckim.',
        contentHTML: '<h2>Język niemiecki w spedycji</h2><p>Kurs języka niemieckiego dedykowany branży logistycznej. Poznasz terminologię spedycyjną, dokumentację oraz skuteczną komunikację z partnerami niemieckimi w branży TSL.</p><h3>Program:</h3><ul><li>Terminologia logistyczna</li><li>Dokumentacja spedycyjna</li><li>Komunikacja telefoniczna</li><li>Kultura biznesowa niemiecka</li></ul>',
        imageUrl: './imgs/medium-shot-woman-storage.jpg',
        startDate: new Date('2025-06-20'),
        duration: '60 godzin',
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['język niemiecki', 'komunikacja', 'partnerzy', 'kultura biznesowa'],
        author: admin._id
      },
      {
        title: 'Branżowy język polski jako język obcy',
        excerpt: 'Polski język specjalistyczny dla cudzoziemców w TSL. Kurs dedykowany pracownikom zagranicznym w polskiej branży transportowo-spedycyjnej.',
        contentHTML: '<h2>Polski język branżowy dla cudzoziemców</h2><p>Specjalistyczny kurs języka polskiego dla pracowników zagranicznych w branży TSL. Program obejmuje terminologię branżową, komunikację zawodową oraz kulturę pracy w Polsce.</p><h3>Elementy:</h3><ul><li>Terminologia TSL po polsku</li><li>Komunikacja zawodowa</li><li>Dokumentacja polska</li><li>Kultura pracy w Polsce</li></ul>',
        imageUrl: './imgs/woman-safety-equipment-working.jpg',
        startDate: new Date('2025-07-01'),
        duration: '80 godzin',
        maxParticipants: 12,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['język polski', 'cudzoziemcy', 'integracja', 'kultura pracy'],
        author: admin._id
      }
    ];

    const createdCourses = [];
    for (const courseData of courses) {
      const course = new Course(courseData);
      await course.save();
      createdCourses.push(course.title);
      console.log(`✅ Course created: ${course.title}`);
    }

    res.json({
      success: true,
      message: `Successfully created ${courses.length} new courses`,
      coursesCreated: createdCourses.length,
      courses: createdCourses
    });

  } catch (error) {
    console.error('Seed courses error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Failed to seed courses'
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

// Alternative route for new admin panel - redirect to login
app.get('/admin', (req, res) => {
  res.redirect('/admin-login.html');
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

