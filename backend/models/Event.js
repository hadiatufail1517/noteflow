const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.STRING, // format YYYY-MM-DD
    allowNull: false,
  },
  time: {
    type: DataTypes.STRING, // format HH:MM
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Event;
