const Vehicle = require('../models/Vehicle');

exports.create = async (req, res) => {
  try {
    const { plateNumber, chassisNumber, make, model, year, vin, mileage, customerId } = req.body;

    if (!make || !model || !customerId) {
      return res.status(400).json({ error: 'Make, model, and customerId are required.' });
    }

    const vehicle = await Vehicle.create({
      plateNumber,
      chassisNumber,
      make,
      model,
      year,
      vin,
      mileage,
      customerId,
      workshopId: req.user.workshop_id,
    });

    res.status(201).json({ message: 'Vehicle registered successfully.', vehicle });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Vehicle with this VIN already exists.' });
    }
    console.error('Create vehicle error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await Vehicle.findAllByWorkshop(req.user.workshop_id, { limit, offset });
    res.json({ vehicles: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get vehicles error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }
    res.json({ vehicle });
  } catch (err) {
    console.error('Get vehicle error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required.' });
    }
    const vehicles = await Vehicle.search(q, req.user.workshop_id);
    res.json({ vehicles });
  } catch (err) {
    console.error('Search vehicles error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowedFields = ['plate_number', 'chassis_number', 'make', 'model', 'year', 'vin', 'mileage'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const vehicle = await Vehicle.update(req.params.id, updates);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    res.json({ message: 'Vehicle updated successfully.', vehicle });
  } catch (err) {
    console.error('Update vehicle error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAllByCustomer(req.user.id);
    res.json({ vehicles });
  } catch (err) {
    console.error('Get my vehicles error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getVehicleHistory = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' });

    const isOwner = req.user.role === 'Customer' && vehicle.customer_id === req.user.id;
    const isStaff = ['SuperAdmin', 'WorkshopManager', 'Mechanic'].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const history = await Vehicle.getServiceHistory(req.params.id);
    res.json({ vehicle, history });
  } catch (err) {
    console.error('Get vehicle history error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
