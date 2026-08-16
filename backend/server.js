const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const authMiddleware = require('./middleware/auth');
require('dotenv').config();

// Import controllers
const authController = require('./controllers/auth');
const notesController = require('./controllers/notes');
const aiController = require('./controllers/ai');
const friendsController = require('./controllers/friends');
const sharesController = require('./controllers/shares');
const messagesController = require('./controllers/messages');
const notificationsController = require('./controllers/notifications');
const usersController = require('./controllers/users');
const eventsController = require('./controllers/events');


const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://noteflow-puce.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Log incoming API calls
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── AUTHENTICATION ROUTES ───────────────────────────────────────────────────
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authMiddleware, authController.getMe);

// ─── USER LOOKUP ROUTES ───────────────────────────────────────────────────────
app.get('/api/users/check-email', authMiddleware, usersController.checkEmail);

// ─── NOTES CRUD ROUTES ────────────────────────────────────────────────────────
app.get('/api/notes', authMiddleware, notesController.getAll);
app.get('/api/notes/shared-with-me', authMiddleware, sharesController.getSharedWithMe);
app.get('/api/notes/:id', authMiddleware, notesController.getOne);
app.get('/api/notes/:id/related', authMiddleware, notesController.getRelated);
app.post('/api/notes', authMiddleware, notesController.create);
app.put('/api/notes/:id', authMiddleware, notesController.update);
app.delete('/api/notes/:id', authMiddleware, notesController.delete);


// ─── FRIENDS ROUTES ──────────────────────────────────────────────────────────
app.get('/api/friends', authMiddleware, friendsController.getFriends);
app.get('/api/friends/search', authMiddleware, friendsController.searchUsers);
app.get('/api/friends/requests', authMiddleware, friendsController.getRequests);
app.post('/api/friends/requests', authMiddleware, friendsController.sendRequest);
app.post('/api/friends/requests/:id/accept', authMiddleware, friendsController.acceptRequest);
app.post('/api/friends/requests/:id/reject', authMiddleware, friendsController.rejectRequest);
app.delete('/api/friends/:id', authMiddleware, friendsController.removeFriend);

// ─── NOTE COLLABORATION/SHARING ROUTES ─────────────────────────────────────────
app.post('/api/notes/:noteId/share', authMiddleware, sharesController.shareNote);
app.get('/api/notes/:noteId/shares', authMiddleware, sharesController.getNoteShares);
app.patch('/api/notes/:noteId/shares/:shareId', authMiddleware, sharesController.updateSharePermission);
app.delete('/api/notes/:noteId/shares/:shareId', authMiddleware, sharesController.removeShare);

// ─── NOTE SHARING INVITATIONS ────────────────────────────────────────────────
app.post('/api/notes/:noteId/invitations', authMiddleware, sharesController.createInvitation);
app.delete('/api/notes/:noteId/invitations/:invitationId', authMiddleware, sharesController.removeInvitation);

// ─── MESSAGING ROUTES ────────────────────────────────────────────────────────
app.get('/api/messages', authMiddleware, messagesController.getConversations);
app.get('/api/messages/:friendId', authMiddleware, messagesController.getMessageHistory);
app.post('/api/messages', authMiddleware, messagesController.sendMessage);
app.delete('/api/messages/:id', authMiddleware, messagesController.deleteMessage);
app.delete('/api/messages/conversation/:friendId', authMiddleware, messagesController.deleteConversation);

// ─── NOTIFICATIONS ROUTES ────────────────────────────────────────────────────
app.get('/api/notifications', authMiddleware, notificationsController.getNotifications);
app.post('/api/notifications/read', authMiddleware, notificationsController.readAllNotifications);

// ─── SCHEDULE ROUTES ──────────────────────────────────────────────────────────
app.get('/api/events', authMiddleware, eventsController.getAll);
app.post('/api/events', authMiddleware, eventsController.create);
app.delete('/api/events/:id', authMiddleware, eventsController.delete);


// ─── AI & INTEGRATION FEATURES ───────────────────────────────────────────────
app.post('/api/ai/summarize', authMiddleware, aiController.summarize);
app.post('/api/ai/improve', authMiddleware, aiController.improve);
app.post('/api/ai/generate-tags', authMiddleware, aiController.generateTags);
app.post('/api/ai/extract-actions', authMiddleware, aiController.extractActions);
app.post('/api/ai/ask-note', authMiddleware, aiController.askNote);
app.post('/api/ai/semantic-search', authMiddleware, aiController.semanticSearch);
app.post('/api/ai/agent-chat', authMiddleware, aiController.agentChat);
app.get('/api/ai/daily-brief', authMiddleware, aiController.getDailyBrief);
app.post('/api/ai/prepare-day', authMiddleware, aiController.prepareDay);
app.get('/api/ai/knowledge-graph', authMiddleware, aiController.getKnowledgeGraph);
app.post('/api/ai/generate-mcqs', authMiddleware, aiController.generateMCQs);
app.post('/api/ai/generate-quiz', authMiddleware, aiController.generateQuiz);


// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', database: sequelize.options.dialect }));

// Synchronize database schemas and boot server
const syncDb = async () => {
  try {
    // Disable foreign keys check temporarily to bypass SQLite alter table constraints limits
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    await sequelize.sync({ alter: true });
    await sequelize.query('PRAGMA foreign_keys = ON;');
    console.log('Database schemas synced successfully.');

    // Safely drop legacy Postgres constraints if running in production
    if (sequelize.options.dialect !== 'sqlite') {
      try {
        await sequelize.query('ALTER TABLE "FriendRequests" DROP CONSTRAINT IF EXISTS "FriendRequests_senderId_key";');
        await sequelize.query('ALTER TABLE "FriendRequests" DROP CONSTRAINT IF EXISTS "FriendRequests_senderid_key";');
        await sequelize.query('ALTER TABLE "FriendRequests" DROP CONSTRAINT IF EXISTS "FriendRequests_receiverId_key";');
        await sequelize.query('ALTER TABLE "FriendRequests" DROP CONSTRAINT IF EXISTS "FriendRequests_receiverid_key";');
        await sequelize.query('ALTER TABLE "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_userId_key";');
        await sequelize.query('ALTER TABLE "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_userid_key";');
        await sequelize.query('ALTER TABLE "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_friendId_key";');
        await sequelize.query('ALTER TABLE "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_friendid_key";');
        await sequelize.query('ALTER TABLE "NoteShares" DROP CONSTRAINT IF EXISTS "NoteShares_sharedWithUserId_key";');
        await sequelize.query('ALTER TABLE "NoteShares" DROP CONSTRAINT IF EXISTS "NoteShares_sharedwithuserid_key";');
        await sequelize.query('ALTER TABLE "NoteShares" DROP CONSTRAINT IF EXISTS "NoteShares_noteId_key";');
        await sequelize.query('ALTER TABLE "NoteShares" DROP CONSTRAINT IF EXISTS "NoteShares_noteid_key";');
        console.log('Production unique constraints sanitized successfully.');
      } catch (dbErr) {
        console.warn('Postgres constraint sanitization warning:', dbErr.message);
      }
    }
    
    app.listen(PORT, () => {
      console.log(`Server successfully started on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database connection synchronization failed:', err);
  }
};

syncDb();
