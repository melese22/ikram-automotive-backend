const TrackingToken = require('../models/TrackingToken');
const JobCard = require('../models/JobCard');
const Notification = require('../models/Notification');
const { Milestone, MilestoneTask } = require('../models/Milestone');
const Media = require('../models/Media');
const { getFileUrl } = require('../config/s3');
const { sendNotification } = require('../services/notificationService');

exports.track = async (req, res) => {
  try {
    const { token } = req.params;
    const record = await TrackingToken.findByToken(token);
    if (!record) {
      return res.status(404).json({ error: 'Tracking link not found or expired.' });
    }

    await TrackingToken.touch(token);

    const jobCard = await JobCard.findById(record.job_card_id);
    if (!jobCard) {
      return res.status(404).json({ error: 'Job card not found.' });
    }

    const milestones = await Milestone.findByJobCard(record.job_card_id);
    const enrichedMilestones = await Promise.all(
      milestones.map(async (m) => {
        const tasks = await MilestoneTask.findByMilestone(m.id);
        return { ...m, tasks };
      })
    );

    const mediaList = await Media.findByJobCard(record.job_card_id);
    const enrichedMedia = await Promise.all(
      mediaList.map(async (m) => {
        try {
          const fileUrl = await getFileUrl(m.file_key);
          const thumbUrl = m.thumbnail_key ? await getFileUrl(m.thumbnail_key) : null;
          return { ...m, fileUrl, thumbUrl };
        } catch {
          return { ...m, fileUrl: null, thumbUrl: null };
        }
      })
    );

    res.json({
      jobCard,
      milestones: enrichedMilestones,
      media: enrichedMedia,
    });
  } catch (err) {
    console.error('Tracking error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.generate = async (req, res) => {
  try {
    const { jobCardId } = req.body;
    if (!jobCardId) {
      return res.status(400).json({ error: 'jobCardId is required.' });
    }

    const existing = await TrackingToken.findByJobCard(jobCardId);
    const active = existing.find(t => t.is_active && (!t.expires_at || new Date(t.expires_at) > new Date()));

    if (active) {
      return res.json({
        message: 'Active tracking link already exists.',
        tracking: active,
        trackingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${active.token}`,
      });
    }

    const tracking = await TrackingToken.generate(jobCardId, req.user.id);
    const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${tracking.token}`;

    try {
      const jobCard = await JobCard.findById(jobCardId);
      if (jobCard?.customer_phone) {
        const msg = `Ikram Automotive: Track your ${jobCard.make} ${jobCard.model} progress here: ${trackingUrl}`;
        const log = await Notification.log({
          jobCardId,
          recipientType: 'sms',
          recipientAddress: jobCard.customer_phone,
          subject: 'Tracking Link',
          message: msg,
          createdBy: req.user.id,
        });
        const result = await sendNotification({ type: 'sms', to: jobCard.customer_phone, message: msg });
        await Notification.updateStatus(log.id, result.success ? 'sent' : 'failed', result.response || result.error);
      }
    } catch (_) {
      console.warn('Failed to send SMS notification for tracking link (provider not configured).');
    }

    res.status(201).json({
      message: 'Tracking link generated and sent via SMS.',
      tracking,
      trackingUrl,
    });
  } catch (err) {
    console.error('Generate tracking error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getByJobCard = async (req, res) => {
  try {
    const tokens = await TrackingToken.findByJobCard(req.params.jobCardId);
    res.json({ trackingTokens: tokens });
  } catch (err) {
    console.error('Get tracking tokens error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deactivate = async (req, res) => {
  try {
    const token = await TrackingToken.deactivate(req.params.id);
    if (!token) return res.status(404).json({ error: 'Tracking token not found.' });
    res.json({ message: 'Tracking link deactivated.', token });
  } catch (err) {
    console.error('Deactivate tracking error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};