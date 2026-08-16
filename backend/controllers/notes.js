const { Note, Tag, NoteChunk, NoteShare, User, sequelize } = require('../models');
const { generateEmbedding, getRelatedNotes } = require('../services/ai');

const { Op } = require('sequelize');

// Helper sliding window text chunker
function chunkText(text, chunkSize = 800, overlap = 100) {
  if (!text || !text.trim()) return [];
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    const chunk = text.substring(index, index + chunkSize);
    chunks.push(chunk);
    index += (chunkSize - overlap);
    if (index >= text.length || chunk.length < chunkSize) break;
  }
  return chunks;
}

// Update chunks & vector embeddings pipeline
async function rebuildNoteEmbeddings(userId, noteId, title, content) {
  // 1. Delete existing chunks for this note
  await NoteChunk.destroy({ where: { noteId } });

  if (!content || !content.trim()) return;

  // 2. Split content into overlapping chunks
  const chunks = chunkText(content);
  if (chunks.length === 0) return;

  // 3. Generate embeddings & save
  for (const textChunk of chunks) {
    try {
      // Prepend title to chunk for richer context grounding
      const chunkTextWithHeader = `Note: ${title}\nContent: ${textChunk}`;
      const embedding = await generateEmbedding(chunkTextWithHeader);
      
      await NoteChunk.create({
        userId,
        noteId,
        content: textChunk,
        embedding
      });
    } catch (error) {
      console.error(`Failed to generate embedding for chunk in note ${noteId}:`, error.message);
      // Skip embedding generation for this chunk if API fails, ensuring user note persists
    }
  }
}

// Get all notes for current user
exports.getAll = async (req, res) => {
  const userId = req.user.id;
  const { search, category, tag, sort } = req.query;

  try {
    const where = { userId };
    
    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const include = [{
      model: Tag,
      through: { attributes: [] }, // Omit join table fields
    }];

    if (tag) {
      include[0].where = { name: tag };
    }

    let order = [['updatedAt', 'DESC']];
    if (sort === 'oldest') {
      order = [['createdAt', 'ASC']];
    } else if (sort === 'newest') {
      order = [['createdAt', 'DESC']];
    } else if (sort === 'alphabetical') {
      order = [['title', 'ASC']];
    }

    const notes = await Note.findAll({
      where,
      include,
      order
    });

    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single note details
exports.getOne = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const note = await Note.findOne({
      where: { id },
      include: [
        { model: Tag, through: { attributes: [] } },
        { model: User, attributes: ['name', 'email'] }
      ]
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.userId === userId) {
      return res.json({
        ...note.toJSON(),
        permission: 'owner'
      });
    }

    const share = await NoteShare.findOne({
      where: { noteId: id, sharedWithUserId: userId }
    });

    if (!share) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({
      ...note.toJSON(),
      permission: share.permission,
      isShared: true,
      ownerName: note.User ? note.User.name : 'Unknown Owner'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new note
exports.create = async (req, res) => {
  const userId = req.user.id;
  const { title, content, category, pinned, tags } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const transaction = await sequelize.transaction();

  try {
    const note = await Note.create({
      userId,
      title,
      content,
      category: category || 'General',
      pinned: pinned || false
    }, { transaction });

    // Handle tag links
    if (tags && Array.isArray(tags)) {
      const tagInstances = [];
      for (const tagName of tags) {
        const cleanedName = tagName.trim().toLowerCase();
        if (!cleanedName) continue;
        
        // Find or create tag inside database
        const [tagInstance] = await Tag.findOrCreate({
          where: { name: cleanedName },
          transaction
        });
        tagInstances.push(tagInstance);
      }
      await note.setTags(tagInstances, { transaction });
    }

    await transaction.commit();

    // Run document processing pipeline asynchronously
    // Using setImmediate so the HTTP request returns quickly
    setImmediate(async () => {
      try {
        await rebuildNoteEmbeddings(userId, note.id, note.title, note.content);
      } catch (err) {
        console.error('Asynchronous chunk processing failed:', err);
      }
    });

    // Fetch note with tags to return to client
    const noteWithTags = await Note.findByPk(note.id, {
      include: [{ model: Tag, through: { attributes: [] } }]
    });

    res.status(201).json(noteWithTags);
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

// Update an existing note
exports.update = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, content, category, pinned, tags } = req.body;

  const transaction = await sequelize.transaction();

  try {
    let note = await Note.findByPk(id, { transaction });

    if (!note) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Note not found' });
    }

    let hasEditAccess = note.userId === userId;
    let isSharedEdit = false;
    if (!hasEditAccess) {
      const share = await NoteShare.findOne({
        where: { noteId: id, sharedWithUserId: userId, permission: 'edit' },
        transaction
      });
      if (share) {
        hasEditAccess = true;
        isSharedEdit = true;
      }
    }

    if (!hasEditAccess) {
      await transaction.rollback();
      return res.status(403).json({ message: 'You do not have permission to edit this note.' });
    }

    const contentChanged = content !== undefined && content !== note.content;
    const titleChanged = title !== undefined && title !== note.title;

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (category !== undefined) note.category = category;
    if (pinned !== undefined) note.pinned = pinned;

    await note.save({ transaction });

    if (tags && Array.isArray(tags)) {
      const tagInstances = [];
      for (const tagName of tags) {
        const cleanedName = tagName.trim().toLowerCase();
        if (!cleanedName) continue;

        const [tagInstance] = await Tag.findOrCreate({
          where: { name: cleanedName },
          transaction
        });
        tagInstances.push(tagInstance);
      }
      await note.setTags(tagInstances, { transaction });
    }

    await transaction.commit();

    if (contentChanged || titleChanged) {
      setImmediate(async () => {
        try {
          await rebuildNoteEmbeddings(note.userId, note.id, note.title, note.content);
        } catch (err) {
          console.error('Embeddings update failed:', err);
        }
      });
    }

    const updatedNote = await Note.findByPk(id, {
      include: [
        { model: Tag, through: { attributes: [] } },
        { model: User, attributes: ['name', 'email'] }
      ]
    });

    res.json({
      ...updatedNote.toJSON(),
      permission: isSharedEdit ? 'edit' : 'owner'
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

// Delete a note
exports.delete = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const note = await Note.findOne({ where: { id, userId } });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Embeddings cascade delete automatically since we defined noteId onDelete CASCADE
    await note.destroy();
    res.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get related notes
exports.getRelated = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const results = await getRelatedNotes(userId, id);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

