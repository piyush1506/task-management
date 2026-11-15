const express = require('express');
const router = express.Router();
const {
  getEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
} = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');

// All employee routes are restricted to ADMIN
router.use(protect, authorize('ADMIN'));

router.route('/')
  .get(getEmployees)
  .post(createEmployee);

router.route('/:id')
  .get(getEmployeeById)
  .put(updateEmployee)
  .delete(deleteEmployee);

router.patch('/:id/status', toggleEmployeeStatus);

module.exports = router;

