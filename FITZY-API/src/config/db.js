const mongoose = require('mongoose');

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = connectDatabase;
