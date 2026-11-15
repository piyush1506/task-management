const express = require('express');
const router = express.Router();
const { getAdminDashboard, getEmployeeDashboard } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

router.get('/admin', protect, authorize('ADMIN'), getAdminDashboard);
router.get('/employee', protect, getEmployeeDashboard);

module.exports = router;

