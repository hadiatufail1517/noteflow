const { Notification } = require('../models');

// Fetch user notifications
exports.getNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await Notification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark all notifications as read
exports.readAllNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    await Notification.update(
      { read: true },
      { where: { userId, read: false } }
    );
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
