const db = require('../config/database');

class WorkshopSettings {
  static async findByWorkshop(workshopId) {
    const { rows } = await db.query('SELECT * FROM workshop_settings WHERE workshop_id = $1', [workshopId]);
    return rows[0] || null;
  }

  static async upsert(workshopId, fields) {
    const existing = await this.findByWorkshop(workshopId);
    if (existing) {
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const { rows } = await db.query(
        `UPDATE workshop_settings SET ${setClause}, updated_at = NOW() WHERE workshop_id = $1 RETURNING *`,
        [workshopId, ...values]
      );
      return rows[0];
    } else {
      const keys = ['workshop_id', ...Object.keys(fields)];
      const values = [workshopId, ...Object.values(fields)];
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await db.query(
        `INSERT INTO workshop_settings (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return rows[0];
    }
  }
}

module.exports = WorkshopSettings;
