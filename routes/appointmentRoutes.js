const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const schemas = require('../middlewares/schemas');

router.get('/public-slots', appointmentController.getPublicSlots);
router.post('/public-book', validate(schemas.publicBook), appointmentController.publicBook);

router.use(authenticate);

router.get('/mine', authorize('Customer'), appointmentController.getMyAppointments);
router.get('/slots', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), appointmentController.getAvailableSlots);
router.post('/book', authorize('Customer'), appointmentController.customerBook);
router.post('/', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), validate(schemas.createAppointment), appointmentController.create);
router.get('/', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), appointmentController.getAll);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), appointmentController.getById);
router.patch('/:id/status', authorize('SuperAdmin', 'WorkshopManager'), appointmentController.updateStatus);
router.patch('/:id', authorize('SuperAdmin', 'WorkshopManager'), appointmentController.update);
router.delete('/:id', authorize('SuperAdmin', 'WorkshopManager'), appointmentController.delete);

module.exports = router;