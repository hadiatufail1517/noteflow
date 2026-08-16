const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Note, NoteChunk, NoteShare, User, Event, Tag, sequelize } = require('../models');

const { Op } = require('sequelize');
require('dotenv').config();

// Helper to compute Cosine Similarity in JavaScript
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate Text Embeddings (768 dimensions using text-embedding-004)
async function generateEmbedding(text) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not defined in environment variables.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

// Perform AI Summarization
async function generateSummary(content) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return 'Please set your LLM_API_KEY in the env settings.';
  if (!content || !content.trim()) return 'No content to summarize.';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `Provide a concise, professional summary of the following note content. Use markdown styling. Return only the summary text.\n\nNote:\n${content}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// Perform AI Writing Improvement
async function improveWriting(content) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return 'Please set your LLM_API_KEY in the env settings.';
  if (!content || !content.trim()) return 'No content to improve.';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `Improve the grammar, structure, readability, and clarity of the following text. Preserve the original message and meaning. Return ONLY the improved text version. Do not add conversational intros or descriptions.\n\nText:\n${content}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// Perform AI Tag Generation
async function generateTags(content) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return [];
  if (!content || !content.trim()) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `Analyze the note below and suggest 3 to 6 tags that represent its core topics. Return the tags as a single line, comma-separated list of short words (e.g. 'React, JavaScript, Component'). Return ONLY the list. Do not write explanation.\n\nNote:\n${content}`;
  
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text.split(',').map(tag => tag.trim()).filter(Boolean);
  } catch (error) {
    console.error('Error generating tags:', error);
    return [];
  }
}

// Perform AI Action Item Extraction
async function extractActionItems(content) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return 'Please set your LLM_API_KEY in the env settings.';
  if (!content || !content.trim()) return 'No content to parse.';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `Analyze the note text below and extract any actionable tasks or items that need completion. Return them as a markdown checklist (using - [ ] syntax). If no actionable tasks are found, output 'No action items found.'\n\nText:\n${content}`;
  
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// Perform single note grounding question answering
async function askNoteQuestion(noteTitle, noteContent, question) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return 'Please set your LLM_API_KEY in the env settings.';
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `You are a helpful AI assistant. Answer the user's question about their note based ONLY on the note content provided below. If you cannot answer based on the note content, say so. Do not invent details.
  
Note Title: ${noteTitle}
Note Content:
${noteContent}

User's Question: ${question}

Grounded Answer:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// Semantic similarity search logic (restricted to user owned and shared notes)
async function dbSearchNotes(userId, query) {
  try {
    const queryVec = await generateEmbedding(query);
    
    // 1. Get owned notes query
    const ownNotes = await Note.findAll({ where: { userId }, attributes: ['id'] });
    const ownNoteIds = ownNotes.map(n => n.id);

    // 2. Get shared notes query
    const shares = await NoteShare.findAll({ where: { sharedWithUserId: userId }, attributes: ['noteId'] });
    const sharedNoteIds = shares.map(s => s.noteId);

    // Combine accessible note IDs
    const accessibleNoteIds = [...new Set([...ownNoteIds, ...sharedNoteIds])];

    // Fetch chunks that belong to the user's accessible notes
    const chunks = await NoteChunk.findAll({
      where: {
        noteId: {
          [Op.in]: accessibleNoteIds
        }
      },
      include: [
        { 
          model: Note, 
          attributes: ['title', 'id', 'category', 'userId'],
          include: [{ model: User, attributes: ['name'] }]
        }
      ]
    });

    const scored = chunks.map(chunk => {
      const score = cosineSimilarity(queryVec, chunk.embedding);
      return { chunk, score };
    });

    // Sort descending and filter top matches
    scored.sort((a, b) => b.score - a.score);
    const matches = scored.filter(s => s.score > 0.35).slice(0, 5);

    return matches.map(m => ({
      noteId: m.chunk.noteId,
      noteTitle: m.chunk.Note ? m.chunk.Note.title : 'Untitled Note',
      content: m.chunk.content,
      score: m.score,
      category: m.chunk.Note ? m.chunk.Note.category : 'General',
      ownerName: m.chunk.Note && m.chunk.Note.User ? m.chunk.Note.User.name : 'Unknown'
    }));
  } catch (error) {
    console.error('Semantic search error:', error);
    return { error: error.message };
  }
}

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

async function rebuildNoteEmbeddings(userId, noteId, title, content) {
  await NoteChunk.destroy({ where: { noteId } });
  if (!content || !content.trim()) return;
  const chunks = chunkText(content);
  if (chunks.length === 0) return;
  for (const textChunk of chunks) {
    try {
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
    }
  }
}

// AI Agent Chat Loop
async function runAgentChat(userId, messages, userMessageText) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return { content: 'Please configure LLM_API_KEY in your env settings to use the AI Assistant.' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Setup executable tools inside agent sandbox
  const functions = {
    searchNotes: async ({ query }) => {
      return await dbSearchNotes(userId, query);
    },
    getNote: async ({ noteId }) => {
      const note = await Note.findOne({
        where: { id: noteId },
        include: [{ model: User, attributes: ['name', 'email'] }]
      });
      if (!note) return { error: 'Note not found or access denied.' };
      
      if (note.userId === userId) {
        return { id: note.id, title: note.title, content: note.content, category: note.category, permission: 'owner' };
      }

      const share = await NoteShare.findOne({ where: { noteId, sharedWithUserId: userId } });
      if (share) {
        return { id: note.id, title: note.title, content: note.content, category: note.category, permission: share.permission, isShared: true, ownerName: note.User.name };
      }

      return { error: 'Note not found or access denied.' };
    },
    listNotes: async ({ category, search }) => {
      const ownNotes = await Note.findAll({ where: { userId }, attributes: ['id', 'title', 'category'] });
      
      const shares = await NoteShare.findAll({ where: { sharedWithUserId: userId }, attributes: ['noteId'] });
      const sharedNoteIds = shares.map(s => s.noteId);
      const sharedNotes = await Note.findAll({
        where: { id: { [Op.in]: sharedNoteIds } },
        attributes: ['id', 'title', 'category'],
        include: [{ model: User, attributes: ['name'] }]
      });

      const allNotes = [
        ...ownNotes.map(n => ({ id: n.id, title: n.title, category: n.category, permission: 'owner' })),
        ...sharedNotes.map(n => ({ id: n.id, title: n.title, category: n.category, permission: 'shared', ownerName: n.User.name }))
      ];

      let filtered = allNotes;
      if (category) {
        filtered = filtered.filter(n => n.category.toLowerCase() === category.toLowerCase());
      }
      if (search) {
        filtered = filtered.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));
      }
      return filtered;
    },
    summarizeNote: async ({ noteId }) => {
      const hasAccess = await Note.findOne({ where: { id: noteId, userId } }) || 
                        await NoteShare.findOne({ where: { noteId, sharedWithUserId: userId } });
      if (!hasAccess) return { error: 'Note not found or access denied.' };
      
      const note = await Note.findByPk(noteId);
      const summary = await generateSummary(note.content);
      return { noteId, title: note.title, summary };
    },
    generateTags: async ({ noteId }) => {
      const hasAccess = await Note.findOne({ where: { id: noteId, userId } }) || 
                        await NoteShare.findOne({ where: { noteId, sharedWithUserId: userId } });
      if (!hasAccess) return { error: 'Note not found or access denied.' };

      const note = await Note.findByPk(noteId);
      const tags = await generateTags(note.content);
      return { noteId, title: note.title, tags };
    },
    extractActionItems: async ({ noteId }) => {
      const hasAccess = await Note.findOne({ where: { id: noteId, userId } }) || 
                        await NoteShare.findOne({ where: { noteId, sharedWithUserId: userId } });
      if (!hasAccess) return { error: 'Note not found or access denied.' };

      const note = await Note.findByPk(noteId);
      const actions = await extractActionItems(note.content);
      return { noteId, title: note.title, actionItems: actions };
    },
    createNote: async ({ title, content, category, tags }) => {
      const transaction = await sequelize.transaction();
      try {
        const note = await Note.create({
          userId,
          title,
          content,
          category: category || 'General',
          pinned: false
        }, { transaction });

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

        setImmediate(async () => {
          try {
            await rebuildNoteEmbeddings(userId, note.id, note.title, note.content);
          } catch (err) {
            console.error('Asynchronous chunk processing failed:', err);
          }
        });

        return {
          success: true,
          message: 'Note created successfully.',
          noteId: note.id,
          title: note.title,
          reference: `[${note.title}](/dashboard?viewNote=${note.id})`
        };
      } catch (err) {
        await transaction.rollback();
        return { error: err.message };
      }
    },
    updateNote: async ({ noteId, title, content, category, tags }) => {
      const transaction = await sequelize.transaction();
      try {
        const note = await Note.findByPk(noteId, { transaction });
        if (!note) {
          await transaction.rollback();
          return { error: 'Note not found.' };
        }

        let hasEditAccess = note.userId === userId;
        let isSharedEdit = false;
        if (!hasEditAccess) {
          const share = await NoteShare.findOne({
            where: { noteId, sharedWithUserId: userId, permission: 'edit' },
            transaction
          });
          if (share) {
            hasEditAccess = true;
            isSharedEdit = true;
          }
        }

        if (!hasEditAccess) {
          await transaction.rollback();
          return { error: 'Access denied: You do not have edit permission for this note.' };
        }

        const contentChanged = content !== undefined && content !== note.content;
        const titleChanged = title !== undefined && title !== note.title;

        if (title !== undefined) note.title = title;
        if (content !== undefined) note.content = content;
        if (category !== undefined) note.category = category;

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

        const linkRoute = isSharedEdit ? '/shared-notes' : '/dashboard';

        return {
          success: true,
          message: 'Note updated successfully.',
          noteId: note.id,
          title: note.title,
          reference: `[${note.title}](${linkRoute}?viewNote=${note.id})`
        };
      } catch (err) {
        await transaction.rollback();
        return { error: err.message };
      }
    },
    deleteNote: async ({ noteId, confirm }) => {
      try {
        const note = await Note.findByPk(noteId);
        if (!note) {
          return { error: 'Note not found.' };
        }

        if (note.userId !== userId) {
          return { error: 'Access denied: Only the owner can delete this note.' };
        }

        if (!confirm) {
          return {
            requiresConfirmation: true,
            noteId: note.id,
            title: note.title,
            message: `Are you sure you want to delete the note "${note.title}"? Please confirm this action.`
          };
        }

        await note.destroy();
        return {
          success: true,
          message: `Note "${note.title}" deleted successfully.`
        };
      } catch (err) {
        return { error: err.message };
      }
    }
  };

  // Define Function Declarations for Gemini
  const tools = [{
    functionDeclarations: [
      {
        name: 'searchNotes',
        description: 'Search the user\'s notes using semantic similarity search. Use this when the user asks a question about what they wrote, needs to find concepts, or wants to retrieve information from their notes.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'The semantic query, describing what is being searched.' }
          },
          required: ['query']
        }
      },
      {
        name: 'getNote',
        description: 'Retrieve a specific note by its unique note ID. Used when the user wants to read or inspect a note they have identified.',
        parameters: {
          type: 'OBJECT',
          properties: {
            noteId: { type: 'STRING', description: 'The UUID of the note to retrieve.' }
          },
          required: ['noteId']
        }
      },
      {
        name: 'listNotes',
        description: 'Return a list of all notes. Supports optional filtering by category or text searches against titles.',
        parameters: {
          type: 'OBJECT',
          properties: {
            category: { type: 'STRING', description: 'Optional category name.' },
            search: { type: 'STRING', description: 'Optional search keyword.' }
          }
        }
      },
      {
        name: 'summarizeNote',
        description: 'Summarize a specific note by its unique note ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            noteId: { type: 'STRING', description: 'The UUID of the note.' }
          },
          required: ['noteId']
        }
      },
      {
        name: 'generateTags',
        description: 'Generate suggested tags for a specific note by its note ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            noteId: { type: 'STRING', description: 'The UUID of the note.' }
          },
          required: ['noteId']
        }
      },
      {
        name: 'extractActionItems',
        description: 'Analyze a note content and extract todo list checklist action items.',
        parameters: {
          type: 'OBJECT',
          properties: {
            noteId: { type: 'STRING', description: 'The UUID of the note.' }
          },
          required: ['noteId']
        }
      },
      {
        name: 'createNote',
        description: 'Create a new note. Users can specify title, content, category, and optionally tags.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'The title of the note.' },
            content: { type: 'STRING', description: 'The markdown body content of the note.' },
            category: { type: 'STRING', description: 'Optional category name.' },
            tags: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Optional array of tags.'
            }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'updateNote',
        description: 'Update an existing note title, content, category, and tags.',
        parameters: {
          type: 'OBJECT',
          properties: {
            noteId: { type: 'STRING', description: 'The UUID of the note to update.' },
            title: { type: 'STRING', description: 'Optional new title.' },
            content: { type: 'STRING', description: 'Optional new markdown content.' },
            category: { type: 'STRING', description: 'Optional new category.' },
            tags: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              description: 'Optional new array of tags.'
            }
          },
          required: ['noteId']
        }
      },
      {
        name: 'deleteNote',
        description: 'Delete a note by its note ID. Destructive action: requires explicit confirmation from the user by setting confirm to true.',
        parameters: {
          type: 'OBJECT',
          properties: {
            noteId: { type: 'STRING', description: 'The UUID of the note to delete.' },
            confirm: { 
              type: 'BOOLEAN', 
              description: 'Explicit confirmation flag. Must be true to perform the delete. If false or not provided, the user must be prompted to confirm.' 
            }
          },
          required: ['noteId']
        }
      }
    ]
  }];

  const systemInstruction = `You are NoteHub, a premium AI Knowledge & Note Assistant. You help users understand, organize, retrieve, and use their notes.
You have access to tools that query, inspect, create, update, and delete the user's notes.
IMPORTANT: When answering questions specifically about the user's notes, you MUST use the tools to retrieve note context. Do NOT answer from general model knowledge when the question is about what the user wrote.
Always provide a grounded answer based on the notes retrieved, and include citations.
When you use tools, state clearly what tool was executed and summarize its findings.

CREATING & UPDATING NOTES:
- After successfully creating or updating a note, clearly describe what action was performed and display a clean markdown link/reference to that note using the exact format: [Note Title](/dashboard?viewNote=noteId) (e.g. [My Meeting Note](/dashboard?viewNote=uuid)).

DELETIVE ACTIONS:
- For destructive actions such as deleteNote, you MUST require explicit confirmation from the user first.
- Do NOT perform a deletion (do not set confirm to true) unless the user has explicitly confirmed their consent. If the user requests to delete a note, first call deleteNote with confirm set to false (or omit it) to retrieve the note details, then ask the user: "Are you sure you want to delete note 'Note Title'?"
- Only execute deleteNote with confirm set to true after the user has explicitly typed a confirmation response.`;

  // Start chat model
  const chatModel = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    tools,
    systemInstruction
  });

  // Convert incoming chat history into Gemini contents format
  const contents = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    } else {
      const parts = [{ text: msg.content || '' }];
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        msg.toolCalls.forEach(call => {
          parts.push({ functionCall: call });
        });
      }
      contents.push({ role: 'model', parts });

      if (msg.toolResponses && msg.toolResponses.length > 0) {
        contents.push({
          role: 'user',
          parts: msg.toolResponses.map(res => ({
            functionResponse: {
              name: res.name,
              response: { result: res.result }
            }
          }))
        });
      }
    }
  }

  // Add the current user query
  contents.push({ role: 'user', parts: [{ text: userMessageText }] });

  try {
    let response = await chatModel.generateContent({ contents });
    let responseText = '';
    let toolCallsUsed = [];
    let toolResponsesStored = [];

    const candidates = response.response.candidates;
    if (candidates && candidates[0] && candidates[0].content && candidates[0].content.parts) {
      const parts = candidates[0].content.parts;
      const functionCalls = parts.filter(p => p.functionCall);

      if (functionCalls.length > 0) {
        toolCallsUsed = functionCalls.map(f => f.functionCall);
        const functionResponses = [];

        for (const call of toolCallsUsed) {
          const { name, args } = call;
          let resultData;
          try {
            if (functions[name]) {
              resultData = await functions[name](args);
            } else {
              resultData = { error: `Tool ${name} not found.` };
            }
          } catch (err) {
            resultData = { error: err.message };
          }
          functionResponses.push({
            name,
            result: resultData
          });
          toolResponsesStored.push({
            name,
            result: resultData
          });
        }

        // Push model functionCall turn to memory log
        contents.push({
          role: 'model',
          parts: parts
        });

        // Push tool responses turn as user turn
        contents.push({
          role: 'user',
          parts: functionResponses.map(res => ({
            functionResponse: {
              name: res.name,
              response: { result: res.result }
            }
          }))
        });

        // Call Gemini again with tool results to compile final response
        const finalResponse = await chatModel.generateContent({ contents });
        responseText = finalResponse.response.text();
      } else {
        responseText = response.response.text();
      }
    } else {
      responseText = response.response.text();
    }

    return {
      content: responseText,
      toolCalls: toolCallsUsed,
      toolResponses: toolResponsesStored
    };
  } catch (error) {
    console.error('Agent chat error:', error);
    return { content: `Error running AI assistant: ${error.message}` };
  }
}

async function getRelatedNotes(userId, noteId) {
  const note = await Note.findOne({ where: { id: noteId } });
  if (!note) throw new Error('Note not found');

  let hasAccess = note.userId === userId;
  if (!hasAccess) {
    const share = await NoteShare.findOne({ where: { noteId, sharedWithUserId: userId } });
    if (share) hasAccess = true;
  }
  if (!hasAccess) throw new Error('Access denied');

  if (!note.title && !note.content) return [];

  const noteText = `Note: ${note.title}\nContent: ${note.content || ''}`;
  const targetVec = await generateEmbedding(noteText);

  const ownNotes = await Note.findAll({ where: { userId, id: { [Op.ne]: noteId } }, attributes: ['id', 'title', 'category'] });
  const ownNoteIds = ownNotes.map(n => n.id);

  const shares = await NoteShare.findAll({ where: { sharedWithUserId: userId, noteId: { [Op.ne]: noteId } }, attributes: ['noteId'] });
  const sharedNoteIds = shares.map(s => s.noteId);
  const sharedNotes = await Note.findAll({ where: { id: { [Op.in]: sharedNoteIds } }, attributes: ['id', 'title', 'category'] });

  const allNotes = [...ownNotes, ...sharedNotes];
  const allNoteIds = allNotes.map(n => n.id);

  if (allNoteIds.length === 0) return [];

  const chunks = await NoteChunk.findAll({
    where: { noteId: { [Op.in]: allNoteIds } }
  });

  const noteScoresMap = {};
  for (const chunk of chunks) {
    const score = cosineSimilarity(targetVec, chunk.embedding);
    if (!noteScoresMap[chunk.noteId] || score > noteScoresMap[chunk.noteId]) {
      noteScoresMap[chunk.noteId] = score;
    }
  }

  const results = allNotes
    .map(n => {
      const score = noteScoresMap[n.id] || 0;
      return {
        id: n.id,
        title: n.title,
        category: n.category || 'General',
        similarity: Math.round(score * 100)
      };
    })
    .filter(res => res.similarity > 35)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return results;
}

async function getKnowledgeGraphData(userId, threshold = 0.45) {
  const ownNotes = await Note.findAll({ where: { userId }, attributes: ['id', 'title', 'category', 'pinned'] });
  const shares = await NoteShare.findAll({ where: { sharedWithUserId: userId }, attributes: ['noteId'] });
  const sharedNoteIds = shares.map(s => s.noteId);
  const sharedNotes = await Note.findAll({ where: { id: { [Op.in]: sharedNoteIds } }, attributes: ['id', 'title', 'category', 'pinned'] });

  const allNotes = [
    ...ownNotes.map(n => ({ id: n.id, title: n.title, category: n.category || 'General', pinned: n.pinned, isShared: false })),
    ...sharedNotes.map(n => ({ id: n.id, title: n.title, category: n.category || 'General', pinned: n.pinned, isShared: true }))
  ];

  const allNoteIds = allNotes.map(n => n.id);
  if (allNoteIds.length === 0) return { nodes: [], edges: [] };

  const chunks = await NoteChunk.findAll({
    where: { noteId: { [Op.in]: allNoteIds } }
  });

  const noteChunksMap = {};
  for (const chunk of chunks) {
    if (!noteChunksMap[chunk.noteId]) {
      noteChunksMap[chunk.noteId] = [];
    }
    noteChunksMap[chunk.noteId].push(chunk.embedding);
  }

  const nodes = allNotes.map(n => ({
    id: n.id,
    label: n.title,
    category: n.category,
    pinned: n.pinned,
    isShared: n.isShared
  }));

  const edges = [];
  for (let i = 0; i < allNotes.length; i++) {
    for (let j = i + 1; j < allNotes.length; j++) {
      const noteIdA = allNotes[i].id;
      const noteIdB = allNotes[j].id;

      const chunksA = noteChunksMap[noteIdA] || [];
      const chunksB = noteChunksMap[noteIdB] || [];

      if (chunksA.length === 0 || chunksB.length === 0) continue;

      let maxSim = 0;
      for (const embA of chunksA) {
        for (const embB of chunksB) {
          const sim = cosineSimilarity(embA, embB);
          if (sim > maxSim) maxSim = sim;
        }
      }

      if (maxSim >= threshold) {
        edges.push({
          source: noteIdA,
          target: noteIdB,
          similarity: Math.round(maxSim * 100)
        });
      }
    }
  }

  return { nodes, edges };
}

async function generateDailyBrief(userId, preparePlan = false) {
  const ownNotes = await Note.findAll({ where: { userId }, order: [['updatedAt', 'DESC']] });
  const shares = await NoteShare.findAll({ where: { sharedWithUserId: userId } });
  const sharedNoteIds = shares.map(s => s.noteId);
  const sharedNotes = await Note.findAll({ where: { id: { [Op.in]: sharedNoteIds } }, order: [['updatedAt', 'DESC']] });

  const allNotes = [...ownNotes, ...sharedNotes];

  const events = await Event.findAll({
    where: { userId },
    order: [['date', 'ASC'], ['time', 'ASC']]
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => e.date >= todayStr);

  const unfinishedTasks = [];
  for (const note of allNotes) {
    if (!note.content) continue;
    const lines = note.content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*[-*]\s*\[\s\]\s*(.+)$/);
      if (match) {
        unfinishedTasks.push({
          text: match[1].trim(),
          noteId: note.id,
          noteTitle: note.title
        });
      }
    }
  }

  const priorityNotes = allNotes
    .filter(n => n.pinned)
    .slice(0, 3)
    .map(n => ({
      id: n.id,
      title: n.title,
      category: n.category || 'General',
      updatedAt: n.updatedAt
    }));

  if (priorityNotes.length === 0) {
    priorityNotes.push(...allNotes.slice(0, 2).map(n => ({
      id: n.id,
      title: n.title,
      category: n.category || 'General',
      updatedAt: n.updatedAt
    })));
  }

  const continueNotes = allNotes
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 3)
    .map(n => ({
      id: n.id,
      title: n.title,
      category: n.category || 'General',
      updatedAt: n.updatedAt
    }));

  const categoriesMap = {};
  for (const n of allNotes) {
    const cat = n.category || 'General';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
  }
  const totalNotesCount = allNotes.length;
  const categoriesCount = Object.keys(categoriesMap).length;

  const knowledgeInsights = [];
  if (totalNotesCount > 0) {
    knowledgeInsights.push(`You have accumulated ${totalNotesCount} notes across ${categoriesCount} knowledge topics.`);
    
    let topCat = 'General';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoriesMap)) {
      if (count > maxCount) {
        maxCount = count;
        topCat = cat;
      }
    }
    if (maxCount > 0) {
      knowledgeInsights.push(`Your most active knowledge category is "${topCat}" with ${maxCount} notes.`);
    }
  } else {
    knowledgeInsights.push("Your knowledge repository is empty. Create some notes to generate intelligence insights!");
  }

  if (unfinishedTasks.length > 0) {
    knowledgeInsights.push(`You have ${unfinishedTasks.length} pending action items inside your notes.`);
  }

  let dailyPlan = null;
  if (preparePlan) {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      dailyPlan = "API Key not configured. Please set LLM_API_KEY inside the .env file.";
    } else {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const notesContext = allNotes.slice(0, 10).map(n => `- ${n.title} (${n.category})`).join('\n');
        const tasksContext = unfinishedTasks.slice(0, 15).map(t => `- [ ] ${t.text} (from note "${t.noteTitle}")`).join('\n');
        const eventsContext = upcomingEvents.slice(0, 10).map(e => `- ${e.title} on ${e.date}${e.time ? ` at ${e.time}` : ''}`).join('\n');

        const prompt = `You are NoteHub Daily Planner, an AI system that organizes and summarizes a user's day.
You are generating a daily briefing/plan.
Here is the user's actual application data:

1. RECENT/PINNED NOTES:
${notesContext || 'No notes found.'}

2. UNFINISHED ACTION ITEMS:
${tasksContext || 'No unfinished tasks found.'}

3. UPCOMING SCHEDULE EVENTS:
${eventsContext || 'No upcoming events found.'}

Generate a concise, professional, and actionable daily plan.
Strict Guidelines:
- Ground your response ONLY in the user's actual data.
- NEVER invent or hallucinate tasks, events, notes, deadlines, or dates.
- If there are no upcoming events or tasks, explain that gracefully instead of inventing them.
- Format the response beautifully in clean markdown. Keep it punchy, motivating, and clear.`;

        const result = await model.generateContent(prompt);
        dailyPlan = result.response.text().trim();
      } catch (err) {
        console.error('Error preparing daily plan:', err);
        dailyPlan = `Failed to generate AI daily plan: ${err.message}`;
      }
    }
  }

  return {
    priorityNotes,
    upcomingEvents,
    continueNotes,
    unfinishedTasks,
    knowledgeInsights,
    dailyPlan
  };
}

// Perform AI MCQ Generation
async function generateMCQs(content) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('Please set your LLM_API_KEY in the env settings.');
  if (!content || !content.trim()) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `Based on the following note content, generate 4-5 multiple choice questions (MCQs) for self-study.
Format the output as a valid JSON array of objects. Each object MUST have these keys:
- "question": the question string
- "options": an array of exactly 4 strings for options (A, B, C, D)
- "answerIndex": a number (0 to 3) representing the index of the correct option in the options array
- "explanation": a string explaining why that option is correct.

Do not include any markdown styling like \`\`\`json or \`\`\`. Just return the raw JSON text string.

Note Content:
${content}`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating MCQs:', error);
    throw new Error('Failed to parse generated MCQs JSON: ' + error.message);
  }
}

// Perform AI Quiz Generation
async function generateQuiz(content) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error('Please set your LLM_API_KEY in the env settings.');
  if (!content || !content.trim()) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const prompt = `Based on the following note content, generate a quiz consisting of 4-5 interactive multiple choice questions.
Format the output as a valid JSON array of objects. Each object MUST have these keys:
- "question": the question string
- "options": an array of exactly 4 strings for options
- "answerIndex": a number (0 to 3) representing the index of the correct option in the options array
- "explanation": a string explaining why that option is correct.

Do not include any markdown styling like \`\`\`json or \`\`\`. Just return the raw JSON text string.

Note Content:
${content}`;

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating Quiz:', error);
    throw new Error('Failed to parse generated Quiz JSON: ' + error.message);
  }
}

module.exports = {
  cosineSimilarity,
  generateEmbedding,
  generateSummary,
  improveWriting,
  generateTags,
  extractActionItems,
  askNoteQuestion,
  dbSearchNotes,
  runAgentChat,
  getRelatedNotes,
  getKnowledgeGraphData,
  generateDailyBrief,
  generateMCQs,
  generateQuiz,
};

