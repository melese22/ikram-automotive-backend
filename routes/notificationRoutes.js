const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);

router.post('/send', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), notificationController.send);
router.post('/status/:jobCardId', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), notificationController.sendStatusUpdate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager'), notificationController.getAll);
router.get('/job-card/:jobCardId', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), notificationController.getByJobCard);

module.exports = router;