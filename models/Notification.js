const db = require('../config/database');

class Notification {
  static async log({ jobCardId, recipientType, recipientAddress, subject, message, status, providerResponse, createdBy }) {
    const { rows } = await db.query(
      `INSERT INTO notification_log (job_card_id, recipient_type, recipient_address, subject, message, status, provider_response, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [jobCardId || null, recipientType, recipientAddress, subject || null, message, status || 'pending', providerResponse || null, createdBy]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM notification_log WHERE id = $1', [id]);
    return rows[0];
  }

  static async findByJobCard(jobCardId) {
    const { rows } = await db.query(
      `SELECT nl.*, u.name AS sent_by_name
       FROM notification_log nl
       JOIN users u ON nl.created_by = u.id
       WHERE nl.job_card_id = $1
       ORDER BY nl.created_at DESC`,
      [jobCardId]
    );
    return rows;
  }

  static async findAll(workshopId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await db.query(
      `SELECT nl.*, u.name AS sent_by_name,
              v.plate_number, v.make, v.model,
              COUNT(*) OVER() AS total_count
       FROM notification_log nl
       JOIN job_cards jc ON nl.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       JOIN users u ON nl.created_by = u.id
       WHERE jc.workshop_id = $1
       ORDER BY nl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [workshopId, limit, offset]
    );
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    return { rows, total };
  }

  static async updateStatus(id, status, providerResponse) {
    const { rows } = await db.query(
      `UPDATE notification_log SET status = $1::varchar, provider_response = $2,
        sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END
       WHERE id = $3 RETURNING *`,
      [status, providerResponse || null, id]
    );
    return rows[0];
  }
}

module.exports = Notification;