const FieldCheckIn = require('../models/FieldCheckIn');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create a new field check-in with GPS photo & coordinates
// @route   POST /api/field-checkins
// @access  Private (Employee or Admin)
const createCheckIn = async (req, res, next) => {
  try {
    const {
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

    const checkIn = await FieldCheckIn.create({
      employee: req.user._id,
      photo,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : 0,
      address: address || 'Remote Field Location',
      city: city || '',
      state: state || '',
      country: country || 'India',
      purpose: purpose || 'CLIENT_VISIT',
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
    await ActivityLog.create({
      user: req.user._id,
      action: 'FIELD_CHECKIN',
      entityType: 'EMPLOYEE',
      entityId: checkIn._id,
      description: `${req.user.name} logged field check-in at ${locDescription} (${purpose?.replace('_', ' ') || 'Out of Office'})`,
    });

    // Notify administrators
    try {
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: 'Field Check-in Received',
          message: `${req.user.name} checked in from ${locDescription} (${purpose?.replace('_', ' ') || 'Field Work'}).`,
          relatedEntityType: 'EMPLOYEE',
          relatedEntityId: req.user._id,
        });
      }
    } catch (notifErr) {
      console.warn('[Notification] Could not send admin notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Field check-in recorded successfully with live GPS watermark',
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
    const { employee, purpose, startDate, endDate, limit = 50 } = req.query;

    const query = {};

    if (employee && employee !== 'ALL') {
      query.employee = employee;
    }

    if (purpose && purpose !== 'ALL') {
      query.purpose = purpose;
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
    const checkIns = await FieldCheckIn.find({ employee: req.user._id })
      .populate('project', 'title')
      .populate('task', 'title')
      .sort({ timestamp: -1 })
      .limit(30)
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
  getCheckInById,
};

