const db = require('../config/database');
const logger = require('../config/logger');

exports.dashboard = async (req, res) => {
  try {
    const ws = req.user.workshop_id;

    const [activeJobs, totalCustomers, totalVehicles, revenueData, statusCounts, recentJobs, topMechanics] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM job_cards WHERE workshop_id = $1 AND status != 'COMPLETED'`, [ws]),
      db.query(`SELECT COUNT(*)::int AS count FROM users WHERE workshop_id = $1 AND role = 'Customer'`, [ws]),
      db.query(`SELECT COUNT(*)::int AS count FROM vehicles WHERE workshop_id = $1`, [ws]),
      db.query(`SELECT COALESCE(SUM(total),0)::float AS total, COUNT(*)::int AS invoice_count FROM invoices WHERE workshop_id = $1 AND status = 'PAID'`, [ws]),
      db.query(`SELECT status, COUNT(*)::int AS count FROM job_cards WHERE workshop_id = $1 GROUP BY status`, [ws]),
      db.query(`SELECT jc.id, jc.status, jc.created_at, u.name AS customer_name, v.make, v.model, v.plate_number
                FROM job_cards jc
                JOIN vehicles v ON jc.vehicle_id = v.id
                JOIN users u ON v.customer_id = u.id
                WHERE jc.workshop_id = $1 ORDER BY jc.created_at DESC LIMIT 10`, [ws]),
      db.query(`SELECT u.id, u.name, COUNT(jc.id)::int AS jobs_completed
                FROM users u LEFT JOIN job_cards jc ON jc.assigned_to = u.id AND jc.status = 'COMPLETED'
                WHERE u.workshop_id = $1 AND u.role IN ('Mechanic','WorkshopManager')
                GROUP BY u.id, u.name ORDER BY jobs_completed DESC`, [ws]),
    ]);

    res.json({
      activeJobs: activeJobs.rows[0].count,
      totalCustomers: totalCustomers.rows[0].count,
      totalVehicles: totalVehicles.rows[0].count,
      revenue: revenueData.rows[0],
      statusBreakdown: statusCounts.rows,
      recentJobCards: recentJobs.rows,
      topMechanics: topMechanics.rows,
    });
  } catch (err) {
    logger.error({ err }, 'Dashboard error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.revenueReport = async (req, res) => {
  try {
    const ws = req.user.workshop_id;
    const { startDate, endDate, groupBy } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD).' });
    }

    const trunc = groupBy === 'month' ? 'month' : 'day';
    const interval = groupBy === 'month' ? '1 month' : '1 day';

    const { rows } = await db.query(
      `SELECT DATE_TRUNC($1, paid_at) AS period,
              COUNT(*)::int AS invoice_count,
              COALESCE(SUM(total),0)::float AS revenue
       FROM invoices
       WHERE workshop_id = $2 AND status = 'PAID' AND paid_at BETWEEN $3 AND $4
       GROUP BY period ORDER BY period ASC`,
      [trunc, ws, startDate, endDate]
    );

    res.json({ report: rows, startDate, endDate, groupBy: groupBy || 'day' });
  } catch (err) {
    logger.error({ err }, 'Revenue report error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.mechanicProductivity = async (req, res) => {
  try {
    const ws = req.user.workshop_id;
    const { startDate, endDate } = req.query;

    const { rows } = await db.query(
      `SELECT u.id, u.name,
              COUNT(jc.id)::int AS jobs_completed,
              COALESCE(AVG(EXTRACT(EPOCH FROM (jc.completed_at - jc.created_at))/3600),0)::float AS avg_hours
       FROM users u
       LEFT JOIN job_cards jc ON jc.assigned_to = u.id AND jc.status = 'COMPLETED'
         AND ($1::date IS NULL OR jc.completed_at >= $1::timestamp)
         AND ($2::date IS NULL OR jc.completed_at <= $2::timestamp + interval '1 day')
       WHERE u.workshop_id = $3 AND u.role IN ('Mechanic','WorkshopManager')
       GROUP BY u.id, u.name ORDER BY jobs_completed DESC`,
      [startDate || null, endDate || null, ws]
    );

    res.json({ mechanics: rows });
  } catch (err) {
    logger.error({ err }, 'Mechanic productivity error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.commonServices = async (req, res) => {
  try {
    const ws = req.user.workshop_id;

    const { rows } = await db.query(
      `SELECT LOWER(description) AS service, COUNT(*)::int AS count
       FROM job_cards WHERE workshop_id = $1 AND description IS NOT NULL AND description != ''
       GROUP BY service ORDER BY count DESC LIMIT 20`,
      [ws]
    );

    res.json({ services: rows });
  } catch (err) {
    logger.error({ err }, 'Common services error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.partsUsage = async (req, res) => {
  try {
    const ws = req.user.workshop_id;

    const { rows } = await db.query(
      `SELECT pu.part_id, pu.part_name, pu.part_sku, SUM(pu.quantity)::int AS total_used,
              COALESCE(SUM(pu.quantity * pu.unit_price_at_use),0)::float AS total_cost
       FROM parts_used pu
       JOIN job_cards jc ON pu.job_card_id = jc.id
       WHERE jc.workshop_id = $1
       GROUP BY pu.part_id, pu.part_name, pu.part_sku
       ORDER BY total_used DESC LIMIT 20`,
      [ws]
    );

    res.json({ parts: rows });
  } catch (err) {
    logger.error({ err }, 'Parts usage error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.appointmentStats = async (req, res) => {
  try {
    const ws = req.user.workshop_id;

    const [total, statusCounts, todayCount] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM appointments WHERE workshop_id = $1`, [ws]),
      db.query(`SELECT status, COUNT(*)::int AS count FROM appointments WHERE workshop_id = $1 GROUP BY status`, [ws]),
      db.query(`SELECT COUNT(*)::int AS count FROM appointments WHERE workshop_id = $1 AND scheduled_date = CURRENT_DATE`, [ws]),
    ]);

    res.json({
      totalAppointments: total.rows[0].count,
      todayAppointments: todayCount.rows[0].count,
      statusBreakdown: statusCounts.rows,
    });
  } catch (err) {
    logger.error({ err }, 'Appointment stats error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};