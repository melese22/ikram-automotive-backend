const db = require('../config/database');

class Media {
  static async create({ jobCardId, fileKey, thumbnailKey, originalName, mimeType, size, category, tags, uploadedBy }) {
    const { rows } = await db.query(
      `INSERT INTO media_assets (job_card_id, file_key, thumbnail_key, original_name, mime_type, size, category, tags, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [jobCardId, fileKey, thumbnailKey || null, originalName, mimeType, size, category || 'image', tags || [], uploadedBy]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT ma.*, u.name AS uploaded_by_name
       FROM media_assets ma
       JOIN users u ON ma.uploaded_by = u.id
       WHERE ma.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByJobCard(jobCardId) {
    const { rows } = await db.query(
      `SELECT ma.*, u.name AS uploaded_by_name
       FROM media_assets ma
       JOIN users u ON ma.uploaded_by = u.id
       WHERE ma.job_card_id = $1
       ORDER BY ma.created_at DESC`,
      [jobCardId]
    );
    return rows;
  }

  static async findByTags(jobCardId, tags) {
    const { rows } = await db.query(
      `SELECT ma.*, u.name AS uploaded_by_name
       FROM media_assets ma
       JOIN users u ON ma.uploaded_by = u.id
       WHERE ma.job_card_id = $1 AND ma.tags && $2
       ORDER BY ma.created_at DESC`,
      [jobCardId, tags]
    );
    return rows;
  }

  static async updateTags(id, tags) {
    const { rows } = await db.query(
      `UPDATE media_assets SET tags = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [tags, id]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM media_assets WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = Media;