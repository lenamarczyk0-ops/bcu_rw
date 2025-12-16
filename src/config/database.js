const mongoose = require('mongoose');

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRIES = 2;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI not set - running without database');
      return false;
    }

    connectionAttempts++;
    console.log(`🔄 Connecting to MongoDB (attempt ${connectionAttempts}/${MAX_RETRIES})...`);

    // Shorter timeout for Railway - app needs to start quickly
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout for faster startup
      socketTimeoutMS: 30000, // 30 second timeout
      maxPoolSize: 10,
      retryWrites: true,
      connectTimeoutMS: 5000, // 5 second connection timeout
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Monitor connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    // Retry logic - but don't block startup too long
    if (connectionAttempts < MAX_RETRIES) {
      console.log(`⏳ Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return connectDB();
    }
    
    console.warn('⚠️ Max retries reached - running without database');
    return false;
  }
};

// Export both function and status getter
module.exports = connectDB;
module.exports.isConnected = () => isConnected;

