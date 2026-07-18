const express = require('express');
const router = express.Router();
const controller = require('../controllers/workshopSettingsController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager'), controller.get);
router.put('/', authorize('SuperAdmin', 'WorkshopManager'), controller.update);

module.exports = router;
