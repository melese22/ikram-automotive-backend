const express = require('express');
const router = express.Router();
const controller = require('../controllers/loyaltyController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);
router.post('/referral-codes', authorize('SuperAdmin', 'WorkshopManager', 'Customer'), controller.createReferralCode);
router.get('/referral-codes', authorize('SuperAdmin', 'WorkshopManager'), controller.listReferralCodes);
router.get('/referrals', authorize('SuperAdmin', 'WorkshopManager'), controller.listReferrals);
router.get('/my-points', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), controller.getMyPoints);
router.get('/customer/:customerId/points', authorize('SuperAdmin', 'WorkshopManager'), controller.getCustomerPoints);
router.post('/award-points', authorize('SuperAdmin', 'WorkshopManager'), controller.awardPoints);

module.exports = router;
