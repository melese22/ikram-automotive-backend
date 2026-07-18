const TransferRequest = require('../models/TransferRequest');
const Part = require('../models/Part');
const { emitToWorkshop } = require('../services/socketService');
const logger = require('../config/logger');

exports.create = async (req, res) => {
  try {
    const { partId, toWorkshopId, quantity, notes } = req.body;
    if (!partId || !toWorkshopId || !quantity) {
      return res.status(400).json({ error: 'partId, toWorkshopId, and quantity are required.' });
    }
    if (toWorkshopId === req.user.workshop_id) {
      return res.status(400).json({ error: 'Cannot transfer to the same workshop.' });
    }
    const part = await Part.findById(partId);
    if (!part) return res.status(404).json({ error: 'Part not found.' });
    if (part.workshop_id !== req.user.workshop_id) {
      return res.status(403).json({ error: 'Part does not belong to your workshop.' });
    }
    if (part.quantity < quantity) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${part.quantity}` });
    }
    const transfer = await TransferRequest.create({
      partId,
      fromWorkshopId: req.user.workshop_id,
      toWorkshopId,
      quantity,
      requestedBy: req.user.id,
      notes,
    });
    emitToWorkshop(toWorkshopId, 'transfer:created', transfer);
    res.status(201).json({ message: 'Transfer request created.', transfer });
  } catch (err) {
    logger.error({ err }, 'Create transfer request error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.list = async (req, res) => {
  try {
    const { status } = req.query;
    const transfers = await TransferRequest.findByWorkshop(req.user.workshop_id, status || null);
    res.json({ transfers });
  } catch (err) {
    logger.error({ err }, 'List transfers error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.approve = async (req, res) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found.' });
    if (transfer.to_workshop_id !== req.user.workshop_id) {
      return res.status(403).json({ error: 'Only target workshop can approve.' });
    }
    if (transfer.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve transfer in ${transfer.status} status.` });
    }
    const updated = await TransferRequest.updateStatus(req.params.id, 'approved', req.user.id);
    emitToWorkshop(transfer.from_workshop_id, 'transfer:approved', updated);
    res.json({ message: 'Transfer approved.', transfer: updated });
  } catch (err) {
    logger.error({ err }, 'Approve transfer error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.reject = async (req, res) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found.' });
    if (transfer.to_workshop_id !== req.user.workshop_id) {
      return res.status(403).json({ error: 'Only target workshop can reject.' });
    }
    const updated = await TransferRequest.updateStatus(req.params.id, 'rejected', req.user.id);
    emitToWorkshop(transfer.from_workshop_id, 'transfer:rejected', updated);
    res.json({ message: 'Transfer rejected.', transfer: updated });
  } catch (err) {
    logger.error({ err }, 'Reject transfer error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.complete = async (req, res) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id);
    if (!transfer) return res.status(404).json({ error: 'Transfer not found.' });
    if (transfer.from_workshop_id !== req.user.workshop_id) {
      return res.status(403).json({ error: 'Only source workshop can complete.' });
    }
    if (transfer.status !== 'approved') {
      return res.status(400).json({ error: 'Transfer must be approved before completing.' });
    }
    const updated = await TransferRequest.updateStatus(req.params.id, 'completed', req.user.id);
    emitToWorkshop(transfer.to_workshop_id, 'transfer:completed', updated);
    res.json({ message: 'Transfer completed.', transfer: updated });
  } catch (err) {
    logger.error({ err }, 'Complete transfer error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};
