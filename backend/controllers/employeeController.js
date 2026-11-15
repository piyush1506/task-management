const User = require('../models/User');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get all employees with task stats
// @route   GET /api/employees
// @access  Private (Admin only)
const getEmployees = async (req, res, next) => {
  try {
    const { search, status, department } = req.query;

    const query = { role: 'EMPLOYEE' };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const employees = await User.find(query).sort({ createdAt: -1 }).lean();

    // Attach dynamic task statistics for each employee
    const enrichedEmployees = await Promise.all(
      employees.map(async (emp) => {
        const [assignedTasks, completedTasks] = await Promise.all([
          Task.countDocuments({ assignedTo: emp._id }),
          Task.countDocuments({ assignedTo: emp._id, status: 'COMPLETED' }),
        ]);

        return {
          ...emp,
          assignedTasks,
          completedTasks,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedEmployees.length,
      employees: enrichedEmployees,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new employee
// @route   POST /api/employees
// @access  Private (Admin only)
const createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, phone, designation, department, joiningDate } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields',
      });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this email address already exists',
      });
    }

    const employee = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      phone: phone || '',
      designation: designation || 'Team Member',
      department: department || 'Engineering',
      joiningDate: joiningDate || Date.now(),
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    });

    // Activity Log
    await ActivityLog.create({
      user: req.user._id,
      action: 'EMPLOYEE_CREATED',
      entityType: 'EMPLOYEE',
      entityId: employee._id,
      description: `Admin registered new employee: ${employee.name} (${employee.email})`,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        designation: employee.designation,
        department: employee.department,
        role: employee.role,
        status: employee.status,
        joiningDate: employee.joiningDate,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single employee details
// @route   GET /api/employees/:id
// @access  Private (Admin only)
const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await User.findById(req.params.id).lean();

    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    const tasks = await Task.find({ assignedTo: employee._id })
      .populate('project', 'title status deadline')
      .sort({ deadline: 1 })
      .lean();

    const assignedTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;

    res.status(200).json({
      success: true,
      employee: {
        ...employee,
        stats: {
          assignedTasks,
          completedTasks,
          pendingTasks,
          inProgressTasks,
        },
        tasks,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update employee details
// @route   PUT /api/employees/:id
// @access  Private (Admin only)
const updateEmployee = async (req, res, next) => {
  try {
    const { name, phone, designation, department, status, email, password } = req.body;

    const employee = await User.findById(req.params.id);
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    if (email && email.trim().toLowerCase() !== employee.email) {
      const emailExists = await User.findOne({ email: email.trim().toLowerCase() });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already in use by another account',
        });
      }
      employee.email = email.trim().toLowerCase();
    }

    if (name) employee.name = name.trim();
    if (phone !== undefined) employee.phone = phone;
    if (designation) employee.designation = designation;
    if (department) employee.department = department;
    if (status) employee.status = status;
    if (password) employee.password = password; // Will trigger pre('save') hash

    await employee.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'EMPLOYEE',
      entityId: employee._id,
      description: `Admin updated employee details for: ${employee.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      employee,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle employee active/inactive status
// @route   PATCH /api/employees/:id/status
// @access  Private (Admin only)
const toggleEmployeeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE or INACTIVE',
      });
    }

    const employee = await User.findById(req.params.id);
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    employee.status = status;
    await employee.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'EMPLOYEE_STATUS_CHANGED',
      entityType: 'EMPLOYEE',
      entityId: employee._id,
      description: `Admin changed status of ${employee.name} to ${status}`,
    });

    res.status(200).json({
      success: true,
      message: `Employee status changed to ${status}`,
      employee,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin only)
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee || employee.role !== 'EMPLOYEE') {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Reassign or unassign tasks
    await Task.updateMany({ assignedTo: employee._id }, { $unset: { assignedTo: 1 } });
    await employee.deleteOne();

    await ActivityLog.create({
      user: req.user._id,
      action: 'EMPLOYEE_DELETED',
      entityType: 'EMPLOYEE',
      entityId: employee._id,
      description: `Admin deleted employee: ${employee.name}`,
    });

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
};

