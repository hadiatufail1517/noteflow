const sequelize = require('../config/database');
const User = require('./User');
const Note = require('./Note');
const Tag = require('./Tag');
const NoteChunk = require('./NoteChunk');
const FriendRequest = require('./FriendRequest');
const Friendship = require('./Friendship');
const NoteShare = require('./NoteShare');
const Message = require('./Message');
const Notification = require('./Notification');
const Invitation = require('./Invitation');
const Event = require('./Event');


// User <-> Note
User.hasMany(Note, { foreignKey: 'userId', onDelete: 'CASCADE' });
Note.belongsTo(User, { foreignKey: 'userId' });

// Note <-> NoteChunk
Note.hasMany(NoteChunk, { foreignKey: 'noteId', onDelete: 'CASCADE' });
NoteChunk.belongsTo(Note, { foreignKey: 'noteId' });

// User <-> NoteChunk
User.hasMany(NoteChunk, { foreignKey: 'userId', onDelete: 'CASCADE' });
NoteChunk.belongsTo(User, { foreignKey: 'userId' });

// Note <-> Tag Many-to-Many
const NoteTag = sequelize.define('NoteTag', {}, { timestamps: false });
Note.belongsToMany(Tag, { through: NoteTag, foreignKey: 'noteId', onDelete: 'CASCADE' });
Tag.belongsToMany(Note, { through: NoteTag, foreignKey: 'tagId', onDelete: 'CASCADE' });

// Friend Requests Relationships
User.hasMany(FriendRequest, { foreignKey: 'senderId', as: 'sentRequests', onDelete: 'CASCADE' });
User.hasMany(FriendRequest, { foreignKey: 'receiverId', as: 'receivedRequests', onDelete: 'CASCADE' });
FriendRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
FriendRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Friendships Relationships
User.hasMany(Friendship, { foreignKey: 'userId', as: 'friendships', onDelete: 'CASCADE' });
Friendship.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Friendship.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });

// Note Sharing Relationships
Note.hasMany(NoteShare, { foreignKey: 'noteId', onDelete: 'CASCADE' });
NoteShare.belongsTo(Note, { foreignKey: 'noteId' });
User.hasMany(NoteShare, { foreignKey: 'ownerId', as: 'ownedShares', onDelete: 'CASCADE' });
User.hasMany(NoteShare, { foreignKey: 'sharedWithUserId', as: 'receivedShares', onDelete: 'CASCADE' });
NoteShare.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
NoteShare.belongsTo(User, { foreignKey: 'sharedWithUserId', as: 'sharedWithUser' });

// Messaging Relationships
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages', onDelete: 'CASCADE' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Notifications Relationships
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// Invitation Relationships
User.hasMany(Invitation, { foreignKey: 'inviterId', as: 'sentInvitations', onDelete: 'CASCADE' });
Invitation.belongsTo(User, { foreignKey: 'inviterId', as: 'inviter' });
Note.hasMany(Invitation, { foreignKey: 'noteId', onDelete: 'CASCADE' });
Invitation.belongsTo(Note, { foreignKey: 'noteId' });

// Event Relationships
User.hasMany(Event, { foreignKey: 'userId', onDelete: 'CASCADE' });
Event.belongsTo(User, { foreignKey: 'userId' });


module.exports = {
  sequelize,
  User,
  Note,
  Tag,
  NoteChunk,
  NoteTag,
  FriendRequest,
  Friendship,
  NoteShare,
  Message,
  Notification,
  Invitation,
  Event
};

