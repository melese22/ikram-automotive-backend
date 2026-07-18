const db = require('../config/database');

class Vehicle {
  static async create({ plateNumber, chassisNumber, make, model, year, vin, mileage, customerId, workshopId, vehicleType, batteryCapacity, batterySoc, batteryHealth, motorType, firmwareVersion }) {
    const { rows } = await db.query(
      `INSERT INTO vehicles (plate_number, chassis_number, make, model, year, vin, mileage, customer_id, workshop_id, vehicle_type, battery_capacity, battery_soc, battery_health, motor_type, firmware_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [plateNumber || null, chassisNumber || null, make, model, year || null, vin || null, mileage || null, customerId, workshopId, vehicleType || 'ICE', batteryCapacity || null, batterySoc || null, batteryHealth || null, motorType || null, firmwareVersion || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT v.*, u.name AS customer_name, u.phone AS customer_phone
       FROM vehicles v
       JOIN users u ON v.customer_id = u.id
       WHERE v.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findAllByWorkshop(workshopId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await db.query(
      `SELECT v.*, u.name AS customer_name, u.phone AS customer_phone,
              COUNT(*) OVER() AS total_count
       FROM vehicles v
       JOIN users u ON v.customer_id = u.id
       WHERE v.workshop_id = $1
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [workshopId, limit, offset]
    );
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    return { rows, total };
  }

  static async findAllByCustomer(customerId) {
    const { rows } = await db.query(
      'SELECT * FROM vehicles WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return rows;
  }

  static async getServiceHistory(vehicleId) {
    const { rows } = await db.query(
      `SELECT jc.id, jc.status, jc.description, jc.created_at, jc.completed_at,
              u.name AS mechanic_name
       FROM job_cards jc
       LEFT JOIN users u ON jc.assigned_to = u.id
       WHERE jc.vehicle_id = $1
       ORDER BY jc.created_at DESC`,
      [vehicleId]
    );
    return rows;
  }

  static async search(query, workshopId) {
    const searchTerm = `%${query}%`;
    const { rows } = await db.query(
      `SELECT v.*, u.name AS customer_name, u.phone AS customer_phone
       FROM vehicles v
       JOIN users u ON v.customer_id = u.id
       WHERE v.workshop_id = $1
         AND (v.plate_number ILIKE $2 OR v.chassis_number ILIKE $2 OR v.vin ILIKE $2 OR u.phone ILIKE $2)
       ORDER BY v.created_at DESC
       LIMIT 20`,
      [workshopId, searchTerm]
    );
    return rows;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE vehicles SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }
}

module.exports = Vehicle;
