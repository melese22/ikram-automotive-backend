const db = require('../config/database');

class PartUsed {
  static async create({ jobCardId, partId, quantity, unitPriceAtUse }) {
    const { rows } = await db.query(
      `INSERT INTO parts_used (job_card_id, part_id, quantity, unit_price_at_use)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [jobCardId, partId, quantity, unitPriceAtUse]
    );
    return rows[0];
  }

  static async findByJobCard(jobCardId) {
    const { rows } = await db.query(
      `SELECT pu.*, p.name AS part_name, p.sku AS part_sku
       FROM parts_used pu
       JOIN parts_inventory p ON pu.part_id = p.id
       WHERE pu.job_card_id = $1
       ORDER BY pu.created_at ASC`,
      [jobCardId]
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT pu.*, p.name AS part_name, p.sku AS part_sku, p.unit_price
       FROM parts_used pu
       JOIN parts_inventory p ON pu.part_id = p.id
       WHERE pu.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM parts_used WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }

  static async totalForJobCard(jobCardId) {
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(quantity * unit_price_at_use), 0) AS total FROM parts_used WHERE job_card_id = $1`,
      [jobCardId]
    );
    return parseFloat(rows[0].total);
  }
}

module.exports = PartUsed;