const db = require('../config/database');

class Part {
  static async create({ workshopId, name, sku, category, description, quantity, unitPrice, supplier, minStock }) {
    const { rows } = await db.query(
      `INSERT INTO parts_inventory (workshop_id, name, sku, category, description, quantity, unit_price, supplier, min_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [workshopId, name, sku, category || 'general', description || null, quantity || 0, unitPrice || 0, supplier || null, minStock || 5]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM parts_inventory WHERE id = $1', [id]);
    return rows[0];
  }

  static async findAllByWorkshop(workshopId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await db.query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM parts_inventory
       WHERE workshop_id = $1 AND is_active = true
       ORDER BY name ASC
       LIMIT $2 OFFSET $3`,
      [workshopId, limit, offset]
    );
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    return { rows, total };
  }

  static async search(workshopId, query) {
    const q = `%${query}%`;
    const { rows } = await db.query(
      `SELECT * FROM parts_inventory
       WHERE workshop_id = $1 AND is_active = true
         AND (name ILIKE $2 OR sku ILIKE $2 OR category ILIKE $2)
       ORDER BY name ASC
       LIMIT 20`,
      [workshopId, q]
    );
    return rows;
  }

  static async findByCategory(workshopId, category) {
    const { rows } = await db.query(
      `SELECT * FROM parts_inventory WHERE workshop_id = $1 AND category = $2 AND is_active = true ORDER BY name ASC`,
      [workshopId, category]
    );
    return rows;
  }

  static async getLowStock(workshopId) {
    const { rows } = await db.query(
      `SELECT * FROM parts_inventory WHERE workshop_id = $1 AND is_active = true AND quantity <= min_stock ORDER BY (quantity - min_stock) ASC`,
      [workshopId]
    );
    return rows;
  }

  static async getCategories(workshopId) {
    const { rows } = await db.query(
      `SELECT DISTINCT category FROM parts_inventory WHERE workshop_id = $1 AND is_active = true ORDER BY category`,
      [workshopId]
    );
    return rows.map(r => r.category);
  }

  static async adjustStock(id, delta) {
    const { rows } = await db.query(
      `UPDATE parts_inventory SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 AND quantity + $1 >= 0 RETURNING *`,
      [delta, id]
    );
    return rows[0];
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE parts_inventory SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async deactivate(id) {
    const { rows } = await db.query(
      `UPDATE parts_inventory SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Part;