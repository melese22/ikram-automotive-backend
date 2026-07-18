const User = require('../models/User');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

exports.list = async (req, res) => {
  try {
    const { role } = req.query;
    const users = await User.findByWorkshop(req.user.workshop_id, role || null);
    res.json({ users });
  } catch (err) {
    logger.error({ err }, 'List users error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (req.user.role !== 'SuperAdmin' && user.workshop_id !== req.user.workshop_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    res.json({ user });
  } catch (err) {
    logger.error({ err }, 'Get user error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required.' });
    }
    const allowedRoles = ['WorkshopManager', 'Mechanic', 'Customer'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` });
    }
    const existing = await User.findByPhone(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone number already in use.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email || null,
      phone,
      passwordHash,
      role: role || 'Customer',
      workshopId: req.user.workshop_id,
    });
    res.status(201).json({ message: 'User created.', user });
  } catch (err) {
    logger.error({ err }, 'Create user error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (req.user.role !== 'SuperAdmin' && target.workshop_id !== req.user.workshop_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const allowed = ['name', 'email', 'role', 'is_active'];
    const updates = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (updates.role) {
      const validRoles = ['WorkshopManager', 'Mechanic', 'Customer'];
      if (!validRoles.includes(updates.role)) {
        return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const updated = await User.update(req.params.id, updates);
    res.json({ message: 'User updated.', user: updated });
  } catch (err) {
    logger.error({ err }, 'Update user error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (req.user.role !== 'SuperAdmin' && target.workshop_id !== req.user.workshop_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const updated = await User.update(req.params.id, { is_active: !target.is_active });
    res.json({ message: `User ${updated.is_active ? 'activated' : 'deactivated'}.`, user: updated });
  } catch (err) {
    logger.error({ err }, 'Toggle user active error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};
