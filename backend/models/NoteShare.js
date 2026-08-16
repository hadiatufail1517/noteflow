const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NoteShare = sequelize.define('NoteShare', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  noteId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sharedWithUserId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  permission: {
    type: DataTypes.ENUM('view', 'edit'),
    defaultValue: 'view',
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['noteId', 'sharedWithUserId'],
    }
  ]
});

module.exports = NoteShare;
