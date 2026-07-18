const db = require('../config/database');
const crypto = require('crypto');

class ReferralCode {
  static async create({ workshopId, customerId, rewardAmount, maxUses }) {
    const code = 'IKR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const { rows } = await db.query(
      `INSERT INTO referral_codes (code, workshop_id, customer_id, reward_amount, max_uses)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, workshopId, customerId, rewardAmount || 0, maxUses || 10]
    );
    return rows[0];
  }

  static async findByCode(code) {
    const { rows } = await db.query(
      'SELECT * FROM referral_codes WHERE code = $1 AND is_active = true AND current_uses < max_uses',
      [code.toUpperCase()]
    );
    return rows[0];
  }

  static async findByWorkshop(workshopId) {
    const { rows } = await db.query(
      `SELECT rc.*, u.name AS customer_name
       FROM referral_codes rc
       JOIN users u ON rc.customer_id = u.id
       WHERE rc.workshop_id = $1 ORDER BY rc.created_at DESC`,
      [workshopId]
    );
    return rows;
  }

  static async incrementUse(id) {
    const { rows } = await db.query(
      `UPDATE referral_codes SET current_uses = current_uses + 1, is_active = (current_uses + 1 < max_uses)
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

class LoyaltyPoints {
  static async add({ customerId, workshopId, points, reason, invoiceId }) {
    const { rows } = await db.query(
      `INSERT INTO loyalty_points (customer_id, workshop_id, points, reason, invoice_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customerId, workshopId, points, reason || null, invoiceId || null]
    );
    return rows[0];
  }

  static async getBalance(customerId, workshopId) {
    const { rows } = await db.query(
      'SELECT COALESCE(SUM(points), 0) AS balance FROM loyalty_points WHERE customer_id = $1 AND workshop_id = $2',
      [customerId, workshopId]
    );
    return parseInt(rows[0].balance, 10);
  }

  static async getHistory(customerId, workshopId) {
    const { rows } = await db.query(
      'SELECT * FROM loyalty_points WHERE customer_id = $1 AND workshop_id = $2 ORDER BY created_at DESC',
      [customerId, workshopId]
    );
    return rows;
  }
}

class Referral {
  static async create({ referralCodeId, referredCustomerId }) {
    const { rows } = await db.query(
      'INSERT INTO referrals (referral_code_id, referred_customer_id) VALUES ($1, $2) RETURNING *',
      [referralCodeId, referredCustomerId]
    );
    return rows[0];
  }

  static async findByWorkshop(workshopId) {
    const { rows } = await db.query(
      `SELECT r.*, rc.code, rc.reward_amount, u.name AS referred_name
       FROM referrals r
       JOIN referral_codes rc ON r.referral_code_id = rc.id
       JOIN users u ON r.referred_customer_id = u.id
       WHERE rc.workshop_id = $1 ORDER BY r.created_at DESC`,
      [workshopId]
    );
    return rows;
  }
}

module.exports = { ReferralCode, LoyaltyPoints, Referral };
