const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const Comment = require('../models/Comment');
const FieldCheckIn = require('../models/FieldCheckIn');

const seedInitialData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return false; // Already populated
    }

    console.log('[Auto-Seed] Empty database detected. Populating default demonstration records...');

    // 1. Create Admin User
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@worksphere.com',
      password: 'Admin@123',
      phone: '+91 98765 43210',
      designation: 'Senior Project Administrator',
      department: 'Management',
      role: 'ADMIN',
      status: 'ACTIVE',
      joiningDate: new Date('2024-01-15'),
    });

    // 2. Create Employees
    const rahul = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@worksphere.com',
      password: 'Employee@123',
      phone: '+91 98765 12345',
      designation: 'Frontend Developer',
      department: 'Engineering',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      joiningDate: new Date('2024-03-01'),
    });

    const priya = await User.create({
      name: 'Priya Patel',
      email: 'priya@worksphere.com',
      password: 'Employee@123',
      phone: '+91 98765 67890',
      designation: 'UI/UX Designer',
      department: 'Design',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      joiningDate: new Date('2024-04-10'),
    });

    const amit = await User.create({
      name: 'Amit Kumar',
      email: 'amit@worksphere.com',
      password: 'Employee@123',
      phone: '+91 98765 99887',
      designation: 'Backend Developer',
      department: 'Engineering',
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      joiningDate: new Date('2024-05-15'),
    });

    // 3. Create Projects
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const project1 = await Project.create({
      title: 'College Website Development',
      description: 'Development of a responsive, modern college website with admissions, notice board, and student portal.',
      startDate: now,
      deadline: thirtyDaysLater,
      manager: admin._id,
      status: 'ACTIVE',
      createdBy: admin._id,
    });

    const project2 = await Project.create({
      title: 'Mobile Attendance System',
      description: 'Cross-platform mobile application for real-time QR attendance tracking in lecture halls.',
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      deadline: sixtyDaysLater,
      manager: admin._id,
      status: 'ACTIVE',
      createdBy: admin._id,
    });

    // 4. Create Tasks
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const task1 = await Task.create({
      title: 'Design Homepage',
      description: 'Create responsive high-fidelity homepage layout with announcements, hero slider, and quick links.',
      project: project1._id,
      assignedTo: rahul._id,
      priority: 'HIGH',
      status: 'PENDING',
      startDate: now,
      deadline: sevenDaysLater,
      createdBy: admin._id,
    });

    const task2 = await Task.create({
      title: 'Create Login Page',
      description: 'Build unified authentication page supporting student and staff login credentials with validation.',
      project: project1._id,
      assignedTo: rahul._id,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      startDate: now,
      deadline: fourteenDaysLater,
      createdBy: admin._id,
    });

    const task3 = await Task.create({
      title: 'Prepare Database Structure',
      description: 'Design and deploy schemas for college departments, courses, students, and faculty in MongoDB.',
      project: project1._id,
      assignedTo: rahul._id,
      priority: 'HIGH',
      status: 'COMPLETED',
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      deadline: threeDaysAgo,
      completedAt: threeDaysAgo,
      createdBy: admin._id,
    });

    const task4 = await Task.create({
      title: 'UI Design System & Style Guide',
      description: 'Prepare color palette, typography hierarchy, and reusable component tokens in Figma.',
      project: project1._id,
      assignedTo: priya._id,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      startDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      createdBy: admin._id,
    });

    const task5 = await Task.create({
      title: 'Setup QR Scanner API',
      description: 'Implement backend verification endpoint for dynamic attendance QR tokens with geo-fencing check.',
      project: project2._id,
      assignedTo: amit._id,
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      startDate: now,
      deadline: sevenDaysLater,
      createdBy: admin._id,
    });

    // 5. Activity Logs
    await ActivityLog.create([
      {
        user: admin._id,
        action: 'PROJECT_CREATED',
        entityType: 'PROJECT',
        entityId: project1._id,
        description: `Admin created project "${project1.title}"`,
      },
      {
        user: admin._id,
        action: 'TASK_ASSIGNED',
        entityType: 'TASK',
        entityId: task1._id,
        description: `Task "${task1.title}" assigned to Rahul Sharma`,
      },
      {
        user: rahul._id,
        action: 'TASK_STATUS_UPDATED',
        entityType: 'TASK',
        entityId: task3._id,
        description: `Rahul Sharma marked task "${task3.title}" as COMPLETED`,
      },
    ]);

    // 6. Notifications
    await Notification.create([
      {
        user: rahul._id,
        title: 'New Task Assignment',
        message: 'You have been assigned to task "Design Homepage" under project "College Website Development".',
        isRead: false,
        relatedEntityType: 'TASK',
        relatedEntityId: task1._id,
      },
    ]);

    // 7. Seed Demonstration Field Check-in
    await FieldCheckIn.create([
      {
        employee: rahul._id,
        latitude: 25.351463,
        longitude: 74.632922,
        accuracy: 12,
        address: 'Inder Pratash Tower, Bhopal Ganj, Bhilwara, Rajasthan 311001, India',
        city: 'Bhilwara',
        state: 'Rajasthan',
        country: 'India',
        purpose: 'CLIENT_VISIT',
        notes: 'Initial client requirement discussion at Inder Pratash Tower',
        timestamp: new Date(),
      },
      {
        employee: priya._id,
        latitude: 25.340021,
        longitude: 74.640118,
        accuracy: 15,
        address: 'Subhash Nagar, Bhilwara, Rajasthan 311001, India',
        city: 'Bhilwara',
        state: 'Rajasthan',
        country: 'India',
        purpose: 'SITE_INSPECTION',
        notes: 'On-site UI validation and client walkthrough',
        timestamp: new Date(Date.now() - 3600000 * 2),
      },
    ]);

    console.log('[Auto-Seed] ✅ Default demonstration records seeded successfully!');
    return true;
  } catch (err) {
    console.error('[Auto-Seed] Error seeding data:', err.message);
    return false;
  }
};

module.exports = { seedInitialData };

