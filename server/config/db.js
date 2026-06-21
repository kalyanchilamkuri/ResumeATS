const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log(`Attempting to connect to MongoDB at ${mongoUri}`);
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.warn(`⚠️  MongoDB connection failed: ${error.message}. Falling back to in-memory MongoDB.`);
    
    // Fallback to memory server
    mongoServer = await MongoMemoryServer.create();
    const memoryUri = mongoServer.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`✅ In-memory MongoDB connected: ${memoryUri}`);
    return conn;
  }
}

module.exports = connectDB;
