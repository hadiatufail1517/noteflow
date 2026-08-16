const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NoteChunk = sequelize.define('NoteChunk', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  noteId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  embedding: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('embedding');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('embedding', value ? JSON.stringify(value) : null);
    }
  },
}, {
  timestamps: true,
});

module.exports = NoteChunk;
