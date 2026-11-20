const FieldCheckIn = require('../models/FieldCheckIn');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create a new field check-in or check-out with GPS photo & coordinates
// @route   POST /api/field-checkins
// @access  Private (Employee or Admin)
const createCheckIn = async (req, res, next) => {
  try {
    const {
      type,
      photo,
      latitude,
      longitude,
      accuracy,
      address,
      city,
      state,
      country,
      purpose,
      notes,
      project,
      task,
    } = req.body;

    if (!photo || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Photo and live GPS coordinates (latitude, longitude) are required',
      });
    }

    const checkType = type === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN';

    const checkIn = await FieldCheckIn.create({
      employee: req.user._id,
      type: checkType,
      photo,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : 0,
      address: address || 'Remote Field Location',
      city: city || '',
      state: state || '',
      country: country || 'India',
      purpose: purpose || (checkType === 'CHECK_OUT' ? 'SHIFT_END' : 'CLIENT_VISIT'),
      notes: notes || '',
      project: project || null,
      task: task || null,
      timestamp: new Date(),
    });

    const populatedCheckIn = await FieldCheckIn.findById(checkIn._id)
      .populate('employee', 'name email designation department phone')
      .populate('project', 'title')
      .populate('task', 'title');

    // Create activity audit log
    const locDescription = city ? `${city}, ${state || ''}` : `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
    const actionLabel = checkType === 'CHECK_OUT' ? 'Check-out' : 'Check-in';
    const auditAction = checkType === 'CHECK_OUT' ? 'FIELD_CHECKOUT' : 'FIELD_CHECKIN';

    await ActivityLog.create({
      user: req.user._id,
      action: auditAction,
      entityType: 'EMPLOYEE',
      entityId: checkIn._id,
      description: `${req.user.name} logged field ${actionLabel.toLowerCase()} at ${locDescription} (${purpose?.replace('_', ' ') || 'Out of Office'})`,
    });

    // Notify administrators
    try {
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: `Field ${actionLabel} Logged`,
          message: `${req.user.name} ${actionLabel.toLowerCase()} at ${locDescription} (${purpose?.replace('_', ' ') || 'Field Work'}).`,
          relatedEntityType: 'EMPLOYEE',
          relatedEntityId: req.user._id,
        });
      }
    } catch (notifErr) {
      console.warn('[Notification] Could not send admin notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Field ${actionLabel.toLowerCase()} recorded successfully with live GPS watermark`,
      checkIn: populatedCheckIn,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all field check-ins (Admin only)
// @route   GET /api/field-checkins
// @access  Private (Admin only)
const getAllCheckIns = async (req, res, next) => {
  try {
    const { employee, purpose, type, startDate, endDate, limit = 100 } = req.query;

    const query = {};

    if (employee && employee !== 'ALL') {
      query.employee = employee;
    }

    if (purpose && purpose !== 'ALL') {
      query.purpose = purpose;
    }

    if (type && type !== 'ALL') {
      query.type = type;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }

    const checkIns = await FieldCheckIn.find(query)
      .populate('employee', 'name email designation department phone')
      .populate('project', 'title')
      .populate('task', 'title')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.status(200).json({
      success: true,
      count: checkIns.length,
      checkIns,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current employee's check-in history
// @route   GET /api/field-checkins/my
// @access  Private (Employee or Admin)
const getMyCheckIns = async (req, res, next) => {
  try {
    const { type, limit = 50 } = req.query;
    const query = { employee: req.user._id };

    if (type && type !== 'ALL') {
      query.type = type;
    }

    const checkIns = await FieldCheckIn.find(query)
      .populate('project', 'title')
      .populate('task', 'title')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.status(200).json({
      success: true,
      count: checkIns.length,
      checkIns,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current employee's live attendance status (Checked In vs Checked Out)
// @route   GET /api/field-checkins/status
// @access  Private (Employee or Admin)
const getCurrentStatus = async (req, res, next) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayRecords = await FieldCheckIn.find({
      employee: req.user._id,
      timestamp: { $gte: startOfToday },
    })
      .sort({ timestamp: -1 })
      .lean();

    const lastRecord = todayRecords[0] || null;
    let currentStatus = 'NOT_CHECKED_IN';

    if (lastRecord) {
      currentStatus = lastRecord.type === 'CHECK_IN' ? 'CHECKED_IN' : 'CHECKED_OUT';
    }

    // Find first check in of today
    const checkInsToday = todayRecords.filter((r) => r.type === 'CHECK_IN');
    const checkOutsToday = todayRecords.filter((r) => r.type === 'CHECK_OUT');

    const firstCheckIn = checkInsToday.length > 0 ? checkInsToday[checkInsToday.length - 1] : null;
    const lastCheckOut = checkOutsToday.length > 0 ? checkOutsToday[0] : null;

    // Calculate approximate work minutes today
    let totalWorkMinutes = 0;
    if (firstCheckIn) {
      const endTime = lastCheckOut && currentStatus === 'CHECKED_OUT'
        ? new Date(lastCheckOut.timestamp)
        : new Date();
      totalWorkMinutes = Math.max(0, Math.round((endTime - new Date(firstCheckIn.timestamp)) / 60000));
    }

    res.status(200).json({
      success: true,
      currentStatus,
      todaySummary: {
        firstCheckIn,
        lastCheckOut,
        totalWorkMinutes,
        recordsCount: todayRecords.length,
      },
      lastRecord,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single field check-in by ID
// @route   GET /api/field-checkins/:id
// @access  Private
const getCheckInById = async (req, res, next) => {
  try {
    const checkIn = await FieldCheckIn.findById(req.params.id)
      .populate('employee', 'name email designation department phone')
      .populate('project', 'title')
      .populate('task', 'title')
      .lean();

    if (!checkIn) {
      return res.status(404).json({
        success: false,
        message: 'Field check-in record not found',
      });
    }

    // Security check: Employee can only view their own
    if (
      req.user.role === 'EMPLOYEE' &&
      checkIn.employee._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only view your own check-ins',
      });
    }

    res.status(200).json({
      success: true,
      checkIn,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCheckIn,
  getAllCheckIns,
  getMyCheckIns,
  getCurrentStatus,
  getCheckInById,
};

