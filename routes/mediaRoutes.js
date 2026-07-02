const express = require('express');
const router = express.Router();
const multer = require('multer');
const mediaController = require('../controllers/mediaController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF'), false);
    }
  },
});

router.use(authenticate);

router.post('/upload', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), upload.single('file'), mediaController.upload);
router.post('/upload-multiple', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), upload.array('files', 20), mediaController.uploadMultiple);
router.get('/job-card/:jobCardId', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), mediaController.getByJobCard);
router.get('/:id', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic', 'Customer'), mediaController.getById);
router.patch('/:id/tags', authorize('SuperAdmin', 'WorkshopManager', 'Mechanic'), mediaController.updateTags);
router.delete('/:id', authorize('SuperAdmin', 'WorkshopManager'), mediaController.delete);

module.exports = router;