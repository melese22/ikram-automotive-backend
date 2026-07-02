const crypto = require('crypto');
const db = require('../config/database');

class TrackingToken {
  static async generate(jobCardId, createdBy, expiresInDays) {
    if (expiresInDays === undefined) {
      expiresInDays = parseInt(process.env.TRACKING_TOKEN_EXPIRY_DAYS) || 90;
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const { rows } = await db.query(
      `INSERT INTO tracking_tokens (job_card_id, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [jobCardId, token, expiresAt, createdBy]
    );
    return rows[0];
  }

  static async findByToken(token) {
    const { rows } = await db.query(
      `SELECT tt.*, jc.status AS job_card_status
       FROM tracking_tokens tt
       JOIN job_cards jc ON tt.job_card_id = jc.id
       WHERE tt.token = $1 AND tt.is_active = true
         AND (tt.expires_at IS NULL OR tt.expires_at > NOW())`,
      [token]
    );
    return rows[0];
  }

  static async findByJobCard(jobCardId) {
    const { rows } = await db.query(
      `SELECT * FROM tracking_tokens WHERE job_card_id = $1 ORDER BY created_at DESC`,
      [jobCardId]
    );
    return rows;
  }

  static async touch(token) {
    const { rows } = await db.query(
      `UPDATE tracking_tokens SET last_accessed_at = NOW() WHERE token = $1 RETURNING *`,
      [token]
    );
    return rows[0];
  }

  static async deactivate(id) {
    const { rows } = await db.query(
      `UPDATE tracking_tokens SET is_active = false WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = TrackingToken;