const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️  MONGODB_URI not set - running without database');
      return false;
    }

    console.log('🔄 Connecting to MongoDB...');

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout for faster startup
      socketTimeoutMS: 30000, // 30 second timeout
      maxPoolSize: 10,
      connectTimeoutMS: 5000, // 5 second connection timeout
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.warn('⚠️  Running without database - some features may not work');
    return false;
  }
};

module.exports = connectDB;
module.exports.isConnected = () => isConnected;

