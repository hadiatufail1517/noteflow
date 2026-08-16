import React, { useState } from 'react';

function NoteForm({ note, onClose, onSave }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [category, setCategory] = useState(note?.category || 'General');
  const [tags, setTags] = useState(
    note?.Tags ? note.Tags.map((t) => t.name).join(', ') : ''
  );
  const [pinned, setPinned] = useState(note?.pinned || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');

    // Parse comma-separated tags string into a clean array of lowercase strings
    const tagsArray = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || 'General',
        tags: tagsArray,
        pinned
      });
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to save note');
      setSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={note ? 'Edit Note' : 'New Note'}>
        <div className="modal-header">
          <span className="modal-title">{note ? 'Edit Note Settings' : 'New Note'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="auth-error" style={{ marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="note-title">
              Title
            </label>
            <input
              id="note-title"
              className="form-input"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="note-category">
              Category
            </label>
            <input
              id="note-category"
              className="form-input"
              placeholder="e.g. Work, Study, Finance..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="note-tags">
              Tags (comma-separated)
            </label>
            <input
              id="note-tags"
              className="form-input"
              placeholder="e.g. react, node, tutorial"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="note-content">
              Content
            </label>
            <textarea
              id="note-content"
              className="form-textarea"
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ minHeight: '150px' }}
            />
          </div>

          <label className="pin-toggle" style={{ margin: '16px 0 24px' }}>
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            <span className="pin-toggle-label">📌 Pin this note</span>
          </label>

          <div className="form-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={!title.trim() || saving}
            >
              {saving ? '...' : note ? '✓ Save Changes' : '+ Create Note'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoteForm;
