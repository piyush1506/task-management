const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  updateTaskStatus,
  updateTaskDeadline,
  deleteTask,
  addTaskComment,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getTasks)
  .post(protect, authorize('ADMIN'), createTask);

router.route('/:id')
  .get(protect, getTaskById)
  .put(protect, authorize('ADMIN'), updateTask)
  .delete(protect, authorize('ADMIN'), deleteTask);

router.patch('/:id/status', protect, updateTaskStatus);
router.patch('/:id/deadline', protect, updateTaskDeadline);
router.post('/:id/comments', protect, addTaskComment);

// Subtask management routes
router.post('/:id/subtasks', protect, addSubtask);
router.patch('/:id/subtasks/:subtaskId', protect, toggleSubtask);
router.delete('/:id/subtasks/:subtaskId', protect, deleteSubtask);

module.exports = router;

