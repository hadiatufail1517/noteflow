const { Note, NoteShare, Friendship, User, Notification, Invitation } = require('../models');
const { Op } = require('sequelize');
const { sendShareEmail, sendInviteEmail } = require('../services/email');

// Share a note with a friend
exports.shareNote = async (req, res) => {
  const ownerId = req.user.id;
  const { noteId } = req.params;
  const { sharedWithUserId, permission } = req.body;

  if (ownerId === sharedWithUserId) {
    return res.status(400).json({ message: 'You cannot share a note with yourself.' });
  }

  try {
    const note = await Note.findOne({ where: { id: noteId, userId: ownerId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: ownerId, friendId: sharedWithUserId },
          { userId: sharedWithUserId, friendId: ownerId }
        ]
      }
    });
    if (!friendship) {
      return res.status(403).json({ message: 'You can only share notes with accepted friends.' });
    }

    const existingShare = await NoteShare.findOne({
      where: { noteId, sharedWithUserId }
    });
    if (existingShare) {
      return res.status(400).json({ message: 'Note is already shared with this user.' });
    }

    const share = await NoteShare.create({
      noteId,
      ownerId,
      sharedWithUserId,
      permission: permission || 'view'
    });

    const owner = await User.findByPk(ownerId);
    await Notification.create({
      userId: sharedWithUserId,
      type: 'note_shared',
      title: 'New Shared Note 📝',
      content: `${owner.name} shared a note with you: "${note.title}".`
    });

    // Dispatch Email Notification in the background
    try {
      const recipient = await User.findByPk(sharedWithUserId);
      if (recipient && recipient.email) {
        await sendShareEmail({
          to: recipient.email,
          ownerName: owner.name,
          noteTitle: note.title,
          permission: permission || 'view'
        });
      }
    } catch (mailErr) {
      console.error('Failed to send share email notification:', mailErr);
    }

    res.status(201).json({ message: 'Note shared successfully.', share });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List notes shared with current user
exports.getSharedWithMe = async (req, res) => {
  const userId = req.user.id;

  try {
    const shares = await NoteShare.findAll({
      where: { sharedWithUserId: userId },
      include: [
        {
          model: Note,
          include: [{ model: User, attributes: ['name', 'email'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const notes = shares.map(s => {
      if (!s.Note) return null;
      return {
        shareId: s.id,
        id: s.Note.id,
        title: s.Note.title,
        content: s.Note.content,
        category: s.Note.category,
        permission: s.permission,
        ownerName: s.Note.User ? s.Note.User.name : 'Unknown User',
        sharedAt: s.createdAt,
        updatedAt: s.Note.updatedAt
      };
    }).filter(Boolean);

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all active shares and pending invitations for a note (so owner can manage them)
exports.getNoteShares = async (req, res) => {
  const ownerId = req.user.id;
  const { noteId } = req.params;

  try {
    const note = await Note.findOne({ where: { id: noteId, userId: ownerId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    const shares = await NoteShare.findAll({
      where: { noteId },
      include: [{ model: User, as: 'sharedWithUser', attributes: ['id', 'name', 'email'] }]
    });

    const invitations = await Invitation.findAll({
      where: { noteId, status: 'pending' }
    });

    const unifiedShares = [
      ...shares.map(s => ({
        id: s.id,
        type: 'share',
        noteId: s.noteId,
        ownerId: s.ownerId,
        sharedWithUserId: s.sharedWithUserId,
        permission: s.permission,
        sharedWithUser: s.sharedWithUser
      })),
      ...invitations.map(inv => ({
        id: inv.id,
        type: 'invitation',
        noteId: inv.noteId,
        ownerId: inv.inviterId,
        permission: inv.permission,
        sharedWithUser: {
          id: null,
          name: 'Pending Invitation',
          email: inv.inviteeEmail
        }
      }))
    ];

    res.json(unifiedShares);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update permission of shared note (view <-> edit)
exports.updateSharePermission = async (req, res) => {
  const ownerId = req.user.id;
  const { noteId, shareId } = req.params;
  const { permission } = req.body;

  if (!['view', 'edit'].includes(permission)) {
    return res.status(400).json({ message: 'Invalid permission value. Choose view or edit.' });
  }

  try {
    const note = await Note.findOne({ where: { id: noteId, userId: ownerId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    const share = await NoteShare.findOne({ where: { id: shareId, noteId } });
    if (!share) {
      return res.status(404).json({ message: 'Share record not found.' });
    }

    share.permission = permission;
    await share.save();

    await Notification.create({
      userId: share.sharedWithUserId,
      type: 'permission_changed',
      title: 'Share Permission Updated 🔒',
      content: `Your access permission for note "${note.title}" was changed to ${permission === 'edit' ? 'Can Edit' : 'View Only'}.`
    });

    res.json({ message: 'Permission updated successfully.', share });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Revoke sharing access to a note
exports.removeShare = async (req, res) => {
  const ownerId = req.user.id;
  const { noteId, shareId } = req.params;

  try {
    const note = await Note.findOne({ where: { id: noteId, userId: ownerId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    const share = await NoteShare.findOne({ where: { id: shareId, noteId } });
    if (!share) {
      return res.status(404).json({ message: 'Share record not found.' });
    }

    const recipientUserId = share.sharedWithUserId;
    await share.destroy();

    await Notification.create({
      userId: recipientUserId,
      type: 'access_removed',
      title: 'Shared Note Access Revoked ❌',
      content: `Access to shared note "${note.title}" was removed.`
    });

    res.json({ message: 'Access revoked successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a pending invitation for an unregistered user by email
exports.createInvitation = async (req, res) => {
  const inviterId = req.user.id;
  const { noteId } = req.params;
  const { email, permission } = req.body;

  if (!email || !permission) {
    return res.status(400).json({ message: 'Email and permission are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const note = await Note.findOne({ where: { id: noteId, userId: inviterId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    // Verify user is not registered on NoteHub
    const existingUser = await User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'This user is registered on NoteHub. Please use the normal share flow instead.' });
    }

    // Check if there is already a pending invitation for this email on this note
    const existingInvite = await Invitation.findOne({
      where: { noteId, inviteeEmail: cleanEmail, status: 'pending' }
    });
    if (existingInvite) {
      return res.status(400).json({ message: 'An invitation has already been sent to this email for this note.' });
    }

    const invitation = await Invitation.create({
      noteId,
      inviterId,
      inviteeEmail: cleanEmail,
      permission
    });

    // Dispatch Invitation Email in the background
    try {
      const inviter = await User.findByPk(inviterId);
      await sendInviteEmail({
        to: cleanEmail,
        ownerName: inviter.name,
        noteTitle: note.title
      });
    } catch (mailErr) {
      console.error('Failed to send invite email notification:', mailErr);
    }

    res.status(201).json({ message: 'Invitation sent successfully.', invitation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Revoke sharing invitation
exports.removeInvitation = async (req, res) => {
  const ownerId = req.user.id;
  const { noteId, invitationId } = req.params;

  try {
    const note = await Note.findOne({ where: { id: noteId, userId: ownerId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    const invitation = await Invitation.findOne({ where: { id: invitationId, noteId } });
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation record not found.' });
    }

    await invitation.destroy();
    res.json({ message: 'Invitation revoked successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
