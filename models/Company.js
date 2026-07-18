const db = require('../config/database');

class Company {
  static async create({ name, ownerId, phone, email, address }) {
    const { rows } = await db.query(
      `INSERT INTO companies (name, owner_id, phone, email, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, ownerId, phone || null, email || null, address || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
    return rows[0];
  }

  static async findByOwner(ownerId) {
    const { rows } = await db.query('SELECT * FROM companies WHERE owner_id = $1', [ownerId]);
    return rows[0];
  }

  static async getWorkshops(companyId) {
    const { rows } = await db.query(
      `SELECT w.*,
        (SELECT COUNT(*) FROM users u WHERE u.workshop_id = w.id) AS user_count,
        (SELECT COUNT(*) FROM job_cards jc WHERE jc.workshop_id = w.id AND jc.status IN ('PENDING','IN_PROGRESS')) AS active_jobs
       FROM workshops w WHERE w.company_id = $1 ORDER BY w.created_at DESC`,
      [companyId]
    );
    return rows;
  }

  static async getReports(companyId) {
    const { rows: revenue } = await db.query(
      `SELECT w.id, w.name, COALESCE(SUM(i.total), 0) AS revenue, COUNT(i.id) AS invoice_count
       FROM workshops w
       LEFT JOIN invoices i ON i.workshop_id = w.id AND i.status = 'PAID'
       WHERE w.company_id = $1
       GROUP BY w.id, w.name ORDER BY revenue DESC`,
      [companyId]
    );
    const { rows: jobs } = await db.query(
      `SELECT w.id, w.name, COUNT(jc.id) AS total_jobs,
        COUNT(jc.id) FILTER (WHERE jc.status = 'COMPLETED') AS completed
       FROM workshops w
       LEFT JOIN job_cards jc ON jc.workshop_id = w.id
       WHERE w.company_id = $1
       GROUP BY w.id, w.name ORDER BY total_jobs DESC`,
      [companyId]
    );
    return { revenue, jobs };
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE companies SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }
}

module.exports = Company;
