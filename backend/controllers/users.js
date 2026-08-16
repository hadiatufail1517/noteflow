const { User } = require('../models');

// Check whether an email belongs to an existing NoteHub account
exports.checkEmail = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email query parameter is required.' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Normalize email
  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({
      where: { email: cleanEmail },
      attributes: ['id', 'name', 'email']
    });

    if (user) {
      res.json({
        exists: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
