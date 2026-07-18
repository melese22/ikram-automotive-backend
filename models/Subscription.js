const db = require('../config/database');

const PLANS = {
  free: { maxUsers: 3, maxVehicles: 50, features: ['basic'] },
  basic: { maxUsers: 10, maxVehicles: 200, features: ['basic', 'invoices', 'appointments'] },
  pro: { maxUsers: 50, maxVehicles: 1000, features: ['basic', 'invoices', 'appointments', 'reports', 'transfers'] },
  enterprise: { maxUsers: -1, maxVehicles: -1, features: ['all'] },
};

class Subscription {
  static async findByWorkshop(workshopId) {
    const { rows } = await db.query('SELECT * FROM subscriptions WHERE workshop_id = $1', [workshopId]);
    return rows[0] || null;
  }

  static async ensureForWorkshop(workshopId) {
    let sub = await this.findByWorkshop(workshopId);
    if (!sub) {
      const { rows } = await db.query(
        `INSERT INTO subscriptions (workshop_id, plan, status)
         VALUES ($1, 'free', 'active') RETURNING *`,
        [workshopId]
      );
      sub = rows[0];
    }
    if (sub.status !== 'cancelled' && new Date(sub.current_period_end) < new Date()) {
      const { rows } = await db.query(
        `UPDATE subscriptions SET status = 'expired', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [sub.id]
      );
      sub = rows[0];
    }
    return sub;
  }

  static async updatePlan(workshopId, plan, periodEnd) {
    const { rows } = await db.query(
      `UPDATE subscriptions SET plan = $1, status = 'active',
        current_period_start = NOW(), current_period_end = $2, updated_at = NOW()
       WHERE workshop_id = $3 RETURNING *`,
      [plan, periodEnd, workshopId]
    );
    return rows[0];
  }

  static async cancel(workshopId) {
    const { rows } = await db.query(
      `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW()
       WHERE workshop_id = $1 RETURNING *`,
      [workshopId]
    );
    return rows[0];
  }

  static getPlanLimits(plan) {
    return PLANS[plan] || PLANS.free;
  }
}

module.exports = Subscription;
