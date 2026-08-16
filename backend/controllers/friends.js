const { FriendRequest, Friendship, User, Notification } = require('../models');
const { Op } = require('sequelize');

// List all accepted friends
exports.getFriends = async (req, res) => {
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

    const friends = friendships.map(f => {
      const friendUser = f.userId === userId ? f.friend : f.user;
      const initials = friendUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      return {
        friendshipId: f.id,
        id: friendUser.id,
        name: friendUser.name,
        email: friendUser.email,
        avatar: initials,
        createdAt: f.createdAt
      };
    });

    res.json(friends);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Search users by name or email
exports.searchUsers = async (req, res) => {
  const userId = req.user.id;
  const { q } = req.query;

  if (!q || !q.trim()) {
    return res.json([]);
  }

  try {
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: userId },
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'name', 'email'],
      limit: 20
    });

    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { userId },
          { friendId: userId }
        ]
      }
    });

    const requests = await FriendRequest.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ],
        status: 'pending'
      }
    });

    const results = users.map(u => {
      const isFriend = friendships.some(f => 
        (f.userId === userId && f.friendId === u.id) ||
        (f.friendId === userId && f.userId === u.id)
      );

      let relationStatus = 'Add Friend';
      if (isFriend) {
        relationStatus = 'Friends';
      } else {
        const sentReq = requests.find(r => r.senderId === userId && r.receiverId === u.id);
        const recvReq = requests.find(r => r.senderId === u.id && r.receiverId === userId);
        
        if (sentReq) {
          relationStatus = 'Request Sent';
        } else if (recvReq) {
          relationStatus = 'Accept Request';
        }
      }

      const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: initials,
        status: relationStatus
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List pending incoming friend requests
exports.getRequests = async (req, res) => {
  const userId = req.user.id;
  try {
    const requests = await FriendRequest.findAll({
      where: { receiverId: userId, status: 'pending' },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name', 'email'] }]
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send a friend request
exports.sendRequest = async (req, res) => {
  const senderId = req.user.id;
  const { receiverId } = req.body;

  if (senderId === receiverId) {
    return res.status(400).json({ message: 'You cannot add yourself as a friend.' });
  }

  try {
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId }
        ]
      }
    });
    if (existingFriendship) {
      return res.status(400).json({ message: 'You are already friends with this user.' });
    }

    const existingRequest = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'A pending friend request already exists.' });
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ message: 'You are already friends with this user.' });
      }
      if (existingRequest.status === 'rejected') {
        existingRequest.senderId = senderId;
        existingRequest.receiverId = receiverId;
        existingRequest.status = 'pending';
        await existingRequest.save();

        const sender = await User.findByPk(senderId);
        await Notification.create({
          userId: receiverId,
          type: 'friend_request',
          title: 'New Friend Request 👥',
          content: `${sender.name} sent you a friend request.`
        });

        return res.status(200).json({ message: 'Friend request sent.', request: existingRequest });
      }
    }

    const request = await FriendRequest.create({
      senderId,
      receiverId,
      status: 'pending'
    });

    const sender = await User.findByPk(senderId);
    await Notification.create({
      userId: receiverId,
      type: 'friend_request',
      title: 'New Friend Request 👥',
      content: `${sender.name} sent you a friend request.`
    });

    res.status(201).json({ message: 'Friend request sent.', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Accept a friend request
exports.acceptRequest = async (req, res) => {
  const receiverId = req.user.id;
  const { id } = req.params;

  try {
    const request = await FriendRequest.findOne({
      where: { id, receiverId, status: 'pending' }
    });

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found or already processed.' });
    }

    request.status = 'accepted';
    await request.save();

    const u1 = request.senderId < request.receiverId ? request.senderId : request.receiverId;
    const u2 = request.senderId < request.receiverId ? request.receiverId : request.senderId;

    await Friendship.findOrCreate({
      where: { userId: u1, friendId: u2 }
    });

    const receiver = await User.findByPk(receiverId);
    await Notification.create({
      userId: request.senderId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted 🎉',
      content: `${receiver.name} accepted your friend request.`
    });

    res.json({ message: 'Friend request accepted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reject a friend request
exports.rejectRequest = async (req, res) => {
  const receiverId = req.user.id;
  const { id } = req.params;

  try {
    const request = await FriendRequest.findOne({
      where: { id, receiverId, status: 'pending' }
    });

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remove a friend
exports.removeFriend = async (req, res) => {
  const userId = req.user.id;
  const friendId = req.params.id;

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
      return res.status(404).json({ message: 'Friendship connection not found.' });
    }

    await friendship.destroy();

    await FriendRequest.destroy({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId }
        ]
      }
    });

    res.json({ message: 'Friend removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
