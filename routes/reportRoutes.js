const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);

router.get('/dashboard', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), reportController.dashboard);
router.get('/revenue', authorize('SuperAdmin', 'WorkshopManager'), reportController.revenueReport);
router.get('/mechanics', authorize('SuperAdmin', 'WorkshopManager'), reportController.mechanicProductivity);
router.get('/services', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), reportController.commonServices);
router.get('/parts', authorize('SuperAdmin', 'WorkshopManager'), reportController.partsUsage);
router.get('/appointments', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), reportController.appointmentStats);

module.exports = router;