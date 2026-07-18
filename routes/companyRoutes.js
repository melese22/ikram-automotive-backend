const express = require('express');
const router = express.Router();
const controller = require('../controllers/companyController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);
router.post('/', authorize('CorporateAdmin'), controller.create);
router.get('/me', authorize('CorporateAdmin'), controller.getMy);
router.get('/workshops', authorize('CorporateAdmin'), controller.getWorkshops);
router.get('/reports', authorize('CorporateAdmin'), controller.getReports);
router.patch('/', authorize('CorporateAdmin'), controller.update);

module.exports = router;
