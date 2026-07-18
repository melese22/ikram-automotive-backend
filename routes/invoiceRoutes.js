const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const { validate } = require('../middlewares/validate');
const schemas = require('../middlewares/schemas');

router.post('/payment-callback', express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}), (req, res, next) => {
  const secret = process.env.CHAPA_SECRET_KEY || process.env.CHAPA_API_KEY;
  const signature = req.headers['x-chapa-signature'];
  if (!secret || !signature) {
    return res.status(400).json({ error: 'Missing webhook signature.' });
  }
  const expected = crypto.createHmac('sha512', secret).update(req.rawBody).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }
  next();
}, invoiceController.paymentCallback);

router.use(authenticate);

router.post('/generate', authorize('SuperAdmin', 'WorkshopManager'), validate(schemas.generateInvoice), invoiceController.generate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager'), invoiceController.getAll);
router.get('/mine', authorize('Customer'), invoiceController.getMyInvoices);
router.get('/job-card/:jobCardId', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), invoiceController.getByJobCard);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), invoiceController.getById);
router.get('/:id/pdf', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), invoiceController.downloadPDF);
router.patch('/:id/status', authorize('SuperAdmin', 'WorkshopManager'), invoiceController.updateStatus);
router.post('/:id/pay', authorize('SuperAdmin', 'WorkshopManager', 'Customer'), invoiceController.initiatePayment);
router.get('/:id/payment-status', authorize('SuperAdmin', 'WorkshopManager', 'Customer'), invoiceController.getPaymentStatus);

module.exports = router;