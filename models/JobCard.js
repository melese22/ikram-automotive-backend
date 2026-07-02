const db = require('../config/database');

const VALID_TRANSITIONS = {
  PENDING: ['DIAGNOSTIC'],
  DIAGNOSTIC: ['IN_PROGRESS'],
  IN_PROGRESS: ['TEST_DRIVE'],
  TEST_DRIVE: ['COMPLETED'],
};

class JobCard {
  static async create({ vehicleId, description, createdBy, workshopId }) {
    const { rows } = await db.query(
      `INSERT INTO job_cards (vehicle_id, description, created_by, workshop_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [vehicleId, description || null, createdBy, workshopId]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT jc.*,
              v.plate_number, v.make, v.model, v.year, v.vin, v.customer_id,
              u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
              me.name AS mechanic_name
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN users u ON v.customer_id = u.id
       LEFT JOIN users me ON jc.assigned_to = me.id
       WHERE jc.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findAllByWorkshop(workshopId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await db.query(
      `SELECT jc.*,
              v.plate_number, v.make, v.model, v.year, v.vin,
              u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
              me.name AS mechanic_name,
              COUNT(*) OVER() AS total_count
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN users u ON v.customer_id = u.id
       LEFT JOIN users me ON jc.assigned_to = me.id
       WHERE jc.workshop_id = $1
       ORDER BY jc.created_at DESC
       LIMIT $2 OFFSET $3`,
      [workshopId, limit, offset]
    );
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    return { rows, total };
  }

  static async findActiveByWorkshop(workshopId) {
    const { rows } = await db.query(
      `SELECT jc.*,
              v.plate_number, v.make, v.model, v.year, v.vin,
              u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email,
              me.name AS mechanic_name
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN users u ON v.customer_id = u.id
       LEFT JOIN users me ON jc.assigned_to = me.id
       WHERE jc.workshop_id = $1 AND jc.status != 'COMPLETED'
       ORDER BY
         CASE jc.status
           WHEN 'PENDING' THEN 1
           WHEN 'DIAGNOSTIC' THEN 2
           WHEN 'IN_PROGRESS' THEN 3
           WHEN 'TEST_DRIVE' THEN 4
         END,
         jc.created_at ASC`,
      [workshopId]
    );
    return rows;
  }

  static async findByCustomer(customerId) {
    const { rows } = await db.query(
      `SELECT jc.*,
              v.plate_number, v.make, v.model, v.year
       FROM job_cards jc
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE v.customer_id = $1
       ORDER BY jc.created_at DESC`,
      [customerId]
    );
    return rows;
  }

  static async transitionStatus(id, newStatus) {
    const jobCard = await this.findById(id);
    if (!jobCard) throw new Error('Job card not found');

    const allowed = VALID_TRANSITIONS[jobCard.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid transition from ${jobCard.status} to ${newStatus}`);
    }

    const updateFields = { status: newStatus };
    if (newStatus === 'IN_PROGRESS') {
      updateFields.started_at = new Date();
    }
    if (newStatus === 'COMPLETED') {
      updateFields.completed_at = new Date();
    }

    const keys = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE job_cards SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async assign(id, userId) {
    const { rows } = await db.query(
      `UPDATE job_cards SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [userId, id]
    );
    return rows[0];
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE job_cards SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }
}

module.exports = JobCard;
