const Notification = require('../models/Notification');
const JobCard = require('../models/JobCard');
const TrackingToken = require('../models/TrackingToken');
const { sendNotification } = require('../services/notificationService');

exports.send = async (req, res) => {
  try {
    const { jobCardId, type, to, subject, message } = req.body;

    if (!jobCardId || !type || !to || !message) {
      return res.status(400).json({ error: 'jobCardId, type (sms/email), to, and message are required.' });
    }

    const log = await Notification.log({
      jobCardId,
      recipientType: type,
      recipientAddress: to,
      subject,
      message,
      createdBy: req.user.id,
    });

    const result = await sendNotification({ type, to, subject, message });

    const status = result.success ? 'sent' : 'failed';
    const updated = await Notification.updateStatus(log.id, status, result.response || result.error);

    if (!result.success) {
      return res.status(502).json({ error: `Notification failed: ${result.error}`, notification: updated });
    }

    res.json({ message: 'Notification sent.', notification: updated });
  } catch (err) {
    console.error('Send notification error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.sendStatusUpdate = async (req, res) => {
  try {
    const { jobCardId } = req.params;
    const { type } = req.body;

    if (!type || !['sms', 'email'].includes(type)) {
      return res.status(400).json({ error: 'Valid type (sms or email) is required.' });
    }

    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) return res.status(404).json({ error: 'Job card not found.' });

    const customerPhone = jobCard.customer_phone;
    const to = type === 'sms' ? customerPhone : (jobCard.customer_email || customerPhone);

    const tokens = await TrackingToken.findByJobCard(jobCardId);
    const activeToken = tokens.find(t => t.is_active && (!t.expires_at || new Date(t.expires_at) > new Date()));
    const tokenStr = activeToken?.token || '';

    const statusLabels = {
      PENDING: 'Pending',
      DIAGNOSTIC: 'Under Diagnostic',
      IN_PROGRESS: 'In Progress',
      TEST_DRIVE: 'Test Drive',
      COMPLETED: 'Completed',
    };

    const message = `Ikram Automotive Update: Your ${jobCard.make} ${jobCard.model} (${jobCard.plate_number || ''}) is now "${statusLabels[jobCard.status] || jobCard.status}". Track progress: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${tokenStr}`;

    const log = await Notification.log({
      jobCardId,
      recipientType: type,
      recipientAddress: to,
      subject: `Job Card Status Update — ${statusLabels[jobCard.status] || jobCard.status}`,
      message,
      createdBy: req.user.id,
    });

    const result = await sendNotification({ type, to, subject: log.subject, message });

    const status = result.success ? 'sent' : 'failed';
    const updated = await Notification.updateStatus(log.id, status, result.response || result.error);

    if (!result.success) {
      return res.status(502).json({ error: `Notification failed: ${result.error}`, notification: updated });
    }

    res.json({ message: 'Status update sent.', notification: updated });
  } catch (err) {
    console.error('Send status update error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getByJobCard = async (req, res) => {
  try {
    const notifications = await Notification.findByJobCard(req.params.jobCardId);
    res.json({ notifications });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await Notification.findAll(req.user.workshop_id, { limit, offset });
    res.json({ notifications: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get all notifications error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};