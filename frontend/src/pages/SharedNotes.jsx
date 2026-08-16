import React, { useState, useEffect } from 'react';
import { sharesAPI } from '../services/api';
import { fmtDate } from '../utils/localStorage';
import NoteDetailModal from '../components/NoteDetailModal';

function SharedNotes() {
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected note state for the Detail Modal overlay
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  const fetchSharedNotes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sharesAPI.getSharedWithMe();
      setSharedNotes(data);
    } catch (err) {
      setError('Failed to fetch shared notes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedNotes();
  }, []);

  if (selectedNoteId) {
    return (
      <NoteDetailModal
        noteId={selectedNoteId}
        onClose={() => {
          setSelectedNoteId(null);
          fetchSharedNotes();
        }}
        isFullPage={true}
      />
    );
  }

  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="page-title">📁 Shared With Me</div>
          <div className="page-subtitle">Notes and documents shared with you by other collaborators</div>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: '20px' }}>⚠️ {error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>
          Loading shared files...
        </div>
      ) : (
        <div className="notes-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {sharedNotes.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">📁</div>
              <div className="empty-title">No notes have been shared with you yet</div>
              <div style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '13px' }}>
                Collaborator documents will appear here once shared.
              </div>
            </div>
          ) : (
            sharedNotes.map((note) => (
              <div key={note.id} className="note-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="note-category" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {note.category || 'General'}
                  </span>

                  <span style={{
                    background: note.permission === 'edit' ? 'rgba(20, 184, 166, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: note.permission === 'edit' ? 'var(--neon-pink)' : 'var(--danger)',
                    border: `1px solid ${note.permission === 'edit' ? 'rgba(20, 184, 166, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}>
                    {note.permission === 'edit' ? 'Can Edit' : 'View Only'}
                  </span>
                </div>

                <h3 className="card-title" style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                  {note.title}
                </h3>

                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {note.content || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No content written yet.</span>}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--glass-border)',
                  marginTop: 'auto'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Shared by</span>
                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: '600' }}>{note.ownerName}</span>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => setSelectedNoteId(note.id)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Open Note
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Note Detail modal overlay */}

    </div>
  );
}

export default SharedNotes;
