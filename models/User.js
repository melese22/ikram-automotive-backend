const db = require('../config/database');

class User {
  static async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  }

  static async findByPhone(phone) {
    const { rows } = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, role, workshop_id, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0];
  }

  static async create({ name, email, phone, passwordHash, role, workshopId }) {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, workshop_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role, workshop_id, created_at`,
      [name, email || null, phone, passwordHash, role || 'Customer', workshopId || null]
    );
    return rows[0];
  }

  static async findByWorkshop(workshopId, role) {
    let query = `SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE workshop_id = $1`;
    const params = [workshopId];
    if (role) {
      query += ` AND role = $2`;
      params.push(role);
    }
    query += ` ORDER BY created_at DESC`;
    const { rows } = await db.query(query, params);
    return rows;
  }

  static async findAllByWorkshop(workshopId) {
    const { rows } = await db.query(
      `SELECT id, name, email, phone, role, is_active, created_at
       FROM users WHERE workshop_id = $1 ORDER BY created_at DESC`,
      [workshopId]
    );
    return rows;
  }

  static async findByResetToken(token) {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
      [token]
    );
    return rows[0];
  }

  static async setResetToken(id, token, expiresAt) {
    const { rows } = await db.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW()
       WHERE id = $3 RETURNING id, name, email, phone, role, workshop_id`,
      [token, expiresAt, id]
    );
    return rows[0];
  }

  static async updatePassword(id, passwordHash) {
    const { rows } = await db.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW()
       WHERE id = $2 RETURNING id, name, email, phone, role, workshop_id`,
      [passwordHash, id]
    );
    return rows[0];
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING id, name, email, phone, role, workshop_id`,
      [id, ...values]
    );
    return rows[0];
  }
}

module.exports = User;
