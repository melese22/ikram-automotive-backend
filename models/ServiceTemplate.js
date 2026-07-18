const db = require('../config/database');

class ServiceTemplate {
  static async create({ workshopId, name, description, category, basePrice, estimatedMinutes }) {
    const { rows } = await db.query(
      `INSERT INTO service_templates (workshop_id, name, description, category, base_price, estimated_minutes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [workshopId, name, description || null, category || null, basePrice || null, estimatedMinutes || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM service_templates WHERE id = $1', [id]);
    return rows[0];
  }

  static async findByWorkshop(workshopId, includeInactive = false) {
    let query = 'SELECT * FROM service_templates WHERE workshop_id = $1';
    if (!includeInactive) query += ' AND is_active = true';
    query += ' ORDER BY category, name';
    const { rows } = await db.query(query, [workshopId]);
    return rows;
  }

  static async findPublicByWorkshop(workshopId) {
    const { rows } = await db.query(
      'SELECT id, name, description, category, base_price, estimated_minutes FROM service_templates WHERE workshop_id = $1 AND is_active = true ORDER BY category, name',
      [workshopId]
    );
    return rows;
  }

  static async findAllPublic() {
    const { rows } = await db.query(
      `SELECT st.id, st.name, st.description, st.category, st.base_price, st.estimated_minutes,
              w.name AS workshop_name, w.id AS workshop_id
       FROM service_templates st
       JOIN workshops w ON st.workshop_id = w.id
       WHERE st.is_active = true AND w.is_active = true
       ORDER BY st.category, st.name`
    );
    return rows;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE service_templates SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query('DELETE FROM service_templates WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
}

module.exports = ServiceTemplate;
