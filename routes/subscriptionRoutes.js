const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscriptionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager'), controller.get);
router.post('/upgrade', authorize('SuperAdmin', 'WorkshopManager'), controller.upgrade);
router.post('/cancel', authorize('SuperAdmin', 'WorkshopManager'), controller.cancel);

module.exports = router;
