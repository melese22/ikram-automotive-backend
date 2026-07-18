const { ReferralCode, LoyaltyPoints, Referral } = require('../models/Loyalty');
const logger = require('../config/logger');

exports.createReferralCode = async (req, res) => {
  try {
    const { rewardAmount, maxUses } = req.body;
    const code = await ReferralCode.create({
      workshopId: req.user.workshop_id,
      customerId: req.user.id,
      rewardAmount: rewardAmount || 0,
      maxUses: maxUses || 10,
    });
    res.status(201).json({ message: 'Referral code created.', code });
  } catch (err) {
    logger.error({ err }, 'Create referral code error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listReferralCodes = async (req, res) => {
  try {
    const codes = await ReferralCode.findByWorkshop(req.user.workshop_id);
    res.json({ codes });
  } catch (err) {
    logger.error({ err }, 'List referral codes error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.listReferrals = async (req, res) => {
  try {
    const referrals = await Referral.findByWorkshop(req.user.workshop_id);
    res.json({ referrals });
  } catch (err) {
    logger.error({ err }, 'List referrals error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMyPoints = async (req, res) => {
  try {
    const balance = await LoyaltyPoints.getBalance(req.user.id, req.user.workshop_id);
    const history = await LoyaltyPoints.getHistory(req.user.id, req.user.workshop_id);
    res.json({ balance, history });
  } catch (err) {
    logger.error({ err }, 'Get loyalty points error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getCustomerPoints = async (req, res) => {
  try {
    const balance = await LoyaltyPoints.getBalance(req.params.customerId, req.user.workshop_id);
    const history = await LoyaltyPoints.getHistory(req.params.customerId, req.user.workshop_id);
    res.json({ balance, history });
  } catch (err) {
    logger.error({ err }, 'Get customer loyalty points error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.awardPoints = async (req, res) => {
  try {
    const { customerId, points, reason } = req.body;
    if (!customerId || !points) return res.status(400).json({ error: 'customerId and points are required.' });
    const entry = await LoyaltyPoints.add({
      customerId,
      workshopId: req.user.workshop_id,
      points: parseInt(points, 10),
      reason,
    });
    res.status(201).json({ message: 'Points awarded.', entry });
  } catch (err) {
    logger.error({ err }, 'Award points error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};
