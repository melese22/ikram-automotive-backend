const express = require('express');
const router = express.Router();
const partController = require('../controllers/partController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);

router.get('/search', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), partController.search);
router.get('/low-stock', authorize('SuperAdmin', 'WorkshopManager'), partController.lowStock);
router.get('/categories', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), partController.categories);

router.post('/', authorize('SuperAdmin', 'WorkshopManager'), partController.create);
router.get('/', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), partController.getAll);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), partController.getById);
router.put('/:id', authorize('SuperAdmin', 'WorkshopManager'), partController.update);
router.patch('/:id/stock', authorize('SuperAdmin', 'WorkshopManager'), partController.adjustStock);
router.delete('/:id', authorize('SuperAdmin', 'WorkshopManager'), partController.deactivate);

router.post('/:jobCardId/use', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), partController.usePart);
router.get('/:jobCardId/used', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), partController.getPartsUsed);
router.delete('/used/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), partController.removeUsedPart);

module.exports = router;