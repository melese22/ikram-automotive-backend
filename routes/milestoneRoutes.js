const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestoneController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

router.use(authenticate);

router.post('/', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), milestoneController.createMilestone);
router.get('/job-card/:jobCardId', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), milestoneController.getMilestones);

router.post('/:milestoneId/tasks', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), milestoneController.createTask);
router.get('/:milestoneId/tasks', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), milestoneController.getTasks);
router.put('/tasks/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), milestoneController.updateTask);
router.patch('/tasks/:id/status', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), milestoneController.transitionTask);
router.delete('/tasks/:id', authorize('SuperAdmin', 'WorkshopManager'), milestoneController.deleteTask);

router.put('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), milestoneController.updateMilestone);
router.patch('/:id/status', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), milestoneController.transitionMilestone);
router.delete('/:id', authorize('SuperAdmin', 'WorkshopManager'), milestoneController.deleteMilestone);

module.exports = router;