import React, { useState, useEffect } from 'react';
import { sharesAPI } from '../services/api';
import NoteDetailModal from './NoteDetailModal';

function FriendProfileDrawer({ friend, onClose }) {
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  useEffect(() => {
    const fetchSharedWithMe = async () => {
      setLoading(true);
      try {
        const allShared = await sharesAPI.getSharedWithMe();
        // Filter notes shared by this specific friend
        const filtered = allShared.filter(
          n => n.ownerName.toLowerCase() === friend.name.toLowerCase()
        );
        setSharedNotes(filtered);
      } catch (err) {
        console.error('Failed to load friend profile shares:', err);
      } finally {
        setLoading(false);
      }
    };

    if (friend) {
      fetchSharedWithMe();
    }
  }, [friend]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'stretch' }}>
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          width: '400px',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--glass-border)',
          padding: '30px 24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(15px)',
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <span style={{ fontWeight: '700', fontSize: '16px', color: '#fff' }}>Friend Profile</span>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {/* Drawer Profile Card */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '16px',
            boxShadow: '0 0 20px rgba(20, 184, 166, 0.2)'
          }}>
            {friend.avatar}
          </div>
          <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>{friend.name}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>{friend.email}</p>

          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            padding: '10px 20px',
            fontSize: '13px',
            color: '#fff'
          }}>
            Shared Notes: <strong style={{ color: 'var(--neon-pink)' }}>{sharedNotes.length}</strong>
          </div>
        </div>

        {/* Shared documents list */}
        <h4 style={{ color: '#fff', fontSize: '14px', marginBottom: '12px' }}>Shared Notes by {friend.name}</h4>
        
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>Loading list...</div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sharedNotes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '30px' }}>
                No notes shared with you by this user yet.
              </div>
            ) : (
              sharedNotes.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => setSelectedNoteId(note.id)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s, border-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'var(--neon-pink)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>{note.title}</span>
                    <span style={{
                      fontSize: '10px',
                      background: note.permission === 'edit' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(255,255,255,0.05)',
                      color: note.permission === 'edit' ? 'var(--neon-pink)' : 'var(--text-muted)',
                      padding: '2px 6px',
                      borderRadius: '8px'
                    }}>
                      {note.permission === 'edit' ? 'Can Edit' : 'View Only'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {note.content || 'No content written.'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Note detail modal */}
        {selectedNoteId && (
          <NoteDetailModal 
            noteId={selectedNoteId} 
            onClose={() => setSelectedNoteId(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default FriendProfileDrawer;
