const express = require('express');
const router = express.Router();
const {
  getProjectReports,
  getTaskReports,
  getEmployeePerformance,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('ADMIN'));

router.get('/projects', getProjectReports);
router.get('/tasks', getTaskReports);
router.get('/employees', getEmployeePerformance);

module.exports = router;

