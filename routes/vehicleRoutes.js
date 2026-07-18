const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const schemas = require('../middlewares/schemas');

router.use(authenticate);

router.get('/search', vehicleController.search);
router.get('/mine', authorize('Customer'), vehicleController.getMyVehicles);

router.post('/', authorize('SuperAdmin', 'WorkshopManager'), validate(schemas.createVehicle), vehicleController.create);
router.get('/', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), vehicleController.getAll);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), vehicleController.getById);
router.get('/:id/history', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), vehicleController.getVehicleHistory);
router.put('/:id', authorize('SuperAdmin', 'WorkshopManager'), vehicleController.update);

module.exports = router;
