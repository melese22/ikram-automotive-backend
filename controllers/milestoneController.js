const { Milestone, MilestoneTask } = require('../models/Milestone');

exports.createMilestone = async (req, res) => {
  try {
    const { jobCardId, title, description, sortOrder, assignedTo } = req.body;
    if (!jobCardId || !title) {
      return res.status(400).json({ error: 'jobCardId and title are required.' });
    }
    const milestone = await Milestone.create({ jobCardId, title, description, sortOrder, assignedTo });
    res.status(201).json({ message: 'Milestone created.', milestone });
  } catch (err) {
    console.error('Create milestone error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getMilestones = async (req, res) => {
  try {
    const milestones = await Milestone.findByJobCard(req.params.jobCardId);
    const enriched = await Promise.all(
      milestones.map(async (m) => {
        const tasks = await MilestoneTask.findByMilestone(m.id);
        return { ...m, tasks };
      })
    );
    res.json({ milestones: enriched });
  } catch (err) {
    console.error('Get milestones error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateMilestone = async (req, res) => {
  try {
    const allowedFields = ['title', 'description', 'sort_order', 'assigned_to'];
    const fieldMap = { sortOrder: 'sort_order', assignedTo: 'assigned_to' };
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (req.body[camel] !== undefined) updates[snake] = req.body[camel];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const milestone = await Milestone.update(req.params.id, updates);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found.' });
    res.json({ message: 'Milestone updated.', milestone });
  } catch (err) {
    console.error('Update milestone error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.transitionMilestone = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (PENDING, IN_PROGRESS, COMPLETED, SKIPPED).' });
    }
    const milestone = await Milestone.transitionStatus(req.params.id, status);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found.' });
    res.json({ message: `Milestone ${status}.`, milestone });
  } catch (err) {
    console.error('Transition milestone error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.delete(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found.' });
    res.json({ message: 'Milestone deleted.' });
  } catch (err) {
    console.error('Delete milestone error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, sortOrder, assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const task = await MilestoneTask.create({
      milestoneId: req.params.milestoneId,
      title,
      description,
      sortOrder,
      assignedTo,
    });
    res.status(201).json({ message: 'Task created.', task });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await MilestoneTask.findByMilestone(req.params.milestoneId);
    res.json({ tasks });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const allowedFields = ['title', 'description', 'sort_order', 'assigned_to'];
    const fieldMap = { sortOrder: 'sort_order', assignedTo: 'assigned_to' };
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    for (const [camel, snake] of Object.entries(fieldMap)) {
      if (req.body[camel] !== undefined) updates[snake] = req.body[camel];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const task = await MilestoneTask.update(req.params.id, updates);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task updated.', task });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.transitionTask = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (PENDING, IN_PROGRESS, COMPLETED, SKIPPED).' });
    }
    const task = await MilestoneTask.transitionStatus(req.params.id, status);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: `Task ${status}.`, task });
  } catch (err) {
    console.error('Transition task error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await MilestoneTask.delete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};