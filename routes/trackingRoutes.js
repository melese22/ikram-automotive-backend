const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.post('/generate', authenticate, authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), trackingController.generate);
router.get('/job-card/:jobCardId', authenticate, authorize('SuperAdmin', 'WorkshopManager'), trackingController.getByJobCard);
router.delete('/:id', authenticate, authorize('SuperAdmin', 'WorkshopManager'), trackingController.deactivate);

router.get('/:token', trackingController.track);

module.exports = router;