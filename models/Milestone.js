const db = require('../config/database');

class Milestone {
  static async create({ jobCardId, title, description, sortOrder, assignedTo }) {
    const { rows } = await db.query(
      `INSERT INTO milestones (job_card_id, title, description, sort_order, assigned_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [jobCardId, title, description || null, sortOrder || 0, assignedTo || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT m.*, u.name AS assigned_name
       FROM milestones m
       LEFT JOIN users u ON m.assigned_to = u.id
       WHERE m.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByJobCard(jobCardId) {
    const { rows } = await db.query(
      `SELECT m.*, u.name AS assigned_name
       FROM milestones m
       LEFT JOIN users u ON m.assigned_to = u.id
       WHERE m.job_card_id = $1
       ORDER BY m.sort_order ASC, m.created_at ASC`,
      [jobCardId]
    );
    return rows;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE milestones SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async transitionStatus(id, newStatus) {
    const updateFields = { status: newStatus };
    if (newStatus === 'IN_PROGRESS') updateFields.started_at = new Date();
    if (newStatus === 'COMPLETED' || newStatus === 'SKIPPED') updateFields.completed_at = new Date();

    const keys = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE milestones SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM milestones WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

class MilestoneTask {
  static async create({ milestoneId, title, description, sortOrder, assignedTo }) {
    const { rows } = await db.query(
      `INSERT INTO milestone_tasks (milestone_id, title, description, sort_order, assigned_to)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [milestoneId, title, description || null, sortOrder || 0, assignedTo || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT t.*, u.name AS assigned_name
       FROM milestone_tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByMilestone(milestoneId) {
    const { rows } = await db.query(
      `SELECT t.*, u.name AS assigned_name
       FROM milestone_tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.milestone_id = $1
       ORDER BY t.sort_order ASC, t.created_at ASC`,
      [milestoneId]
    );
    return rows;
  }

  static async update(id, fields) {
    const keys = Object.keys(fields);
    const values = Object.values(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE milestone_tasks SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async transitionStatus(id, newStatus) {
    const updateFields = { status: newStatus };
    if (newStatus === 'COMPLETED' || newStatus === 'SKIPPED') updateFields.completed_at = new Date();

    const keys = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE milestone_tasks SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM milestone_tasks WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }
}

module.exports = { Milestone, MilestoneTask };