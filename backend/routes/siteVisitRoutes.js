const express = require('express');
const router = express.Router();
const {
  createSiteVisit,
  getMySiteVisits,
  getAllSiteVisits,
  getDailyRoute,
} = require('../controllers/siteVisitController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .post(createSiteVisit)
  .get(authorize('ADMIN'), getAllSiteVisits);

router.get('/my', getMySiteVisits);
router.get('/daily-route', getDailyRoute);

module.exports = router;

