const JobCard = require('../models/JobCard');
const Notification = require('../models/Notification');
const { sendNotification } = require('../services/notificationService');

exports.create = async (req, res) => {
  try {
    const { vehicleId, description } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'vehicleId is required.' });
    }

    const jobCard = await JobCard.create({
      vehicleId,
      description,
      createdBy: req.user.id,
      workshopId: req.user.workshop_id,
    });

    res.status(201).json({ message: 'Job card created successfully.', jobCard });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Referenced vehicle or user does not exist.' });
    }
    console.error('Create job card error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await JobCard.findAllByWorkshop(req.user.workshop_id, { limit, offset });
    res.json({ jobCards: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get job cards error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getActive = async (req, res) => {
  try {
    const jobCards = await JobCard.findActiveByWorkshop(req.user.workshop_id);
    res.json({ jobCards });
  } catch (err) {
    console.error('Get active job cards error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const jobCard = await JobCard.findById(req.params.id);
    if (!jobCard) {
      return res.status(404).json({ error: 'Job card not found.' });
    }
    res.json({ jobCard });
  } catch (err) {
    console.error('Get job card error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const STATUS_LABELS = {
  PENDING: 'Pending',
  DIAGNOSTIC: 'Under Diagnostic',
  IN_PROGRESS: 'In Progress',
  TEST_DRIVE: 'Test Drive',
  COMPLETED: 'Completed',
};

exports.transitionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Target status is required.' });
    }

    const jobCard = await JobCard.transitionStatus(req.params.id, status);

    if (jobCard) {
      const fullCard = await JobCard.findById(jobCard.id);
      notifyStatusUpdate(fullCard, req.user.id).catch(err => console.error('Auto-notify error:', err));
    }

    res.json({ message: `Job card transitioned to ${status}.`, jobCard });
  } catch (err) {
    if (err.message.includes('Invalid transition') || err.message.includes('not found')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('Transition status error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

async function notifyStatusUpdate(jobCard, userId) {
  if (!jobCard.customer_phone) return;

  const msg = `Ikram Automotive: Your ${jobCard.make} ${jobCard.model} is now "${STATUS_LABELS[jobCard.status] || jobCard.status}".`;

  const log = await Notification.log({
    jobCardId: jobCard.id,
    recipientType: 'sms',
    recipientAddress: jobCard.customer_phone,
    subject: `Status Update — ${STATUS_LABELS[jobCard.status]}`,
    message: msg,
    createdBy: userId,
  });

  const result = await sendNotification({ type: 'sms', to: jobCard.customer_phone, message: msg });
  await Notification.updateStatus(log.id, result.success ? 'sent' : 'failed', result.response || result.error);
}

exports.assign = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const jobCard = await JobCard.assign(req.params.id, userId);
    if (!jobCard) {
      return res.status(404).json({ error: 'Job card not found.' });
    }

    res.json({ message: 'Job card assigned successfully.', jobCard });
  } catch (err) {
    console.error('Assign job card error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ['description'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const jobCard = await JobCard.update(req.params.id, updates);
    if (!jobCard) {
      return res.status(404).json({ error: 'Job card not found.' });
    }

    res.json({ message: 'Job card updated successfully.', jobCard });
  } catch (err) {
    console.error('Update job card error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMyJobCards = async (req, res) => {
  try {
    const jobCards = await JobCard.findByCustomer(req.user.id);
    res.json({ jobCards });
  } catch (err) {
    console.error('Get my job cards error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
