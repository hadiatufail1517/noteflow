const { Note, NoteShare } = require('../models');
const aiService = require('../services/ai');

// Summarize note
exports.summarize = async (req, res) => {
  const { content } = req.body;
  try {
    const summary = await aiService.generateSummary(content);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Improve note writing
exports.improve = async (req, res) => {
  const { content } = req.body;
  try {
    const improved = await aiService.improveWriting(content);
    res.json({ improved });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate tags for note
exports.generateTags = async (req, res) => {
  const { content } = req.body;
  try {
    const tags = await aiService.generateTags(content);
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Extract action items
exports.extractActions = async (req, res) => {
  const { content } = req.body;
  try {
    const actionItems = await aiService.extractActionItems(content);
    res.json({ actionItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ask about a specific note (grounded QA)
exports.askNote = async (req, res) => {
  const userId = req.user.id;
  const { noteId, question } = req.body;

  if (!noteId || !question) {
    return res.status(400).json({ message: 'Note ID and question are required.' });
  }

  try {
    const note = await Note.findByPk(noteId);
    if (!note) {
      return res.status(404).json({ message: 'Note not found or access denied.' });
    }

    let hasAccess = note.userId === userId;
    if (!hasAccess) {
      const share = await NoteShare.findOne({ where: { noteId, sharedWithUserId: userId } });
      if (share) hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Note not found or access denied.' });
    }

    const answer = await aiService.askNoteQuestion(note.title, note.content, question);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Semantic vector search over notes (RAG)
exports.semanticSearch = async (req, res) => {
  const userId = req.user.id;
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ message: 'Query string is required for semantic search.' });
  }

  try {
    const results = await aiService.dbSearchNotes(userId, query);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// AI Agent Chatbot
exports.agentChat = async (req, res) => {
  const userId = req.user.id;
  const { messages, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ message: 'User message is required.' });
  }

  try {
    const chatHistory = messages || [];
    const response = await aiService.runAgentChat(userId, chatHistory, userMessage);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Daily Brief (structure & stats)
exports.getDailyBrief = async (req, res) => {
  const userId = req.user.id;
  try {
    const brief = await aiService.generateDailyBrief(userId, false);
    res.json(brief);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Prepare Daily Plan (Gemini compilation)
exports.prepareDay = async (req, res) => {
  const userId = req.user.id;
  try {
    const brief = await aiService.generateDailyBrief(userId, true);
    res.json(brief);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Knowledge Graph data
exports.getKnowledgeGraph = async (req, res) => {
  const userId = req.user.id;
  const thresholdVal = req.query.threshold ? parseFloat(req.query.threshold) : 0.45;
  try {
    const data = await aiService.getKnowledgeGraphData(userId, thresholdVal);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate MCQs for note
exports.generateMCQs = async (req, res) => {
  const { content } = req.body;
  try {
    const mcqs = await aiService.generateMCQs(content);
    res.json({ mcqs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate Quiz for note
exports.generateQuiz = async (req, res) => {
  const { content } = req.body;
  try {
    const quiz = await aiService.generateQuiz(content);
    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

