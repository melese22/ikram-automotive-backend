const express = require('express');
const router = express.Router();
const controller = require('../controllers/transferController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager'), controller.list);
router.post('/', authorize('SuperAdmin', 'WorkshopManager'), controller.create);
router.patch('/:id/approve', authorize('SuperAdmin', 'WorkshopManager'), controller.approve);
router.patch('/:id/reject', authorize('SuperAdmin', 'WorkshopManager'), controller.reject);
router.patch('/:id/complete', authorize('SuperAdmin', 'WorkshopManager'), controller.complete);

module.exports = router;
