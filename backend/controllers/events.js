const { Event } = require('../models');

exports.getAll = async (req, res) => {
  const userId = req.user.id;
  try {
    const events = await Event.findAll({
      where: { userId },
      order: [
        ['date', 'ASC'],
        ['time', 'ASC']
      ]
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  const userId = req.user.id;
  const { id, title, date, time } = req.body;

  if (!title || !date) {
    return res.status(400).json({ message: 'Title and date are required.' });
  }

  try {
    const event = await Event.create({
      id: id || undefined,
      userId,
      title,
      date,
      time: time || null
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const event = await Event.findOne({ where: { id, userId } });
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    await event.destroy();
    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
