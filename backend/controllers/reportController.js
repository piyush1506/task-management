const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get comprehensive project reports
// @route   GET /api/reports/projects
// @access  Private (Admin only)
const getProjectReports = async (req, res, next) => {
  try {
    const [total, active, completed, onHold, planning] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: 'ACTIVE' }),
      Project.countDocuments({ status: 'COMPLETED' }),
      Project.countDocuments({ status: 'ON_HOLD' }),
      Project.countDocuments({ status: 'PLANNING' }),
    ]);

    const projects = await Project.find()
      .populate('manager', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const projectReports = await Promise.all(
      projects.map(async (project) => {
        const totalTasks = await Task.countDocuments({ project: project._id });
        const completedTasks = await Task.countDocuments({
          project: project._id,
          status: 'COMPLETED',
        });
        const pendingTasks = await Task.countDocuments({
          project: project._id,
          status: 'PENDING',
        });
        const inProgressTasks = await Task.countDocuments({
          project: project._id,
          status: 'IN_PROGRESS',
        });

        const progressPercentage =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          _id: project._id,
          title: project.title,
          status: project.status,
          manager: project.manager?.name || 'Unassigned',
          startDate: project.startDate,
          deadline: project.deadline,
          totalTasks,
          completedTasks,
          pendingTasks,
          inProgressTasks,
          progressPercentage,
        };
      })
    );

    res.status(200).json({
      success: true,
      summary: {
        total,
        active,
        completed,
        onHold,
        planning,
      },
      projects: projectReports,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get comprehensive task reports
// @route   GET /api/reports/tasks
// @access  Private (Admin only)
const getTaskReports = async (req, res, next) => {
  try {
    const [total, pending, inProgress, completed] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'PENDING' }),
      Task.countDocuments({ status: 'IN_PROGRESS' }),
      Task.countDocuments({ status: 'COMPLETED' }),
    ]);

    const now = new Date();
    const overdue = await Task.countDocuments({
      status: { $ne: 'COMPLETED' },
      deadline: { $lt: now },
    });

    // Priority breakdown
    const [low, medium, high, urgent] = await Promise.all([
      Task.countDocuments({ priority: 'LOW' }),
      Task.countDocuments({ priority: 'MEDIUM' }),
      Task.countDocuments({ priority: 'HIGH' }),
      Task.countDocuments({ priority: 'URGENT' }),
    ]);

    const allTasks = await Task.find()
      .populate('project', 'title status')
      .populate('assignedTo', 'name email department')
      .sort({ deadline: 1 })
      .lean();

    res.status(200).json({
      success: true,
      summary: {
        total,
        pending,
        inProgress,
        completed,
        overdue,
        priority: {
          low,
          medium,
          high,
          urgent,
        },
      },
      tasks: allTasks,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get employee performance summary
// @route   GET /api/reports/employees
// @access  Private (Admin only)
const getEmployeePerformance = async (req, res, next) => {
  try {
    const employees = await User.find({ role: 'EMPLOYEE' })
      .select('name email designation department status joiningDate')
      .sort({ name: 1 })
      .lean();

    const performance = await Promise.all(
      employees.map(async (emp) => {
        const [assigned, completed, pending, inProgress] = await Promise.all([
          Task.countDocuments({ assignedTo: emp._id }),
          Task.countDocuments({ assignedTo: emp._id, status: 'COMPLETED' }),
          Task.countDocuments({ assignedTo: emp._id, status: 'PENDING' }),
          Task.countDocuments({ assignedTo: emp._id, status: 'IN_PROGRESS' }),
        ]);

        const completionPercentage =
          assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

        return {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          designation: emp.designation,
          department: emp.department,
          status: emp.status,
          assignedTasks: assigned,
          completedTasks: completed,
          pendingTasks: pending,
          inProgressTasks: inProgress,
          completionPercentage,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: performance.length,
      employees: performance,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjectReports,
  getTaskReports,
  getEmployeePerformance,
};

