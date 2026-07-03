const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.post('/payment-callback', invoiceController.paymentCallback);

router.use(authenticate);

router.post('/generate', authorize('SuperAdmin', 'WorkshopManager'), invoiceController.generate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), invoiceController.getAll);
router.get('/mine', authorize('Customer'), invoiceController.getMyInvoices);
router.get('/job-card/:jobCardId', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), invoiceController.getByJobCard);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), invoiceController.getById);
router.patch('/:id/status', authorize('SuperAdmin', 'WorkshopManager'), invoiceController.updateStatus);
router.post('/:id/pay', authorize('SuperAdmin', 'WorkshopManager', 'Customer'), invoiceController.initiatePayment);
router.get('/:id/payment-status', authorize('SuperAdmin', 'WorkshopManager', 'Customer'), invoiceController.getPaymentStatus);

module.exports = router;