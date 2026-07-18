const Subscription = require('../models/Subscription');
const logger = require('../config/logger');

exports.get = async (req, res) => {
  try {
    const sub = await Subscription.ensureForWorkshop(req.user.workshop_id);
    const limits = Subscription.getPlanLimits(sub.plan);
    res.json({ subscription: sub, limits });
  } catch (err) {
    logger.error({ err }, 'Get subscription error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.upgrade = async (req, res) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'basic', 'pro', 'enterprise'];
    if (!plan || !validPlans.includes(plan)) {
      return res.status(400).json({ error: `Plan must be one of: ${validPlans.join(', ')}` });
    }
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    const sub = await Subscription.updatePlan(req.user.workshop_id, plan, periodEnd);
    const limits = Subscription.getPlanLimits(plan);
    res.json({ message: `Upgraded to ${plan}.`, subscription: sub, limits });
  } catch (err) {
    logger.error({ err }, 'Upgrade subscription error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.cancel = async (req, res) => {
  try {
    const sub = await Subscription.cancel(req.user.workshop_id);
    if (!sub) return res.status(404).json({ error: 'No subscription found.' });
    res.json({ message: 'Subscription cancelled.', subscription: sub });
  } catch (err) {
    logger.error({ err }, 'Cancel subscription error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};
