const db = require('../config/database');

class Workshop {
  static async create({ name, address, phone, email }) {
    const { rows } = await db.query(
      `INSERT INTO workshops (name, address, phone, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, address || null, phone || null, email || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM workshops WHERE id = $1', [id]);
    return rows[0];
  }

  static async findAll() {
    const { rows } = await db.query('SELECT * FROM workshops WHERE is_active = true ORDER BY name');
    return rows;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE workshops SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }
  static async getStats(id) {
    const [users, jobCards, vehicles, appointments, revenue] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count, role, COUNT(*) FILTER (WHERE is_active = true)::int AS active
                FROM users WHERE workshop_id = $1 GROUP BY role`, [id]),
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status != 'COMPLETED')::int AS active,
                      COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
                FROM job_cards WHERE workshop_id = $1`, [id]),
      db.query(`SELECT COUNT(*)::int AS count FROM vehicles WHERE workshop_id = $1`, [id]),
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE scheduled_date >= CURRENT_DATE AND status NOT IN ('cancelled','no_show','completed'))::int AS upcoming
                FROM appointments WHERE workshop_id = $1`, [id]),
      db.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total_revenue
                FROM invoices WHERE workshop_id = $1 AND status = 'PAID'`, [id]),
    ]);

    return {
      users: users.rows,
      jobCards: jobCards.rows[0],
      vehicles: vehicles.rows[0].count,
      appointments: appointments.rows[0],
      revenue: revenue.rows[0],
    };
  }

  static async findAllWithStats(limit = 50, offset = 0) {
    const { rows } = await db.query(
      `SELECT id, name, address, phone, email, is_active, created_at
       FROM workshops ORDER BY name LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }
}

module.exports = Workshop;
