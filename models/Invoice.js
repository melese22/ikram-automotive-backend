const db = require('../config/database');

class Invoice {
  static async create({ invoiceNumber, jobCardId, workshopId, customerId, subtotal, taxRate, taxAmount, total, notes, createdBy }) {
    const { rows } = await db.query(
      `INSERT INTO invoices (invoice_number, job_card_id, workshop_id, customer_id, subtotal, tax_rate, tax_amount, total, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [invoiceNumber, jobCardId, workshopId, customerId, subtotal, taxRate, taxAmount, total, notes || null, createdBy]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT i.*, u.name AS customer_name, u.phone AS customer_phone,
              v.plate_number, v.make, v.model
       FROM invoices i
       JOIN users u ON i.customer_id = u.id
       JOIN job_cards jc ON i.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE i.id = $1`,
      [id]
    );
    return rows[0];
  }

  static async findByWorkshop(workshopId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await db.query(
      `SELECT i.*, u.name AS customer_name,
              v.plate_number, v.make, v.model,
              COUNT(*) OVER() AS total_count
       FROM invoices i
       JOIN users u ON i.customer_id = u.id
       JOIN job_cards jc ON i.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE i.workshop_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2 OFFSET $3`,
      [workshopId, limit, offset]
    );
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    return { rows, total };
  }

  static async findByJobCard(jobCardId) {
    const { rows } = await db.query(
      `SELECT * FROM invoices WHERE job_card_id = $1 ORDER BY created_at DESC`,
      [jobCardId]
    );
    return rows;
  }

  static async findByCustomer(customerId) {
    const { rows } = await db.query(
      `SELECT i.*, v.plate_number, v.make, v.model
       FROM invoices i
       JOIN job_cards jc ON i.job_card_id = jc.id
       JOIN vehicles v ON jc.vehicle_id = v.id
       WHERE i.customer_id = $1
       ORDER BY i.created_at DESC`,
      [customerId]
    );
    return rows;
  }

  static async updateStatus(id, status, paidAt) {
    const updateFields = { status };
    if (status === 'ISSUED') updateFields.issued_at = new Date();
    if (status === 'PAID') updateFields.paid_at = paidAt || new Date();

    const keys = Object.keys(updateFields);
    const values = Object.values(updateFields);
    const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE invoices SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return rows[0];
  }

  static async findByNumber(invoiceNumber) {
    const { rows } = await db.query('SELECT * FROM invoices WHERE invoice_number = $1', [invoiceNumber]);
    return rows[0];
  }

  static async updatePaymentRef(id, chapaPayUrl, chapaTxRef) {
    const { rows } = await db.query(
      `UPDATE invoices SET chapa_pay_url = $1, chapa_tx_ref = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [chapaPayUrl, chapaTxRef, id]
    );
    return rows[0];
  }

  static async nextInvoiceNumber(workshopId) {
    const year = new Date().getFullYear();
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count FROM invoices WHERE workshop_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [workshopId, year]
    );
    const seq = (rows[0].count + 1).toString().padStart(4, '0');
    return `INV-${year}-${seq}`;
  }
}

module.exports = Invoice;