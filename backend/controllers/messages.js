const { Message, User, Friendship } = require('../models');
const { Op } = require('sequelize');

// List conversations with last message & unread count
exports.getConversations = async (req, res) => {
  const userId = req.user.id;

  try {
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { userId },
          { friendId: userId }
        ]
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'friend', attributes: ['id', 'name', 'email'] }
      ]
    });

    const friends = friendships.map(f => f.userId === userId ? f.friend : f.user);

    const conversationList = [];

    for (const friend of friends) {
      const latestMsg = await Message.findOne({
        where: {
          [Op.or]: [
            { senderId: userId, receiverId: friend.id },
            { senderId: friend.id, receiverId: userId }
          ]
        },
        order: [['createdAt', 'DESC']]
      });

      const unreadCount = await Message.count({
        where: {
          senderId: friend.id,
          receiverId: userId,
          readAt: null
        }
      });

      const initials = friend.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

      if (latestMsg) {
        conversationList.push({
          id: friend.id,
          name: friend.name,
          email: friend.email,
          avatar: initials,
          latestMessage: latestMsg.content,
          latestMessageAt: latestMsg.createdAt,
          unreadCount
        });
      }
    }

    conversationList.sort((a, b) => {
      return new Date(b.latestMessageAt) - new Date(a.latestMessageAt);
    });

    res.json(conversationList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch message logs with a specific friend and mark incoming messages as read
exports.getMessageHistory = async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.params;

  try {
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    if (!friendship) {
      return res.status(403).json({ message: 'You can only message accepted friends.' });
    }

    await Message.update(
      { readAt: new Date() },
      {
        where: {
          senderId: friendId,
          receiverId: userId,
          readAt: null
        }
      }
    );

    const history = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send a chat message to a friend
exports.sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message content is required.' });
  }

  try {
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId }
        ]
      }
    });

    if (!friendship) {
      return res.status(403).json({ message: 'You can only message accepted friends.' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const message = await Message.findByPk(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only sender or receiver of the message can delete it
    if (message.senderId !== userId && message.receiverId !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await message.destroy();
    res.json({ message: 'Message deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete all messages in a conversation
exports.deleteConversation = async (req, res) => {
  const userId = req.user.id;
  const { friendId } = req.params;

  try {
    await Message.destroy({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      }
    });

    res.json({ message: 'Conversation deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
