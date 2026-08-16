const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invitation = sequelize.define('Invitation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  noteId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  inviterId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  inviteeEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  permission: {
    type: DataTypes.ENUM('view', 'edit'),
    defaultValue: 'view',
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted'),
    defaultValue: 'pending',
    allowNull: false,
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['noteId', 'inviteeEmail'],
    }
  ]
});

module.exports = Invitation;
