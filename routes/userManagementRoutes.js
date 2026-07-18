const express = require('express');
const router = express.Router();
const controller = require('../controllers/userManagementController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager'), controller.list);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager'), controller.getById);
router.post('/', authorize('SuperAdmin', 'WorkshopManager'), controller.create);
router.patch('/:id', authorize('SuperAdmin', 'WorkshopManager'), controller.update);
router.patch('/:id/toggle-active', authorize('SuperAdmin', 'WorkshopManager'), controller.toggleActive);

module.exports = router;
