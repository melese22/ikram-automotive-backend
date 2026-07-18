const express = require('express');
const router = express.Router();
const controller = require('../controllers/serviceController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.get('/public', controller.getPublicAll);
router.get('/public/:workshopId', controller.getPublicByWorkshop);

router.use(authenticate);
router.get('/', authorize('SuperAdmin', 'WorkshopManager'), controller.list);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager'), controller.getById);
router.post('/', authorize('SuperAdmin', 'WorkshopManager'), controller.create);
router.patch('/:id', authorize('SuperAdmin', 'WorkshopManager'), controller.update);
router.delete('/:id', authorize('SuperAdmin', 'WorkshopManager'), controller.remove);

module.exports = router;
