const db = require('../config/database');

class InvoiceLineItem {
  static async create({ invoiceId, description, itemType, quantity, unitPrice, total, sortOrder }) {
    const { rows } = await db.query(
      `INSERT INTO invoice_line_items (invoice_id, description, item_type, quantity, unit_price, total, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [invoiceId, description, itemType || 'other', quantity || 1, unitPrice || 0, total || 0, sortOrder || 0]
    );
    return rows[0];
  }

  static async bulkCreate(items) {
    if (items.length === 0) return [];
    const values = items.map((_, i) =>
      `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`
    ).join(', ');
    const params = items.flatMap(i => [i.invoiceId, i.description, i.itemType || 'other', i.quantity || 1, i.unitPrice || 0, i.total || 0, i.sortOrder || 0]);

    const { rows } = await db.query(
      `INSERT INTO invoice_line_items (invoice_id, description, item_type, quantity, unit_price, total, sort_order)
       VALUES ${values} RETURNING *`,
      params
    );
    return rows;
  }

  static async findByInvoice(invoiceId) {
    const { rows } = await db.query(
      `SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [invoiceId]
    );
    return rows;
  }

  static async deleteByInvoice(invoiceId) {
    await db.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [invoiceId]);
  }
}

module.exports = InvoiceLineItem;