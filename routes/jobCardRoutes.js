const express = require('express');
const router = express.Router();
const jobCardController = require('../controllers/jobCardController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const schemas = require('../middlewares/schemas');

router.use(authenticate);

router.get('/active', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), jobCardController.getActive);
router.get('/mine', authorize('Customer'), jobCardController.getMyJobCards);

router.post('/', authorize('SuperAdmin', 'WorkshopManager'), validate(schemas.createJobCard), jobCardController.create);
router.get('/', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), jobCardController.getAll);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), jobCardController.getById);
router.put('/:id', authorize('SuperAdmin', 'WorkshopManager'), jobCardController.update);
router.patch('/:id/status', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), jobCardController.transitionStatus);
router.patch('/:id/assign', authorize('SuperAdmin', 'WorkshopManager'), jobCardController.assign);

module.exports = router;
