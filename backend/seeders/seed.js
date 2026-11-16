const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const { seedInitialData } = require('./seedData');

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('[Seeder] Connecting to database...');
    await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/worksphere');
    console.log('[Seeder] Connected.');

    console.log('[Seeder] Resetting database collections...');
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await ActivityLog.deleteMany({});
    await Notification.deleteMany({});
    await Comment.deleteMany({});

    await seedInitialData();

    console.log('[Seeder] Done.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seeder] Error:', err.message);
    process.exit(1);
  }
};

run();
