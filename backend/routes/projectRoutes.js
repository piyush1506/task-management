const express = require('express');
const router = express.Router();
const {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getProjects)
  .post(protect, authorize('ADMIN'), createProject);

router.route('/:id')
  .get(protect, getProjectById)
  .put(protect, authorize('ADMIN'), updateProject)
  .delete(protect, authorize('ADMIN'), deleteProject);

module.exports = router;

