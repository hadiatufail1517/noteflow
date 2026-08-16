import React, { useState, useEffect, useRef } from 'react';
import { aiAPI, friendsAPI, sharesAPI, usersAPI, relatedNotesAPI } from '../services/api';
import { useNotes } from '../context/NotesContext';
import { fmtDate } from '../utils/localStorage';
import axios from 'axios';

function NoteDetailModal({ noteId, onClose, isFullPage = false }) {
  const { deleteNote } = useNotes();

  // Track the currently displayed note ID locally (enables clicking related notes to open them)
  const [currentNoteId, setCurrentNoteId] = useState(noteId);

  // Sync state if prop changes
  useEffect(() => {
    setCurrentNoteId(noteId);
  }, [noteId]);

  // Note details loaded from API
  const [note, setNote] = useState(null);
  const [loadingNote, setLoadingNote] = useState(true);
  const [noteError, setNoteError] = useState('');

  // Editing Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Tabs View Control
  const [activeTab, setActiveTab] = useState('view'); // view | summarize | improve | tags | actions | chat | connections | mcqs | quiz
  const [loading, setLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // AI State storage
  const [summary, setSummary] = useState('');
  const [improvedText, setImprovedText] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [actions, setActions] = useState('');
  const [mcqs, setMcqs] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [showMcqAnswers, setShowMcqAnswers] = useState(false);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // AI Connections (Related Notes)
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  // Chat state storage
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]); // { role: 'user'|'ai', text: string }
  const chatEndRef = useRef(null);

  // Sharing states for note owners
  const [shares, setShares] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [shareLoading, setShareLoading] = useState(false);

  // Email existence checking states
  const [emailInput, setEmailInput] = useState('');
  const [emailCheckResult, setEmailCheckResult] = useState(null); // { exists: boolean, user?: object }
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const checkTimerRef = useRef(null);

  const handleLoadConnections = async (id = currentNoteId) => {
    setLoadingConnections(true);
    setAiError('');
    try {
      const res = await relatedNotesAPI.getRelated(id);
      setConnections(res || []);
    } catch (err) {
      console.error(err);
      setAiError(err.response?.data?.message || 'Failed to fetch AI connections.');
    } finally {
      setLoadingConnections(false);
    }
  };

  // Fetch Note Details on mount or note switch
  const fetchNoteDetail = async () => {
    setLoadingNote(true);
    setNoteError('');
    try {
      const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('noteflow_token')?.replace(/"/g, ''); // strip quotes
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.get(`${BASE_URL}/notes/${currentNoteId}`, { headers });
      const fetchedNote = res.data;
      setNote(fetchedNote);

      // Populate edit fields
      setEditTitle(fetchedNote.title || '');
      setEditContent(fetchedNote.content || '');
      setEditCategory(fetchedNote.category || 'General');
      setEditTags(fetchedNote.Tags ? fetchedNote.Tags.map(t => t.name) : []);

      // If owner, fetch shares and friends
      if (fetchedNote.permission === 'owner') {
        const activeShares = await sharesAPI.getNoteShares(currentNoteId);
        setShares(activeShares);

        const friendsList = await friendsAPI.getAll();
        setFriends(friendsList);
        if (friendsList.length > 0) {
          setSelectedFriendId(friendsList[0].id);
        }
      }
    } catch (err) {
      setNoteError(err.response?.data?.message || 'Failed to fetch note detail.');
    } finally {
      setLoadingNote(false);
    }
  };

  useEffect(() => {
    if (currentNoteId) {
      fetchNoteDetail();
      setActiveTab('view');
      setConnections([]);
      setAiError('');
    }
  }, [currentNoteId]);


  // Sync scroll on chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  if (loadingNote) {
    return (
      <div className="modal-overlay">
        <div className="detail-modal-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div style={{ color: 'var(--text-muted)' }}>Loading note contents...</div>
        </div>
      </div>
    );
  }

  if (noteError || !note) {
    return (
      <div className="modal-overlay">
        <div className="detail-modal-box" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>⚠️ {noteError || 'Note not found.'}</div>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const isOwner = note.permission === 'owner';
  const canEdit = isOwner || note.permission === 'edit';

  // AI Pipeline triggers
  const handleSummarize = async () => {
    if (summary) return;
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.summarize(note.content);
      setSummary(res.summary);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    if (improvedText) return;
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.improve(note.content);
      setImprovedText(res.improved);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to improve writing.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyImprovement = async () => {
    if (!improvedText || !canEdit) return;
    setLoading(true);
    try {
      const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('noteflow_token')?.replace(/"/g, '');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.put(`${BASE_URL}/notes/${note.id}`, { content: improvedText }, { headers });

      setNote(prev => ({ ...prev, content: improvedText }));
      setEditContent(improvedText);
      setImprovedText('');
      setActiveTab('view');
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to update note.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTags = async () => {
    if (suggestedTags.length > 0) return;
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.generateTags(note.content);
      setSuggestedTags(res.tags || []);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to generate tags.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTag = async (tagName) => {
    if (!canEdit) return;
    const existingNames = editTags;
    if (existingNames.includes(tagName.toLowerCase())) return;

    setLoading(true);
    try {
      const updatedTags = [...existingNames, tagName.toLowerCase()];
      const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('noteflow_token')?.replace(/"/g, '');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.put(`${BASE_URL}/notes/${note.id}`, { tags: updatedTags }, { headers });

      setEditTags(updatedTags);
      setNote(prev => ({
        ...prev,
        Tags: updatedTags.map((name, i) => ({ id: i, name }))
      }));
      setSuggestedTags(prev => prev.filter(t => t.toLowerCase() !== tagName.toLowerCase()));
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to apply tag.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtractActions = async () => {
    if (actions) return;
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.extractActions(note.content);
      setActions(res.actionItems);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to extract action items.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMCQs = async () => {
    if (mcqs.length > 0) return;
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.generateMCQs(note.content);
      setMcqs(res.mcqs || []);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to generate MCQs.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (quiz.length > 0) return;
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.generateQuiz(note.content);
      setQuiz(res.quiz || []);
      setQuizCurrentIndex(0);
      setQuizAnswers({});
      setQuizSubmitted(false);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQuiz = async () => {
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.generateQuiz(note.content);
      setQuiz(res.quiz || []);
      setQuizCurrentIndex(0);
      setQuizAnswers({});
      setQuizSubmitted(false);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizCurrentIndex(0);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userQ = chatInput.trim();
    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', text: userQ }]);
    setLoading(true);
    setAiError('');
    try {
      const res = await aiAPI.askNote(note.id, userQ);
      setChatHistory((prev) => [...prev, { role: 'ai', text: res.answer }]);
    } catch (err) {
      setAiError(err.response?.data?.message || 'Failed to fetch answer.');
      setChatHistory((prev) => [...prev, { role: 'ai', text: '⚠️ Error: Failed to generate response.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrigger = () => {
    if (window.confirm('Are you sure you want to permanently delete this note?')) {
      deleteNote(note.id);
      onClose();
    }
  };

  // In-place saving actions
  const handleEditSave = async () => {
    if (!editTitle.trim()) {
      alert('Title is required');
      return;
    }
    setLoading(true);
    try {
      const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('noteflow_token')?.replace(/"/g, '');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.put(`${BASE_URL}/notes/${note.id}`, {
        title: editTitle,
        content: editContent,
        category: editCategory,
        tags: editTags
      }, { headers });

      setNote(res.data);
      setIsEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTagInput = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().toLowerCase();
    if (!editTags.includes(cleanTag)) {
      setEditTags([...editTags, cleanTag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagName) => {
    setEditTags(editTags.filter(t => t !== tagName));
  };

  // Email check lookup
  const checkEmailOnBackend = async (emailToQuery) => {
    if (!emailToQuery) {
      setEmailCheckResult(null);
      setEmailError('');
      return;
    }
    setCheckingEmail(true);
    setEmailError('');
    setEmailCheckResult(null);
    try {
      const res = await usersAPI.checkEmail(emailToQuery);
      setEmailCheckResult(res);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setEmailError('Invalid email address');
      } else {
        setEmailError('Error checking email verification status');
      }
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailInputChange = (e) => {
    const val = e.target.value;
    setEmailInput(val);
    setEmailError('');
    setEmailCheckResult(null);

    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }

    checkTimerRef.current = setTimeout(() => {
      checkEmailOnBackend(val);
    }, 600);
  };

  const handleEmailInputBlur = () => {
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }
    checkEmailOnBackend(emailInput);
  };

  // Share actions
  const handleShareSubmit = async () => {
    if (!emailInput) return;
    setShareLoading(true);
    try {
      if (emailCheckResult && emailCheckResult.exists) {
        await sharesAPI.share(note.id, emailCheckResult.user.id, sharePermission);
      } else {
        await sharesAPI.invite(note.id, emailInput, 'view');
      }
      setShowShareModal(false);
      setEmailInput('');
      setEmailCheckResult(null);
      setEmailError('');

      // Refresh shares list
      const activeShares = await sharesAPI.getNoteShares(note.id);
      setShares(activeShares);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete sharing operation.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleUpdateShare = async (shareId, newPerm) => {
    try {
      await sharesAPI.updatePermission(note.id, shareId, newPerm);
      const activeShares = await sharesAPI.getNoteShares(note.id);
      setShares(activeShares);
    } catch (err) {
      alert('Failed to update share permission.');
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!window.confirm('Revoke access for this user?')) return;
    try {
      await sharesAPI.removeShare(note.id, shareId);
      const activeShares = await sharesAPI.getNoteShares(note.id);
      setShares(activeShares);
    } catch (err) {
      alert('Failed to revoke access.');
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!window.confirm('Revoke pending invitation?')) return;
    try {
      await sharesAPI.removeInvitation(note.id, invitationId);
      const activeShares = await sharesAPI.getNoteShares(note.id);
      setShares(activeShares);
    } catch (err) {
      alert('Failed to revoke invitation.');
    }
  };

  return (
    <div className={isFullPage ? "full-page-container" : "modal-overlay"} onClick={(e) => !isFullPage && e.target === e.currentTarget && onClose()}>
      <div 
        className="detail-modal-box" 
        style={isFullPage ? { 
          width: '100%', 
          maxWidth: 'none', 
          height: 'calc(100vh - 120px)', 
          margin: '0', 
          animation: 'none', 
          boxShadow: 'none',
          background: 'rgba(16, 12, 28, 0.55)'
        } : { maxWidth: '900px' }}
      >

        {/* Header */}
        <div className="detail-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="detail-meta" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="detail-category">{note.category || 'General'}</span>
            <span className="detail-date">Updated: {fmtDate(note.updatedAt)}</span>

            {/* Permission Badges */}
            {note.isShared && (
              <span style={{
                background: note.permission === 'edit' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: note.permission === 'edit' ? 'var(--neon-pink)' : 'var(--danger)',
                border: `1px solid ${note.permission === 'edit' ? 'rgba(20, 184, 166, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '20px'
              }}>
                {note.permission === 'edit' ? '🤝 Can Edit' : '🛡️ View Only'}
              </span>
            )}
            {note.isShared && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shared by {note.ownerName}</span>
            )}
          </div>

          <div className="detail-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {canEdit && !isEditing && (
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', color: '#fff' }}
                onClick={() => setIsEditing(true)}
              >
                ✏️ Edit Note
              </button>
            )}
            {isOwner && (
              <button className="btn-danger-text" onClick={handleDeleteTrigger} title="Delete Note">
                🗑️ Delete
              </button>
            )}
            {isFullPage ? (
              <button 
                onClick={onClose} 
                style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: 'var(--text-secondary)', 
                  padding: '6px 14px', 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                ← Back to Notes
              </button>
            ) : (
              <button className="detail-close-btn" onClick={onClose} aria-label="Close">×</button>
            )}
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="detail-modal-body">

          {/* Left Panel - Note View / Editor */}
          <div className="detail-note-view">
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <div className="form-group">
                  <label className="form-label">Note Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="form-input"
                    rows={12}
                    style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Edit Tags block */}
                <div className="form-group">
                  <label className="form-label">Tags</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {editTags.map(tag => (
                      <span key={tag} className="tag-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', padding: '0' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add custom tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTagInput()}
                      className="form-input"
                      style={{ flex: 1, padding: '6px 12px' }}
                    />
                    <button className="btn-secondary" onClick={handleAddTagInput} style={{ padding: '6px 12px' }}>
                      Add
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleEditSave}>Save Changes</button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="detail-note-title">{note.title}</h2>

                {/* Tag List */}
                <div className="detail-tags-row">
                  {note.Tags && note.Tags.map((tag) => (
                    <span key={tag.id || tag.name} className="tag-pill">#{tag.name}</span>
                  ))}
                </div>

                <div className="detail-note-content" style={{ whiteSpace: 'pre-wrap' }}>
                  {note.content ? (
                    note.content.split('\n').map((para, i) => <p key={i}>{para}</p>)
                  ) : (
                    <span className="no-content-placeholder">No content written yet.</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel - AI Toolbar & Tabs */}
          <div className="detail-ai-panel">
            <div className="ai-tabs-header">
              <button className={`ai-tab-btn${activeTab === 'view' ? ' active' : ''}`} onClick={() => setActiveTab('view')}>ℹ️ Actions</button>
              <button className={`ai-tab-btn${activeTab === 'summarize' ? ' active' : ''}`} onClick={() => { setActiveTab('summarize'); handleSummarize(); }}>⚡ Summarize</button>
              <button className={`ai-tab-btn${activeTab === 'mcqs' ? ' active' : ''}`} onClick={() => { setActiveTab('mcqs'); handleGenerateMCQs(); }}>📝 MCQs</button>
              <button className={`ai-tab-btn${activeTab === 'quiz' ? ' active' : ''}`} onClick={() => { setActiveTab('quiz'); handleGenerateQuiz(); }}>🎮 Quiz</button>
              <button className={`ai-tab-btn${activeTab === 'improve' ? ' active' : ''}`} onClick={() => { setActiveTab('improve'); handleImprove(); }}>✏️ Improve</button>
              <button className={`ai-tab-btn${activeTab === 'tags' ? ' active' : ''}`} onClick={() => { setActiveTab('tags'); handleGenerateTags(); }}>🏷️ Tags</button>
              <button className={`ai-tab-btn${activeTab === 'actions' ? ' active' : ''}`} onClick={() => { setActiveTab('actions'); handleExtractActions(); }}>✅ Tasks</button>
              <button className={`ai-tab-btn${activeTab === 'connections' ? ' active' : ''}`} onClick={() => { setActiveTab('connections'); handleLoadConnections(); }}>🔗 AI Connections</button>
              <button className={`ai-tab-btn${activeTab === 'chat' ? ' active' : ''}`} onClick={() => setActiveTab('chat')}>💬 Ask AI</button>
            </div>


            <div className="ai-tabs-body">
              {loading && <div className="ai-loading-spinner">🧠 AI is thinking...</div>}
              {aiError && <div className="ai-error-box">⚠️ {aiError}</div>}

              {/* Action summary description */}
              {activeTab === 'view' && (
                <div className="ai-tab-content scrollable">
                  <h4>Note Actions</h4>
                  <p className="ai-intro-text">
                    Polish note structures, synthesize details, or securely collaborate with friends.
                  </p>

                  {isOwner && (
                    <button
                      className="btn-primary"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                      onClick={() => setShowShareModal(true)}
                    >
                      📤 Share note with Friend
                    </button>
                  )}

                  {/* Share Management Section (For note owners only) */}
                  {isOwner && (
                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                      <h5 style={{ color: '#fff', fontSize: '13px', marginBottom: '10px' }}>Active Collaborators</h5>
                      {shares.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not shared with anyone yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {shares.map(s => (
                            <div
                              key={s.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                padding: '8px 10px',
                                borderRadius: '6px'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ color: '#fff', fontWeight: '600' }}>{s.sharedWithUser?.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{s.sharedWithUser?.email}</div>
                                <div style={{
                                  color: s.type === 'invitation' ? '#f59e0b' : (s.permission === 'edit' ? 'var(--neon-pink)' : 'var(--text-muted)'),
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  marginTop: '2px'
                                }}>
                                  {s.type === 'invitation' ? `Pending Invitation (${s.permission === 'edit' ? 'Can Edit' : 'View Only'})` : (s.permission === 'edit' ? 'Can Edit' : 'View Only')}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {s.type === 'share' && (
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '10px', height: 'auto' }}
                                    onClick={() => handleUpdateShare(s.id, s.permission === 'edit' ? 'view' : 'edit')}
                                  >
                                    Modify
                                  </button>
                                )}
                                <button
                                  className="btn-danger"
                                  style={{ padding: '4px 8px', fontSize: '10px', height: 'auto' }}
                                  onClick={() => s.type === 'invitation' ? handleRevokeInvitation(s.id) : handleRevokeShare(s.id)}
                                >
                                  Revoke
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="ai-shortcuts-list" style={{ marginTop: '20px' }}>
                    <div className="shortcut-card" onClick={() => { setActiveTab('summarize'); handleSummarize(); }}>
                      <strong>⚡ Summarize Note</strong>
                      <span>Produce a clean bulleted markdown summary.</span>
                    </div>
                    <div className="shortcut-card" onClick={() => { setActiveTab('mcqs'); handleGenerateMCQs(); }}>
                      <strong>📝 Generate Study MCQs</strong>
                      <span>Make 4-5 choice questions with answers and explanations.</span>
                    </div>
                    <div className="shortcut-card" onClick={() => { setActiveTab('quiz'); handleGenerateQuiz(); }}>
                      <strong>🎮 Take Interactive Quiz</strong>
                      <span>Test your understanding step-by-step with scores.</span>
                    </div>
                    <div className="shortcut-card" onClick={() => { setActiveTab('improve'); handleImprove(); }}>
                      <strong>✏️ Improve Writing</strong>
                      <span>Refactor grammar, clarity, and readability.</span>
                    </div>
                    <div className="shortcut-card" onClick={() => { setActiveTab('tags'); handleGenerateTags(); }}>
                      <strong>🏷️ Generate Tag Suggestions</strong>
                      <span>Extract keyword descriptors based on content.</span>
                    </div>
                    <div className="shortcut-card" onClick={() => { setActiveTab('actions'); handleExtractActions(); }}>
                      <strong>✅ Extract Action Items</strong>
                      <span>Identify and build checklist items.</span>
                    </div>
                    <div className="shortcut-card" onClick={() => setActiveTab('chat')}>
                      <strong>💬 Ask Note Questions</strong>
                      <span>Interact with the note contents directly.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Summarize Tab */}
              {activeTab === 'summarize' && summary && (
                <div className="ai-tab-content scrollable">
                  <h4>AI Summary</h4>
                  <div className="ai-result-markdown">
                    {summary.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                </div>
              )}

              {/* MCQs Tab */}
              {activeTab === 'mcqs' && mcqs && (
                <div className="ai-tab-content scrollable">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0 }}>AI Generated MCQs</h4>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setShowMcqAnswers(!showMcqAnswers)}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      {showMcqAnswers ? '🙈 Hide Answers' : '👁️ Reveal Answers'}
                    </button>
                  </div>
                  <div className="mcq-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {mcqs.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No MCQs generated.</p>
                    ) : (
                      mcqs.map((mcq, idx) => (
                        <div key={idx} className="mcq-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                          <h5 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px', lineHeight: '1.4' }}>{idx + 1}. {mcq.question}</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {mcq.options.map((opt, oIdx) => {
                              const isCorrect = oIdx === mcq.answerIndex;
                              return (
                                <div 
                                  key={oIdx} 
                                  style={{ 
                                    padding: '8px 12px', 
                                    borderRadius: '6px', 
                                    fontSize: '13px',
                                    background: showMcqAnswers && isCorrect ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.02)',
                                    border: showMcqAnswers && isCorrect ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                                    color: showMcqAnswers && isCorrect ? 'var(--neon-purple)' : 'var(--text-secondary)'
                                  }}
                                >
                                  {String.fromCharCode(65 + oIdx)}. {opt}
                                </div>
                              );
                            })}
                          </div>
                          {showMcqAnswers && mcq.explanation && (
                            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--neon-purple)', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                              <strong>Explanation:</strong> {mcq.explanation}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Quiz Tab */}
              {activeTab === 'quiz' && quiz && (
                <div className="ai-tab-content scrollable">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0 }}>Interactive Quiz</h4>
                    {quiz.length > 0 && (
                      <button 
                        className="btn-secondary" 
                        onClick={handleRegenerateQuiz}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        🔄 Regenerate Questions
                      </button>
                    )}
                  </div>
                  {quiz.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No quiz questions generated.</p>
                  ) : !quizSubmitted ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        <span>Question {quizCurrentIndex + 1} of {quiz.length}</span>
                        <span>{Math.round((quizCurrentIndex / quiz.length) * 100)}% Complete</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginBottom: '20px', overflow: 'hidden' }}>
                        <div style={{ width: `${(quizCurrentIndex / quiz.length) * 100}%`, height: '100%', background: 'var(--grad-primary)', transition: 'width 0.3s' }}></div>
                      </div>

                      <div className="mcq-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <h5 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px', lineHeight: '1.4' }}>
                          {quiz[quizCurrentIndex].question}
                        </h5>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {quiz[quizCurrentIndex].options.map((opt, oIdx) => {
                            const isSelected = quizAnswers[quizCurrentIndex] === oIdx;
                            const isCorrect = oIdx === quiz[quizCurrentIndex].answerIndex;
                            const hasAnswered = quizAnswers[quizCurrentIndex] !== undefined;

                            let optionBg = 'rgba(255,255,255,0.02)';
                            let optionBorder = '1px solid rgba(255,255,255,0.05)';
                            let optionColor = 'var(--text-secondary)';

                            if (hasAnswered) {
                              if (isCorrect) {
                                optionBg = 'rgba(20, 184, 166, 0.15)';
                                optionBorder = '1px solid rgba(20, 184, 166, 0.4)';
                                optionColor = 'var(--neon-pink)';
                              } else if (isSelected) {
                                optionBg = 'rgba(239, 68, 68, 0.15)';
                                optionBorder = '1px solid rgba(239, 68, 68, 0.4)';
                                optionColor = 'var(--danger)';
                              }
                            } else if (isSelected) {
                              optionBg = 'rgba(168, 85, 247, 0.15)';
                              optionBorder = '1px solid var(--neon-purple)';
                              optionColor = '#fff';
                            }

                            return (
                              <button
                                key={oIdx}
                                disabled={hasAnswered}
                                onClick={() => {
                                  setQuizAnswers({
                                    ...quizAnswers,
                                    [quizCurrentIndex]: oIdx
                                  });
                                }}
                                style={{
                                  textAlign: 'left',
                                  padding: '12px 16px',
                                  borderRadius: '8px',
                                  fontSize: '13.5px',
                                  background: optionBg,
                                  border: optionBorder,
                                  color: optionColor,
                                  transition: 'all 0.2s',
                                  cursor: hasAnswered ? 'default' : 'pointer'
                                }}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt}
                              </button>
                            );
                          })}
                        </div>

                        {quizAnswers[quizCurrentIndex] !== undefined && (
                          <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${quizAnswers[quizCurrentIndex] === quiz[quizCurrentIndex].answerIndex ? 'var(--neon-pink)' : 'var(--danger)'}`, fontSize: '13px' }}>
                            <div style={{ fontWeight: '600', color: quizAnswers[quizCurrentIndex] === quiz[quizCurrentIndex].answerIndex ? 'var(--neon-pink)' : 'var(--danger)', marginBottom: '4px' }}>
                              {quizAnswers[quizCurrentIndex] === quiz[quizCurrentIndex].answerIndex ? '✓ Correct Answer!' : '✗ Incorrect Answer'}
                            </div>
                            <span style={{ color: 'var(--text-secondary)' }}>{quiz[quizCurrentIndex].explanation}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                        {quizAnswers[quizCurrentIndex] !== undefined && (
                          quizCurrentIndex < quiz.length - 1 ? (
                            <button
                              className="btn-primary"
                              onClick={() => setQuizCurrentIndex(quizCurrentIndex + 1)}
                              style={{ padding: '8px 20px' }}
                            >
                              Next Question →
                            </button>
                          ) : (
                            <button
                              className="btn-primary"
                              onClick={() => setQuizSubmitted(true)}
                              style={{ padding: '8px 20px', background: 'var(--grad-primary)' }}
                            >
                              Submit Quiz 🎉
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
                      <h5 style={{ color: '#fff', fontSize: '20px', marginBottom: '8px' }}>Quiz Completed!</h5>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        You scored{' '}
                        <strong style={{ color: 'var(--neon-pink)', fontSize: '22px' }}>
                          {quiz.filter((q, i) => quizAnswers[i] === q.answerIndex).length}
                        </strong>{' '}
                        out of <strong style={{ fontSize: '18px' }}>{quiz.length}</strong>
                      </p>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button className="btn-secondary" onClick={handleRetakeQuiz}>
                          🔄 Try Again
                        </button>
                        <button className="btn-primary" onClick={handleRegenerateQuiz}>
                          ⚡ New Quiz
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Improve Tab */}
              {activeTab === 'improve' && improvedText && (
                <div className="ai-tab-content scrollable">
                  <h4>Improved Version</h4>
                  <div className="ai-split-view">
                    <div className="ai-result-markdown improved">
                      {improvedText.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  </div>
                  {canEdit && (
                    <button className="btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={handleApplyImprovement}>
                      ✓ Apply and Overwrite Content
                    </button>
                  )}
                </div>
              )}

              {/* Tags Tab */}
              {activeTab === 'tags' && (
                <div className="ai-tab-content">
                  <h4>Suggested Tags</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    Click a tag to add it to your note:
                  </p>
                  <div className="suggested-tags-container">
                    {suggestedTags.length === 0 ? (
                      <span className="no-suggestions-label">No new tags suggested. All matching tags applied!</span>
                    ) : (
                      suggestedTags.map((t) => (
                        <button
                          key={t}
                          className="tag-suggestion-chip"
                          onClick={() => handleApplyTag(t)}
                          disabled={!canEdit}
                        >
                          + #{t}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === 'actions' && actions && (
                <div className="ai-tab-content scrollable">
                  <h4>Extracted Checklist Tasks</h4>
                  <div className="ai-result-markdown">
                    {actions.split('\n').map((line, i) => {
                      if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
                        const label = line.replace(/^- \[[ x]\]\s*/, '');
                        return (
                          <label key={i} className="task-checkbox-item">
                            <input type="checkbox" disabled checked={line.includes('[x]')} />
                            <span>{label}</span>
                          </label>
                        );
                      }
                      return <p key={i}>{line}</p>;
                    })}
                  </div>
                </div>
              )}

              {/* Ask Note Chat Tab */}
              {activeTab === 'chat' && (
                <div className="ai-chat-tab-container">
                  <div className="ai-chat-messages">
                    {chatHistory.length === 0 ? (
                      <div className="chat-empty-state">
                        Ask any question about this note, e.g. "Summarize the second paragraph" or "What does this note say about React?"
                      </div>
                    ) : (
                      chatHistory.map((h, i) => (
                        <div key={i} className={`chat-bubble-container ${h.role}`}>
                          <div className="chat-bubble">
                            {h.text}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="ai-chat-input-row">
                    <input
                      className="form-input"
                      placeholder="Ask about this note..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    />
                    <button className="btn-primary" onClick={handleSendChat}>Send</button>
                  </div>
                </div>
              )}

              {/* AI Connections Tab */}
              {activeTab === 'connections' && (
                <div className="ai-tab-content scrollable">
                  <h4>🔗 AI Connections</h4>
                  <p className="ai-intro-text" style={{ marginBottom: '16px' }}>
                    Semantic relationships discovered between this note and other notes in your knowledge base.
                  </p>
                  {loadingConnections ? (
                    <div className="ai-loading-spinner" style={{ marginTop: '12px' }}>Analyzing semantic vectors...</div>
                  ) : connections.length === 0 ? (
                    <div className="yd-empty" style={{ marginTop: '20px' }}>No related notes found. Extend notes with more content.</div>
                  ) : (
                    <div className="related-notes-list">
                      {connections.map(item => (
                        <div
                          key={item.id}
                          className="related-note-item"
                          onClick={() => setCurrentNoteId(item.id)}
                        >
                          <div className="related-note-header">
                            <span className="related-note-title">{item.title}</span>
                            <span className="related-note-score">{item.similarity}% related</span>
                          </div>
                          <div className="related-note-footer">
                            <span className="tag-pill" style={{ fontSize: '10px', padding: '2px 6px' }}>{item.category}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}


            </div>
          </div>

        </div>
      </div>

      {/* Share Configuration Modal */}
      {showShareModal && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-box" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">Share Note</span>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter collaborator email..."
                    value={emailInput}
                    onChange={handleEmailInputChange}
                    onBlur={handleEmailInputBlur}
                    className="form-input"
                    style={{ background: 'var(--bg-base)', border: '1px solid var(--glass-border)', color: '#fff', padding: '10px' }}
                  />
                </div>

                {checkingEmail && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Checking email status...
                  </div>
                )}

                {emailError && (
                  <div style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: '600' }}>
                    ⚠️ {emailError}
                  </div>
                )}

                {emailCheckResult && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {emailCheckResult.exists ? (
                      <div>
                        <div style={{ fontSize: '13px', color: '#14b8a6', fontWeight: '600', marginBottom: '16px' }}>
                          ✓ {emailCheckResult.user.name} is on NoteHub
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Permissions</label>
                          <div style={{ display: 'flex', gap: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                              <input
                                type="radio"
                                name="modal-permission"
                                value="view"
                                checked={sharePermission === 'view'}
                                onChange={() => setSharePermission('view')}
                              />
                              View Only
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                              <input
                                type="radio"
                                name="modal-permission"
                                value="edit"
                                checked={sharePermission === 'edit'}
                                onChange={() => setSharePermission('edit')}
                              />
                              Can Edit
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600', marginBottom: '4px' }}>
                          ⚠ This email is not registered on NoteHub.
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Would you like to invite them to NoteHub?
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button className="btn-secondary" onClick={() => setShowShareModal(false)}>Cancel</button>
                  <button
                    className="btn-primary"
                    onClick={handleShareSubmit}
                    disabled={
                      shareLoading || 
                      checkingEmail || 
                      !emailInput || 
                      emailError || 
                      !emailCheckResult
                    }
                  >
                    {shareLoading ? 'Processing...' : (emailCheckResult && !emailCheckResult.exists ? 'Send Invitation' : 'Share Note')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default NoteDetailModal;
