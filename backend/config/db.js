const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const { seedInitialData } = require('../seeders/seedData');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/worksphere';
  
  // Try standard MONGODB_URI first
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected to host: ${conn.connection.host}`);
    await seedInitialData();
    return conn;
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection failed (${err.message}).`);
    
    // Attempt in-memory database fallback if allowed
    if (process.env.USE_IN_MEMORY_DB !== 'false') {
      try {
        console.log('[Database] Initializing In-Memory MongoDB engine...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create({
          binary: {
            version: '6.0.14',
          },
        });
        const memoryUri = mongodInstance.getUri();
        const conn = await mongoose.connect(memoryUri);
        console.log(`[Database] In-Memory MongoDB Connected at: ${memoryUri}`);
        await seedInitialData();
        return conn;
      } catch (fallbackErr) {
        console.warn('[Database] In-Memory MongoDB not ready yet:', fallbackErr.message);
      }
    }

    console.warn('[Database] Running in disconnected database mode. Set MONGODB_URI in backend/.env when available.');
    return null;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (e) {
    console.error('[Database] Disconnect error:', e.message);
  }
};

module.exports = { connectDB, disconnectDB };
