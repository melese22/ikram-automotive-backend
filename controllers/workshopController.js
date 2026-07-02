const Workshop = require('../models/Workshop');

exports.getAll = async (req, res) => {
  try {
    const workshops = await Workshop.findAll();
    res.json({ workshops });
  } catch (err) {
    console.error('Get workshops error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found.' });
    const stats = await Workshop.getStats(req.params.id);
    res.json({ workshop, stats });
  } catch (err) {
    console.error('Get workshop error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, address, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Workshop name is required.' });

    const workshop = await Workshop.create({ name, address, phone, email });
    res.status(201).json({ message: 'Workshop created.', workshop });
  } catch (err) {
    console.error('Create workshop error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const allowed = ['name', 'address', 'phone', 'email', 'is_active'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const workshop = await Workshop.update(req.params.id, updates);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found.' });
    res.json({ message: 'Workshop updated.', workshop });
  } catch (err) {
    console.error('Update workshop error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.overview = async (req, res) => {
  try {
    const workshops = await Workshop.findAllWithStats(100, 0);
    const withStats = await Promise.all(
      workshops.map(async (w) => {
        const stats = await Workshop.getStats(w.id);
        return { ...w, stats };
      })
    );

    const totals = withStats.reduce((acc, w) => ({
      workshops: acc.workshops + 1,
      users: acc.users + (w.stats.users?.reduce((s, u) => s + u.count, 0) || 0),
      activeJobs: acc.activeJobs + w.stats.jobCards.active,
      totalRevenue: acc.totalRevenue + w.stats.revenue.total_revenue,
    }), { workshops: 0, users: 0, activeJobs: 0, totalRevenue: 0 });

    res.json({ workshops: withStats, totals });
  } catch (err) {
    console.error('Workshop overview error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};