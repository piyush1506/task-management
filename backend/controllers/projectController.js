const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

// @desc    Get all projects with dynamic progress
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
        query.deadline = { $lt: new Date() };
        query.status = { $ne: 'COMPLETED' };
      } else {
        query.status = status;
      }
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const projects = await Project.find(query)
      .populate('manager', 'name email designation department')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Dynamically calculate progress % for each project using real task records
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const totalTasks = await Task.countDocuments({ project: project._id });
        const completedTasks = await Task.countDocuments({
          project: project._id,
          status: 'COMPLETED',
        });
        const progressPercentage =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const isOverdue =
          project.status !== 'COMPLETED' && new Date(project.deadline) < new Date();

        return {
          ...project,
          totalTasks,
          completedTasks,
          progressPercentage,
          isOverdue,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedProjects.length,
      projects: enrichedProjects,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Admin only)
const createProject = async (req, res, next) => {
  try {
    const { title, description, startDate, deadline, manager, status } = req.body;

    if (!title || !description || !startDate || !deadline || !manager) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, startDate, deadline, and manager are required',
      });
    }

    if (new Date(deadline) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Deadline cannot be earlier than the start date',
      });
    }

    const assignedManager = await User.findById(manager);
    if (!assignedManager || assignedManager.status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Project manager must be a valid active user',
      });
    }

    const project = await Project.create({
      title: title.trim(),
      description: description.trim(),
      startDate,
      deadline,
      manager,
      status: status || 'PLANNING',
      createdBy: req.user._id,
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: project._id,
      description: `Project "${project.title}" created by ${req.user.name}`,
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single project details with tasks and progress
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email designation department phone')
      .populate('createdBy', 'name email')
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Get all tasks for this project
    const tasks = await Task.find({ project: project._id })
      .populate('assignedTo', 'name email designation department')
      .sort({ deadline: 1 })
      .lean();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;
    
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'COMPLETED' && new Date(t.deadline) < now
    ).length;

    const progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.status(200).json({
      success: true,
      project: {
        ...project,
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          overdueTasks,
          progressPercentage,
        },
        tasks,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin only)
const updateProject = async (req, res, next) => {
  try {
    const { title, description, startDate, deadline, manager, status } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    if (startDate && deadline && new Date(deadline) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Deadline cannot be earlier than start date',
      });
    }

    if (title) project.title = title.trim();
    if (description) project.description = description.trim();
    if (startDate) project.startDate = startDate;
    if (deadline) project.deadline = deadline;
    if (manager) project.manager = manager;
    if (status) project.status = status;

    await project.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'PROJECT_UPDATED',
      entityType: 'PROJECT',
      entityId: project._id,
      description: `Project "${project.title}" details updated by ${req.user.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      project,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin only)
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Delete associated tasks
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    await ActivityLog.create({
      user: req.user._id,
      action: 'PROJECT_DELETED',
      entityType: 'PROJECT',
      entityId: project._id,
      description: `Project "${project.title}" and its associated tasks deleted by ${req.user.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Project and associated tasks deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
};

