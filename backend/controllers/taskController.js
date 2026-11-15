const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');

// @desc    Get all tasks with filters & search
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const { status, project, assignedTo, priority, search } = req.query;

    const query = {};

    // If logged in user is Employee and requests tasks without explicit admin override
    if (req.user.role === 'EMPLOYEE' && !assignedTo) {
      query.assignedTo = req.user._id;
    } else if (assignedTo && assignedTo !== 'ALL') {
      query.assignedTo = assignedTo;
    }

    if (project && project !== 'ALL') {
      query.project = project;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }

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

    const tasks = await Task.find(query)
      .populate('project', 'title status deadline')
      .populate('assignedTo', 'name email designation department')
      .populate('createdBy', 'name')
      .sort({ deadline: 1, createdAt: -1 })
      .lean();

    const now = new Date();
    const enrichedTasks = tasks.map((task) => ({
      ...task,
      isOverdue: task.status !== 'COMPLETED' && new Date(task.deadline) < now,
    }));

    res.status(200).json({
      success: true,
      count: enrichedTasks.length,
      tasks: enrichedTasks,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private (Admin only)
const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      priority,
      startDate,
      deadline,
      status,
    } = req.body;

    if (!title || !description || !project || !assignedTo || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, project, assigned employee, and deadline are required',
      });
    }

    // Verify Project exists
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(400).json({
        success: false,
        message: 'Selected project does not exist',
      });
    }

    // Verify Employee exists and is active
    const employeeDoc = await User.findById(assignedTo);
    if (!employeeDoc || employeeDoc.status === 'INACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Assigned employee must be a valid active user',
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      project,
      assignedTo,
      priority: priority || 'MEDIUM',
      status: status || 'PENDING',
      startDate: startDate || Date.now(),
      deadline,
      createdBy: req.user._id,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    });

    // Activity Log
    await ActivityLog.create({
      user: req.user._id,
      action: 'TASK_CREATED',
      entityType: 'TASK',
      entityId: task._id,
      description: `Task "${task.title}" created and assigned to ${employeeDoc.name}`,
    });

    // Notify assigned employee
    await Notification.create({
      user: assignedTo,
      title: 'New Task Assignment',
      message: `You were assigned to task "${task.title}" in project "${projectDoc.title}".`,
      relatedEntityType: 'TASK',
      relatedEntityId: task._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('project', 'title status deadline')
      .populate('assignedTo', 'name email designation department');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: populatedTask,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get task details with comments & activity history
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'title description status deadline manager')
      .populate('assignedTo', 'name email designation department phone')
      .populate('createdBy', 'name email')
      .lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Security check: Employee can only view assigned tasks unless admin
    if (
      req.user.role === 'EMPLOYEE' &&
      task.assignedTo?._id?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not assigned to this task',
      });
    }

    // Fetch comments
    const comments = await Comment.find({ task: task._id })
      .populate('user', 'name role email')
      .sort({ createdAt: 1 })
      .lean();

    // Fetch related activity logs
    const activities = await ActivityLog.find({
      entityType: 'TASK',
      entityId: task._id,
    })
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      task: {
        ...task,
        comments,
        activities,
        isOverdue: task.status !== 'COMPLETED' && new Date(task.deadline) < new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update task details (Admin)
// @route   PUT /api/tasks/:id
// @access  Private (Admin only)
const updateTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      priority,
      startDate,
      deadline,
      status,
    } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (title) task.title = title.trim();
    if (description) task.description = description.trim();
    if (project) task.project = project;
    if (priority) task.priority = priority;
    if (startDate) task.startDate = startDate;
    if (deadline) task.deadline = deadline;

    if (assignedTo && assignedTo.toString() !== task.assignedTo.toString()) {
      task.assignedTo = assignedTo;
      // Notify new assignee
      await Notification.create({
        user: assignedTo,
        title: 'Task Reassigned',
        message: `Task "${task.title}" has been assigned to you.`,
        relatedEntityType: 'TASK',
        relatedEntityId: task._id,
      });
    }

    if (status) {
      task.status = status;
      if (status === 'COMPLETED' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (status !== 'COMPLETED') {
        task.completedAt = null;
      }
    }

    await task.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'TASK_UPDATED',
      entityType: 'TASK',
      entityId: task._id,
      description: `Task "${task.title}" updated by ${req.user.name}`,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('project', 'title status deadline')
      .populate('assignedTo', 'name email designation department');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      task: populatedTask,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update task status (Employee or Admin)
// @route   PATCH /api/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be PENDING, IN_PROGRESS, or COMPLETED',
      });
    }

    const task = await Task.findById(req.params.id).populate('project', 'title');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Authorization check: User must be Admin OR the assigned employee
    const isAssignee = task.assignedTo?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAssignee && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only update tasks assigned to you',
      });
    }

    const oldStatus = task.status;
    task.status = status;

    if (status === 'COMPLETED') {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await task.save();

    // Activity Log
    await ActivityLog.create({
      user: req.user._id,
      action: 'TASK_STATUS_UPDATED',
      entityType: 'TASK',
      entityId: task._id,
      description: `${req.user.name} changed status of "${task.title}" from ${oldStatus} to ${status}`,
    });

    // Notify Project Manager / Admin if an employee marked it complete
    if (isAssignee && status === 'COMPLETED') {
      const admins = await User.find({ role: 'ADMIN' });
      for (const adminUser of admins) {
        await Notification.create({
          user: adminUser._id,
          title: 'Task Completed',
          message: `${req.user.name} marked task "${task.title}" as COMPLETED in project "${task.project?.title}".`,
          relatedEntityType: 'TASK',
          relatedEntityId: task._id,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      task,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete task (Admin only)
// @route   DELETE /api/tasks/:id
// @access  Private (Admin only)
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await Comment.deleteMany({ task: task._id });
    await task.deleteOne();

    await ActivityLog.create({
      user: req.user._id,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: task._id,
      description: `Task "${task.title}" deleted by ${req.user.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add comment to a task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addTaskComment = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment message cannot be empty',
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const comment = await Comment.create({
      task: task._id,
      user: req.user._id,
      message: message.trim(),
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'user',
      'name role email'
    );

    await ActivityLog.create({
      user: req.user._id,
      action: 'COMMENT_ADDED',
      entityType: 'COMMENT',
      entityId: task._id,
      description: `${req.user.name} commented on task "${task.title}"`,
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: populatedComment,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addTaskComment,
};

