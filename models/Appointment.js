const db = require('../config/database');

class Appointment {
  static async create({ workshopId, customerId, vehicleId, title, scheduledDate, startTime, endTime, notes, createdBy }) {
    const { rows } = await db.query(
      `INSERT INTO appointments (workshop_id, customer_id, vehicle_id, title, scheduled_date, start_time, end_time, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [workshopId, customerId, vehicleId, title, scheduledDate, startTime, endTime, notes || null, createdBy]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT a.*, u.name AS customer_name, u.phone AS customer_phone,
              v.plate_number, v.make, v.model, v.year
       FROM appointments a
       JOIN users u ON a.customer_id = u.id
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByWorkshop(workshopId, date, { limit = 20, offset = 0 } = {}) {
    let query = `SELECT a.*, u.name AS customer_name, u.phone AS customer_phone,
                        v.plate_number, v.make, v.model, v.year,
                        COUNT(*) OVER() AS total_count
                 FROM appointments a
                 JOIN users u ON a.customer_id = u.id
                 JOIN vehicles v ON a.vehicle_id = v.id
                 WHERE a.workshop_id = $1`;
    const params = [workshopId];

    if (date) {
      query += ` AND a.scheduled_date = $2`;
      params.push(date);
    }

    query += ` ORDER BY a.scheduled_date ASC, a.start_time ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows } = await db.query(query, params);
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    return { rows, total };
  }

  static async findByCustomer(customerId) {
    const { rows } = await db.query(
      `SELECT a.*, v.plate_number, v.make, v.model, v.year
       FROM appointments a
       JOIN vehicles v ON a.vehicle_id = v.id
       WHERE a.customer_id = $1
       ORDER BY a.scheduled_date DESC, a.start_time DESC`,
      [customerId]
    );
    return rows;
  }

  static async findByVehicle(vehicleId) {
    const { rows } = await db.query(
      `SELECT * FROM appointments WHERE vehicle_id = $1 ORDER BY scheduled_date DESC`,
      [vehicleId]
    );
    return rows;
  }

  static async updateStatus(id, status) {
    const { rows } = await db.query(
      `UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return rows[0];
  }

  static async update(id, fields) {
    const allowed = ['title', 'scheduled_date', 'start_time', 'end_time', 'notes', 'vehicle_id'];
    const updates = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) updates[key] = fields[key];
    }
    const keys = Object.keys(updates);
    if (keys.length === 0) return null;

    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map(k => updates[k]);
    const { rows } = await db.query(
      `UPDATE appointments SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async getSlots(workshopId, date) {
    const { rows } = await db.query(
      `SELECT start_time, end_time FROM appointments
       WHERE workshop_id = $1 AND scheduled_date = $2 AND status NOT IN ('cancelled', 'no_show')
       ORDER BY start_time ASC`,
      [workshopId, date]
    );
    return rows;
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM appointments WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Appointment;