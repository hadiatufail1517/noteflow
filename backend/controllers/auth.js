const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Invitation, NoteShare, Notification } = require('../models');
require('dotenv').config();

const AUTH_SECRET = process.env.AUTH_SECRET || 'fallback_secret_for_development_purposes';

exports.register = async (req, res) => {
  let { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    email = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // Auto-claim any pending invitations for this email address
    try {
      const pendingInvites = await Invitation.findAll({
        where: { inviteeEmail: email.trim().toLowerCase(), status: 'pending' }
      });

      for (const invite of pendingInvites) {
        // Create the actual NoteShare entry
        await NoteShare.create({
          noteId: invite.noteId,
          ownerId: invite.inviterId,
          sharedWithUserId: user.id,
          permission: invite.permission
        });

        // Create alert notification
        const inviter = await User.findByPk(invite.inviterId);
        const inviterName = inviter ? inviter.name : 'A NoteHub user';
        await Notification.create({
          userId: user.id,
          type: 'note_shared',
          title: 'Shared Note Claimed 📝',
          content: `${inviterName} had shared a note with you before registration.`
        });

        // Set status to accepted
        invite.status = 'accepted';
        await invite.save();
      }
    } catch (inviteErr) {
      console.error('Error claiming pending invitations:', inviteErr);
    }

    const token = jwt.sign({ id: user.id }, AUTH_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  try {
    email = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, AUTH_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email']
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
