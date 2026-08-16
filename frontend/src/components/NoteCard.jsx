import React from 'react';
import { fmtDate } from '../utils/localStorage';

function NoteCard({ note, onView, onEdit, onDelete, onTogglePin }) {
  return (
    <div className={`note-card${note.pinned ? ' pinned' : ''}`} onClick={() => onView(note.id)}>
      <div className="card-header">
        <div className="card-category-badge">{note.category || 'General'}</div>
        <div className="card-actions">
          <button
            className={`card-action-btn pin${note.pinned ? ' pinned' : ''}`}
            title={note.pinned ? 'Unpin' : 'Pin'}
            onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
          >
            {note.pinned ? '📌' : '📍'}
          </button>
          <button
            className="card-action-btn edit"
            title="Edit Settings"
            onClick={(e) => { e.stopPropagation(); onEdit(note); }}
          >
            ✏️
          </button>
          <button
            className="card-action-btn delete"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="card-title">{note.title}</div>
        
        {/* Render tags */}
        {note.Tags && note.Tags.length > 0 && (
          <div className="card-tags-list">
            {note.Tags.map((tag) => (
              <span key={tag.id || tag.name} className="card-tag-pill">
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="card-content">
          {note.content ? (
            note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '')
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No content
            </span>
          )}
        </div>
      </div>

      <div className="card-footer">
        <span className="card-date">{fmtDate(note.createdAt)}</span>
        {note.pinned && (
          <span className="pin-badge">📌 Pinned</span>
        )}
      </div>
    </div>
  );
}

export default NoteCard;
