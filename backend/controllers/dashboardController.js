const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get dynamic admin dashboard statistics & chart data
// @route   GET /api/dashboard/admin
// @access  Private (Admin only)
const getAdminDashboard = async (req, res, next) => {
  try {
    // 1. Core Counts
    const [
      totalProjects,
      activeProjects,
      totalEmployees,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'ACTIVE' }),
      User.countDocuments({ role: 'EMPLOYEE' }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'PENDING' }),
      Task.countDocuments({ status: 'IN_PROGRESS' }),
      Task.countDocuments({ status: 'COMPLETED' }),
    ]);

    // 2. Task Status Distribution for Donut / Pie Chart
    const taskStatusDistribution = [
      { name: 'Pending', value: pendingTasks, color: '#f59e0b' },
      { name: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
      { name: 'Completed', value: completedTasks, color: '#10b981' },
    ];

    // 3. Project-wise Progress Calculation for Bar Chart
    // Progress Percentage = (Completed Tasks / Total Tasks) * 100
    const projects = await Project.find().select('title status').lean();
    const projectProgress = await Promise.all(
      projects.map(async (project) => {
        const pTotalTasks = await Task.countDocuments({ project: project._id });
        const pCompletedTasks = await Task.countDocuments({
          project: project._id,
          status: 'COMPLETED',
        });
        const progress = pTotalTasks > 0 ? Math.round((pCompletedTasks / pTotalTasks) * 100) : 0;

        return {
          _id: project._id,
          title: project.title,
          status: project.status,
          totalTasks: pTotalTasks,
          completedTasks: pCompletedTasks,
          progress,
        };
      })
    );

    // 4. Recent Activity Logs (latest 10)
    const recentActivities = await ActivityLog.find()
      .populate('user', 'name role email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        activeProjects,
        totalEmployees,
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
      },
      taskStatusDistribution,
      projectProgress,
      recentActivities,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get dynamic employee personal dashboard statistics
// @route   GET /api/dashboard/employee
// @access  Private (Employee / Admin)
const getEmployeeDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [totalAssigned, pendingTasks, inProgressTasks, completedTasks, allAssignedTasks] =
      await Promise.all([
        Task.countDocuments({ assignedTo: userId }),
        Task.countDocuments({ assignedTo: userId, status: 'PENDING' }),
        Task.countDocuments({ assignedTo: userId, status: 'IN_PROGRESS' }),
        Task.countDocuments({ assignedTo: userId, status: 'COMPLETED' }),
        Task.find({ assignedTo: userId })
          .populate('project', 'title status deadline')
          .sort({ deadline: 1 })
          .lean(),
      ]);

    const now = new Date();
    const overdueTasks = allAssignedTasks.filter(
      (task) => task.status !== 'COMPLETED' && new Date(task.deadline) < now
    ).length;

    res.status(200).json({
      success: true,
      stats: {
        totalAssignedTasks: totalAssigned,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
      tasks: allAssignedTasks,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard,
  getEmployeeDashboard,
};

