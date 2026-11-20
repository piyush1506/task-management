const express = require('express');
const router = express.Router();
const {
  createCheckIn,
  getAllCheckIns,
  getMyCheckIns,
  getCurrentStatus,
  getCheckInById,
} = require('../controllers/fieldCheckInController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .post(createCheckIn)
  .get(authorize('ADMIN'), getAllCheckIns);

router.get('/status', getCurrentStatus);
router.get('/my', getMyCheckIns);
router.get('/:id', getCheckInById);

module.exports = router;

