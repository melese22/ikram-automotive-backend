const Subscription = require('../models/Subscription');

async function checkSubscription(req, res, next) {
  if (!req.user || !req.user.workshop_id) return next();
  try {
    const sub = await Subscription.ensureForWorkshop(req.user.workshop_id);
    if (sub.status === 'expired' || sub.status === 'cancelled') {
      return res.status(403).json({
        error: 'Workshop subscription is inactive. Please renew your plan.',
        subscription_status: sub.status,
      });
    }
    req.subscription = sub;
    next();
  } catch {
    next();
  }
}

module.exports = { checkSubscription };
