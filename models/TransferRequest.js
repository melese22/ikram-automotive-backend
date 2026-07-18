const db = require('../config/database');

class TransferRequest {
  static async create({ partId, fromWorkshopId, toWorkshopId, quantity, requestedBy, notes }) {
    const { rows } = await db.query(
      `INSERT INTO transfer_requests (part_id, from_workshop_id, to_workshop_id, quantity, requested_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [partId, fromWorkshopId, toWorkshopId, quantity, requestedBy, notes || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT tr.*, p.name AS part_name, p.sku AS part_sku,
              fw.name AS from_workshop_name, tw.name AS to_workshop_name,
              ru.name AS requested_by_name
       FROM transfer_requests tr
       JOIN parts_inventory p ON tr.part_id = p.id
       JOIN workshops fw ON tr.from_workshop_id = fw.id
       JOIN workshops tw ON tr.to_workshop_id = tw.id
       JOIN users ru ON tr.requested_by = ru.id
       WHERE tr.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByWorkshop(workshopId, status) {
    let query = `SELECT tr.*, p.name AS part_name, p.sku AS part_sku,
                        fw.name AS from_workshop_name, tw.name AS to_workshop_name,
                        ru.name AS requested_by_name
                 FROM transfer_requests tr
                 JOIN parts_inventory p ON tr.part_id = p.id
                 JOIN workshops fw ON tr.from_workshop_id = fw.id
                 JOIN workshops tw ON tr.to_workshop_id = tw.id
                 JOIN users ru ON tr.requested_by = ru.id
                 WHERE (tr.from_workshop_id = $1 OR tr.to_workshop_id = $1)`;
    const params = [workshopId];
    if (status) {
      params.push(status);
      query += ` AND tr.status = $2`;
    }
    query += ` ORDER BY tr.created_at DESC`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async updateStatus(id, status, reviewedBy) {
    const { rows } = await db.query(
      `UPDATE transfer_requests SET status = $1, reviewed_by = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, reviewedBy, id]
    );
    return rows[0];
  }
}

module.exports = TransferRequest;
