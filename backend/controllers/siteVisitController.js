const SiteVisit = require('../models/SiteVisit');
const FieldCheckIn = require('../models/FieldCheckIn');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Record a new destination / site visit during the day
// @route   POST /api/site-visits
// @access  Private (Employee or Admin)
const createSiteVisit = async (req, res, next) => {
  try {
    const {
      destinationName,
      contactPerson,
      contactPhone,
      purpose,
      workDone,
      photo,
      latitude,
      longitude,
      accuracy,
      address,
      city,
      state,
      project,
      task,
    } = req.body;

    if (!destinationName || !workDone || !photo || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Destination name, work summary, photo, and GPS coordinates are required.',
      });
    }

    // Determine stop number for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayVisitsCount = await SiteVisit.countDocuments({
      employee: req.user._id,
      timestamp: { $gte: startOfToday },
    });
    const stopNumber = todayVisitsCount + 1;

    const siteVisit = await SiteVisit.create({
      employee: req.user._id,
      destinationName: destinationName.trim(),
      contactPerson: contactPerson?.trim() || '',
      contactPhone: contactPhone?.trim() || '',
      purpose: purpose || 'CLIENT_MEETING',
      workDone: workDone.trim(),
      photo,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy ? parseFloat(accuracy) : 0,
      address: address || '',
      city: city || '',
      state: state || '',
      stopNumber,
      project: project || null,
      task: task || null,
      timestamp: new Date(),
    });

    const populated = await SiteVisit.findById(siteVisit._id)
      .populate('employee', 'name email designation department phone')
      .populate('project', 'title')
      .populate('task', 'title');

    // Create activity audit log
    await ActivityLog.create({
      user: req.user._id,
      action: 'SITE_VISIT_LOGGED',
      entityType: 'EMPLOYEE',
      entityId: siteVisit._id,
      description: `${req.user.name} logged Stop #${stopNumber}: ${destinationName} (${purpose?.replace(/_/g, ' ') || 'Client Visit'})`,
    });

    // Notify administrators
    try {
      const admins = await User.find({ role: 'ADMIN' });
      for (const admin of admins) {
        await Notification.create({
          user: admin._id,
          title: `New Site Visit Logged: ${destinationName}`,
          message: `${req.user.name} recorded Stop #${stopNumber} at ${destinationName} (${city || 'Local Site'}).`,
          relatedEntityType: 'EMPLOYEE',
          relatedEntityId: req.user._id,
        });
      }
    } catch (notifErr) {
      console.warn('[Notification] Error creating notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Stop #${stopNumber} at "${destinationName}" saved successfully`,
      siteVisit: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current employee's destination visits
// @route   GET /api/site-visits/my
// @access  Private (Employee or Admin)
const getMySiteVisits = async (req, res, next) => {
  try {
    const { date, limit = 50 } = req.query;
    const query = { employee: req.user._id };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: start, $lte: end };
    }

    const visits = await SiteVisit.find(query)
      .populate('project', 'title')
      .populate('task', 'title')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.status(200).json({
      success: true,
      count: visits.length,
      visits,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all destination visits (Admin only)
// @route   GET /api/site-visits
// @access  Private (Admin only)
const getAllSiteVisits = async (req, res, next) => {
  try {
    const { employee, date, purpose, limit = 100 } = req.query;
    const query = {};

    if (employee && employee !== 'ALL') {
      query.employee = employee;
    }

    if (purpose && purpose !== 'ALL') {
      query.purpose = purpose;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: start, $lte: end };
    }

    const visits = await SiteVisit.find(query)
      .populate('employee', 'name email designation department phone')
      .populate('project', 'title')
      .populate('task', 'title')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.status(200).json({
      success: true,
      count: visits.length,
      visits,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get full day itinerary route (Check-in, all site visits, check-out)
// @route   GET /api/site-visits/daily-route
// @access  Private (Employee or Admin)
const getDailyRoute = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'ADMIN' && req.query.employee
      ? req.query.employee
      : req.user._id;

    const targetDateStr = req.query.date || new Date().toISOString().split('T')[0];
    const start = new Date(targetDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDateStr);
    end.setHours(23, 59, 59, 999);

    // Fetch attendance check-ins and check-outs for this day
    const attendance = await FieldCheckIn.find({
      employee: employeeId,
      timestamp: { $gte: start, $lte: end },
    }).sort({ timestamp: 1 }).lean();

    // Fetch all site visits for this day
    const visits = await SiteVisit.find({
      employee: employeeId,
      timestamp: { $gte: start, $lte: end },
    }).sort({ timestamp: 1 }).lean();

    // Combine into chronological itinerary
    const itinerary = [];

    attendance.forEach((att) => {
      itinerary.push({
        id: att._id,
        kind: 'ATTENDANCE',
        type: att.type, // 'CHECK_IN' or 'CHECK_OUT'
        title: att.type === 'CHECK_IN' ? 'Duty Check-In' : 'Duty Check-Out',
        subtitle: att.city || 'Office / Field Start',
        address: att.address,
        latitude: att.latitude,
        longitude: att.longitude,
        timestamp: att.timestamp,
        photo: att.photo,
        purpose: att.purpose,
        notes: att.notes,
      });
    });

    visits.forEach((v) => {
      itinerary.push({
        id: v._id,
        kind: 'SITE_VISIT',
        stopNumber: v.stopNumber,
        title: `Stop #${v.stopNumber}: ${v.destinationName}`,
        subtitle: v.contactPerson ? `Contact: ${v.contactPerson}` : v.city,
        destinationName: v.destinationName,
        contactPerson: v.contactPerson,
        contactPhone: v.contactPhone,
        address: v.address,
        latitude: v.latitude,
        longitude: v.longitude,
        timestamp: v.timestamp,
        photo: v.photo,
        purpose: v.purpose,
        workDone: v.workDone,
      });
    });

    // Sort chronologically
    itinerary.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.status(200).json({
      success: true,
      date: targetDateStr,
      employeeId,
      stopsCount: visits.length,
      itinerary,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSiteVisit,
  getMySiteVisits,
  getAllSiteVisits,
  getDailyRoute,
};

