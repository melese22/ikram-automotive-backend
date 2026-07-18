const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const JobCard = require('../models/JobCard');
const PartUsed = require('../models/PartUsed');
const Workshop = require('../models/Workshop');
const { initPayment, verifyPayment } = require('../services/chapaService');
const { generateInvoicePDF } = require('../services/pdfService');
const logger = require('../config/logger');

exports.generate = async (req, res) => {
  try {
    const { jobCardId, laborCost, taxRate, notes, depositPaid } = req.body;
    if (!jobCardId) {
      return res.status(400).json({ error: 'jobCardId is required.' });
    }

    const existing = await Invoice.findByJobCard(jobCardId);
    const active = existing.find(i => i.status !== 'CANCELLED');
    if (active) {
      return res.status(409).json({ error: 'An active invoice already exists for this job card.', invoice: active });
    }

    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) return res.status(404).json({ error: 'Job card not found.' });

    const partsUsed = await PartUsed.findByJobCard(jobCardId);
    const partsTotal = await PartUsed.totalForJobCard(jobCardId);

    const invoiceNumber = await Invoice.nextInvoiceNumber(req.user.workshop_id);

    const lineItems = [];

    if (laborCost && parseFloat(laborCost) > 0) {
      lineItems.push({
        description: `Labor — ${jobCard.make} ${jobCard.model} (${jobCard.plate_number || jobCard.vin || ''})`,
        itemType: 'labor',
        quantity: 1,
        unitPrice: parseFloat(laborCost),
        total: parseFloat(laborCost),
      });
    }

    for (const pu of partsUsed) {
      const lineTotal = pu.quantity * parseFloat(pu.unit_price_at_use);
      lineItems.push({
        description: `${pu.part_name} (${pu.part_sku})`,
        itemType: 'part',
        quantity: pu.quantity,
        unitPrice: parseFloat(pu.unit_price_at_use),
        total: lineTotal,
      });
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'No labor cost or parts to invoice. Add parts or provide labor cost.' });
    }

    const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
    const rate = parseFloat(taxRate) || 0;
    const taxAmount = subtotal * (rate / 100);
    const total = subtotal + taxAmount;

    const deposit = parseFloat(depositPaid) || 0;
    const invoice = await Invoice.create({
      invoiceNumber,
      jobCardId,
      workshopId: req.user.workshop_id,
      customerId: jobCard.customer_id,
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate: rate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      notes: notes || null,
      createdBy: req.user.id,
      depositPaid: Math.round(deposit * 100) / 100,
    });

    const items = await InvoiceLineItem.bulkCreate(
      lineItems.map((li, i) => ({ ...li, invoiceId: invoice.id, sortOrder: i }))
    );

    res.status(201).json({
      message: 'Invoice generated.',
      invoice: { ...invoice, lineItems: items },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Duplicate invoice number. Try again.' });
    }
    logger.error({ err }, 'Generate invoice error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await Invoice.findByWorkshop(req.user.workshop_id, { limit, offset });
    res.json({ invoices: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error({ err }, 'Get invoices error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    if (req.user.role === 'Customer' && invoice.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const lineItems = await InvoiceLineItem.findByInvoice(req.params.id);
    res.json({ invoice: { ...invoice, lineItems } });
  } catch (err) {
    logger.error({ err }, 'Get invoice error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getByJobCard = async (req, res) => {
  try {
    const invoices = await Invoice.findByJobCard(req.params.jobCardId);
    if (req.user.role === 'Customer' && invoices.length > 0 && invoices[0].customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        const lineItems = await InvoiceLineItem.findByInvoice(inv.id);
        return { ...inv, lineItems };
      })
    );
    res.json({ invoices: enriched });
  } catch (err) {
    logger.error({ err }, 'Get job card invoices error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findByCustomer(req.user.id);
    const enriched = await Promise.all(
      invoices.map(async (inv) => {
        const lineItems = await InvoiceLineItem.findByInvoice(inv.id);
        return { ...inv, lineItems };
      })
    );
    res.json({ invoices: enriched });
  } catch (err) {
    logger.error({ err }, 'Get my invoices error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, paidAt } = req.body;
    const valid = ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: `Valid status required: ${valid.join(', ')}` });
    }

    const invoice = await Invoice.updateStatus(req.params.id, status, paidAt ? new Date(paidAt) : null);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    res.json({ message: `Invoice ${status.toLowerCase()}.`, invoice });
  } catch (err) {
    logger.error({ err }, 'Update invoice status error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.initiatePayment = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Invoice is already paid.' });
    }

    const payAmount = parseFloat(invoice.balance_due) > 0 ? parseFloat(invoice.balance_due) : parseFloat(invoice.total);
    if (payAmount <= 0) {
      return res.status(400).json({ error: 'No remaining balance to pay.' });
    }

    if (invoice.status === 'DRAFT') {
      return res.status(400).json({ error: 'Issue the invoice before requesting payment.' });
    }

    const txRef = `${invoice.invoice_number}-${Date.now()}`;
    const callbackUrl = `${process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/api/invoices/payment-callback`;
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice.id}?paid=pending`;

    const customerEmail = invoice.customer_email || 'customer@ikram.com';

    const result = await initPayment({
      amount: payAmount,
      email: customerEmail,
      firstName: invoice.customer_name || 'Test',
      lastName: 'Customer',
      txRef,
      callbackUrl,
      returnUrl,
    });

    if (result.status !== 'success') {
      return res.status(502).json({ error: 'Payment initiation failed.', details: result.message });
    }

    const checkoutUrl = result.data.checkout_url;
    await Invoice.updatePaymentRef(invoice.id, checkoutUrl, txRef);

    res.json({ checkoutUrl });
  } catch (err) {
    logger.error({ err }, 'Initiate payment error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.paymentCallback = async (req, res) => {
  try {
    const { tx_ref } = req.body;

    if (!tx_ref) {
      return res.status(400).json({ error: 'Missing tx_ref.' });
    }

    const verification = await verifyPayment(tx_ref);

    if (verification.status === 'success' && verification.data?.status === 'success') {
      const invoiceNumber = tx_ref.split('-').slice(0, 3).join('-');
      const invoice = await Invoice.findByNumber(invoiceNumber);
      if (invoice && invoice.status !== 'PAID') {
        const paidAmount = parseFloat(verification.data.amount);
        const expectedAmount = parseFloat(invoice.total);
        if (Math.abs(paidAmount - expectedAmount) > 0.01) {
          logger.error({ paidAmount, expectedAmount, tx_ref }, 'Payment amount mismatch');
          return res.status(400).json({ error: 'Payment amount mismatch.' });
        }
        await Invoice.updateStatus(invoice.id, 'PAID');
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Payment callback error');
    res.json({ received: true });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    res.json({
      status: invoice.status,
      paidAt: invoice.paid_at,
      chapaPayUrl: invoice.chapa_pay_url,
    });
  } catch (err) {
    logger.error({ err }, 'Payment status error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

    if (req.user.role === 'Customer' && invoice.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const lineItems = await InvoiceLineItem.findByInvoice(invoice.id);
    const workshop = await Workshop.findById(invoice.workshop_id);

    const pdfBuffer = await generateInvoicePDF(invoice, lineItems, workshop);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error({ err }, 'PDF generation error');
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
};