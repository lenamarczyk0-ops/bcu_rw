const session = require('express-session');
const MongoStore = require('connect-mongo');

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-development',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Disable secure for Railway debugging
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax' // Use lax for Railway debugging
  }
};

// Temporarily disable MongoDB session store for debugging
console.warn('⚠️  MongoDB session store temporarily disabled for debugging');
// if (process.env.MONGODB_URI) {
//   try {
//     sessionConfig.store = MongoStore.create({
//       mongoUrl: process.env.MONGODB_URI,
//       touchAfter: 24 * 3600 // lazy session update
//     });
//     console.log('✅ Session store: MongoDB');
//   } catch (error) {
//     console.warn('⚠️  MongoDB session store failed, using memory store:', error.message);
//   }
// } else {
//   console.warn('⚠️  No MongoDB URI - using memory session store');
// }

module.exports = sessionConfig;

