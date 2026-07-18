const bcrypt = require('bcryptjs');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { normalizePhone } = require('../utils/phoneUtils');
const Vehicle = require('../models/Vehicle');
const { emitToWorkshop } = require('../services/socketService');
const { getWorkshopTimezone } = require('../services/timezoneService');
const logger = require('../config/logger');

function generateTimeSlots(existing, slotDurationMinutes = 30) {
  const slots = [];
  const startHour = 8;
  const endHour = 17;
  const booked = existing.map(e => ({
    start: e.start_time.slice(0, 5),
    end: e.end_time.slice(0, 5),
  }));

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += slotDurationMinutes) {
      const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endM = m + slotDurationMinutes;
      const endH = h + (endM >= 60 ? 1 : 0);
      const endMin = endM >= 60 ? endM - 60 : endM;
      const end = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      const conflict = booked.some(b => b.start < end && b.end > start);
      const inPast = h < 8 || h >= 17;
      if (!conflict && !inPast) {
        slots.push({ start, end, available: true });
      }
    }
  }
  return slots;
}

exports.create = async (req, res) => {
  try {
    const { customerId, vehicleId, title, scheduledDate, startTime, endTime, notes } = req.body;
    if (!customerId || !vehicleId || !title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'customerId, vehicleId, title, scheduledDate, startTime, endTime are required.' });
    }

    const appointment = await Appointment.create({
      workshopId: req.user.workshop_id,
      customerId,
      vehicleId,
      title,
      scheduledDate,
      startTime,
      endTime,
      notes,
      createdBy: req.user.id,
    });

    emitToWorkshop(req.user.workshop_id, 'appointment:created', appointment);

    res.status(201).json({ message: 'Appointment created.', appointment });
  } catch (err) {
    logger.error({ err }, 'Create appointment error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.customerBook = async (req, res) => {
  try {
    const { vehicleId, title, scheduledDate, startTime, endTime, notes } = req.body;
    if (!vehicleId || !title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'vehicleId, title, scheduledDate, startTime, endTime are required.' });
    }

    const appointment = await Appointment.create({
      workshopId: req.user.workshop_id,
      customerId: req.user.id,
      vehicleId,
      title,
      scheduledDate,
      startTime,
      endTime,
      notes,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: 'Appointment booked.', appointment });
  } catch (err) {
    logger.error({ err }, 'Customer book appointment error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { date } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { rows, total } = await Appointment.findByWorkshop(req.user.workshop_id, date || null, { limit, offset });
    res.json({ appointments: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error({ err }, 'Get appointments error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    res.json({ appointment });
  } catch (err) {
    logger.error({ err }, 'Get appointment error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findByCustomer(req.user.id);
    res.json({ appointments });
  } catch (err) {
    logger.error({ err }, 'Get my appointments error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query parameter required (YYYY-MM-DD).' });

    const existing = await Appointment.getSlots(req.user.workshop_id, date);
    const slots = generateTimeSlots(existing);
    const timezone = await getWorkshopTimezone(req.user.workshop_id);
    res.json({ date, timezone, slots });
  } catch (err) {
    logger.error({ err }, 'Get available slots error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ error: `Valid status required: ${valid.join(', ')}` });
    }

    const appointment = await Appointment.updateStatus(req.params.id, status);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });

    emitToWorkshop(appointment.workshop_id, 'appointment:statusChanged', appointment);

    res.json({ message: `Appointment ${status}.`, appointment });
  } catch (err) {
    logger.error({ err }, 'Update appointment status error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const appointment = await Appointment.update(req.params.id, req.body);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    res.json({ message: 'Appointment updated.', appointment });
  } catch (err) {
    logger.error({ err }, 'Update appointment error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const appointment = await Appointment.delete(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found.' });
    res.json({ message: 'Appointment deleted.' });
  } catch (err) {
    logger.error({ err }, 'Delete appointment error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getPublicSlots = async (req, res) => {
  try {
    const { date, workshopId } = req.query;
    if (!date || !workshopId) {
      return res.status(400).json({ error: 'date and workshopId query parameters required.' });
    }

    const existing = await Appointment.getSlots(workshopId, date);
    const slots = generateTimeSlots(existing);
    const timezone = await getWorkshopTimezone(workshopId);
    res.json({ date, timezone, slots });
  } catch (err) {
    logger.error({ err }, 'Get public slots error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.publicBook = async (req, res) => {
  try {
    const { name, phone: rawPhone, email, password, make, model, year, plateNumber, workshopId, title, scheduledDate, startTime, endTime, notes } = req.body;
    const phone = normalizePhone(rawPhone);

    if (!name || !phone || !password || !make || !model || !workshopId || !title || !scheduledDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'name, phone, password, make, model, workshopId, title, scheduledDate, startTime, endTime are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    let user = await User.findByPhone(phone);
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await User.create({
        name, email, phone, passwordHash, role: 'Customer', workshopId,
      });
    }

    const existingVehicles = await Vehicle.findAllByCustomer(user.id);
    let vehicle = existingVehicles.find(v => v.plate_number === plateNumber);
    if (!vehicle) {
      vehicle = await Vehicle.create({ plateNumber, make, model, year: year || null, customerId: user.id, workshopId });
    }

    const appointment = await Appointment.create({
      workshopId, customerId: user.id, vehicleId: vehicle.id, title, scheduledDate, startTime, endTime, notes, createdBy: user.id,
    });

    emitToWorkshop(workshopId, 'appointment:created', appointment);

    res.status(201).json({ message: 'Appointment booked! We will confirm shortly.', appointment });
  } catch (err) {
    logger.error({ err }, 'Public book error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};