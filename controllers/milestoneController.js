const { Milestone, MilestoneTask } = require('../models/Milestone');
const logger = require('../config/logger');

exports.createMilestone = async (req, res) => {
  try {
    const { jobCardId, title, description, sortOrder, assignedTo } = req.body;
    if (!jobCardId || !title) {
      return res.status(400).json({ error: 'jobCardId and title are required.' });
    }
    const milestone = await Milestone.create({ jobCardId, title, description, sortOrder, assignedTo });
    res.status(201).json({ message: 'Milestone created.', milestone });
  } catch (err) {
    logger.error({ err }, 'Create milestone error');
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
    logger.error({ err }, 'Get milestones error');
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
    logger.error({ err }, 'Update milestone error');
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
    logger.error({ err }, 'Transition milestone error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.delete(req.params.id);
    if (!milestone) return res.status(404).json({ error: 'Milestone not found.' });
    res.json({ message: 'Milestone deleted.' });
  } catch (err) {
    logger.error({ err }, 'Delete milestone error');
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
    logger.error({ err }, 'Create task error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const tasks = await MilestoneTask.findByMilestone(req.params.milestoneId);
    res.json({ tasks });
  } catch (err) {
    logger.error({ err }, 'Get tasks error');
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
    logger.error({ err }, 'Update task error');
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

    if (status === 'COMPLETED' || status === 'SKIPPED') {
      const allTasks = await MilestoneTask.findByMilestone(task.milestone_id);
      const allDone = allTasks.every(t => t.status === 'COMPLETED' || t.status === 'SKIPPED');
      if (allDone) {
        await Milestone.transitionStatus(task.milestone_id, 'COMPLETED');
      }
    }

    res.json({ message: `Task ${status}.`, task });
  } catch (err) {
    logger.error({ err }, 'Transition task error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await MilestoneTask.delete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    logger.error({ err }, 'Delete task error');
    res.status(500).json({ error: 'Internal server error.' });
  }
};