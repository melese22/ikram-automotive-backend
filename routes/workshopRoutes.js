const express = require('express');
const router = express.Router();
const workshopController = require('../controllers/workshopController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.get('/public', workshopController.getAll);

router.use(authenticate);

router.get('/overview', authorize('SuperAdmin'), workshopController.overview);
router.get('/', authorize('SuperAdmin'), workshopController.getAll);
router.post('/', authorize('SuperAdmin'), workshopController.create);
router.get('/:id', authorize('SuperAdmin'), workshopController.getById);
router.patch('/:id', authorize('SuperAdmin'), workshopController.update);

module.exports = router;