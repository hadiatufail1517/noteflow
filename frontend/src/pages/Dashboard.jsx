import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotes } from '../context/NotesContext';
import { aiAPI } from '../services/api';
import NoteCard from '../components/NoteCard';
import NoteForm from '../components/NoteForm';
import SearchBar from '../components/SearchBar';
import NoteDetailModal from '../components/NoteDetailModal';
import YourDayWidget from '../components/YourDayWidget';


function Dashboard() {
  const { notes, loading, error, addNote, updateNote, deleteNote, togglePin, fetchNotes } = useNotes();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter') || 'all';

  // State Management
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState('normal'); // normal | semantic
  const [semanticResults, setSemanticResults] = useState([]);
  const [semanticLoading, setSemanticLoading] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | alphabetical
  
  const [modal, setModal] = useState(null); // 'create' | noteObject
  const [viewingNoteId, setViewingNoteId] = useState(null); // ID of note open in detail modal
  const [confirmDelId, setConfirmDelId] = useState(null);

  // Sync route filters (pinned/all) with category state
  useEffect(() => {
    if (filterParam === 'pinned') {
      setSelectedCategory('pinned');
    } else {
      setSelectedCategory('all');
    }
  }, [filterParam]);

  // Reset active note when search parameters change (sidebar navigation)
  useEffect(() => {
    setViewingNoteId(null);
  }, [searchParams]);

  // Fetch filtered/sorted list from backend
  const triggerFetch = useCallback(() => {
    if (searchType === 'semantic') return; // Handled by separate trigger
    
    const queryParams = {
      sort: sortBy
    };
    if (search.trim()) queryParams.search = search.trim();
    if (selectedCategory !== 'all' && selectedCategory !== 'pinned') {
      queryParams.category = selectedCategory;
    }
    if (selectedTag !== 'all') {
      queryParams.tag = selectedTag;
    }

    fetchNotes(queryParams);
  }, [search, selectedCategory, selectedTag, sortBy, searchType, fetchNotes]);

  // Trigger fetch when parameters change
  useEffect(() => {
    triggerFetch();
  }, [selectedCategory, selectedTag, sortBy, triggerFetch]);

  // Handle semantic search trigger
  const handleSemanticSearch = async () => {
    if (!search.trim()) {
      setSemanticResults([]);
      return;
    }
    setSemanticLoading(true);
    try {
      const res = await aiAPI.semanticSearch(search.trim());
      setSemanticResults(res.results || []);
    } catch (err) {
      console.error(err);
      setSemanticResults([]);
    } finally {
      setSemanticLoading(false);
    }
  };

  // Toggle search types
  useEffect(() => {
    if (searchType === 'normal') {
      setSemanticResults([]);
      triggerFetch();
    } else {
      handleSemanticSearch();
    }
  }, [searchType]);

  // Execute search when typing or hitting Enter
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchType === 'semantic') {
      handleSemanticSearch();
    } else {
      triggerFetch();
    }
  };

  // Extract unique categories and tags dynamically from notes
  const categoriesList = useMemo(() => {
    const list = notes.map((n) => n.category).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [notes]);

  const tagsList = useMemo(() => {
    const list = notes.flatMap((n) => n.Tags ? n.Tags.map((t) => t.name) : []).filter(Boolean);
    return ['all', ...new Set(list)];
  }, [notes]);

  const filteredNotes = useMemo(() => {
    // If pinned filter is active in Navbar/Params
    if (selectedCategory === 'pinned') {
      return notes.filter(n => n.pinned);
    }
    return notes;
  }, [notes, selectedCategory]);

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const handleSave = async (data) => {
    if (modal && modal.id) {
      await updateNote(modal.id, data);
    } else {
      await addNote(data);
    }
    setModal(null);
  };

  const handleDelete = async () => {
    if (confirmDelId) {
      await deleteNote(confirmDelId);
      setConfirmDelId(null);
    }
  };

  // Today activity counter
  const todayCount = notes.filter((n) => {
    const d = new Date(n.createdAt);
    return d.toDateString() === new Date().toDateString();
  }).length;

  if (viewingNoteId) {
    return (
      <NoteDetailModal
        noteId={viewingNoteId}
        onClose={() => { setViewingNoteId(null); triggerFetch(); }}
        isFullPage={true}
      />
    );
  }

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <div>
          <div className="page-title">📝 My Knowledge Hub</div>
          <div className="page-subtitle">
            {notes.length} notes · {notes.filter((n) => n.pinned).length} pinned
          </div>
        </div>
        <div className="top-actions">
          <button className="btn-primary" onClick={() => setModal('create')}>
            + New Note
          </button>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{notes.length}</div>
          <div className="stat-label">Total Notes</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{notes.filter((n) => n.pinned).length}</div>
          <div className="stat-label">Pinned</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{todayCount}</div>
          <div className="stat-label">Added Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">
            {notes.filter((n) => n.content && n.content.length > 200).length}
          </div>
          <div className="stat-label">Long Read</div>
        </div>
      </div>

      {/* 🧠 Your Day Section */}
      <YourDayWidget onViewNote={setViewingNoteId} />


      {/* Search Console */}
      <div className="search-console-card">
        <form onSubmit={handleSearchSubmit} className="search-form-row">
          <input
            className="search-input-main"
            placeholder={searchType === 'semantic' ? '🔍 Describe concepts to search semantically (e.g. "React layout modules")...' : '🔍 Search note title or content keyword...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>

        <div className="search-options-row">
          <div className="search-type-toggle">
            <span className="toggle-label">Search Method:</span>
            <label className="toggle-chip">
              <input
                type="radio"
                name="searchType"
                value="normal"
                checked={searchType === 'normal'}
                onChange={() => setSearchType('normal')}
              />
              <span>Keyword Match</span>
            </label>
            <label className="toggle-chip">
              <input
                type="radio"
                name="searchType"
                value="semantic"
                checked={searchType === 'semantic'}
                onChange={() => setSearchType('semantic')}
              />
              <span>🤖 AI Semantic Search (RAG)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Filter and Sorting Row */}
      {searchType === 'normal' && (
        <div className="filters-row">
          <div className="filter-select-group">
            <span className="filter-label-text">Category:</span>
            <select className="filter-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-group">
            <span className="filter-label-text">Tag:</span>
            <select className="filter-select" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
              <option value="all">All Tags</option>
              {tagsList.filter(t => t !== 'all').map(tag => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-group">
            <span className="filter-label-text">Sort by:</span>
            <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="dashboard-layout">
        <div className="notes-main">
          
          {/* SEMANTIC SEARCH RESULTS STATE */}
          {searchType === 'semantic' ? (
            semanticLoading ? (
              <div className="empty-state">⏳ Querying vector database chunks...</div>
            ) : semanticResults.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">No matching notes found semantically.</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
                  Type a concept query like "React component props" or "API secrets setup".
                </p>
              </div>
            ) : (
              <div>
                <div className="notes-section-label">🤖 SEMANTIC CLUSTERS (Sorted by Relevance)</div>
                <div className="semantic-results-grid">
                  {semanticResults.map((res, i) => (
                    <div key={i} className="semantic-card" onClick={() => setViewingNoteId(res.noteId)}>
                      <div className="semantic-card-header">
                        <span className="semantic-title">{res.noteTitle}</span>
                        <span className="semantic-score">🔥 {Math.round(res.score * 100)}% Match</span>
                      </div>
                      <div className="semantic-card-body">
                        <p>... {res.content} ...</p>
                      </div>
                      <div className="semantic-card-footer">
                        <span className="tag-pill">{res.category || 'General'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            
            /* NORMAL NOTE GRID FLOW */
            loading ? (
              <div className="empty-state">⏳ Loading notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <div className="empty-title">
                  {search ? 'No search results found.' : 'No notes written yet.'}
                </div>
                {!search && (
                  <button className="btn-primary" onClick={() => setModal('create')}>
                    + Create Note
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Pinned notes row */}
                {pinnedNotes.length > 0 && (
                  <>
                    <div className="notes-section-label">📌 PINNED NOTES</div>
                    <div className="notes-grid">
                      {pinnedNotes.map((n) => (
                        <NoteCard
                          key={n.id}
                          note={n}
                          onView={setViewingNoteId}
                          onEdit={setModal}
                          onDelete={setConfirmDelId}
                          onTogglePin={togglePin}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Unpinned notes row */}
                {unpinnedNotes.length > 0 && (
                  <>
                    {pinnedNotes.length > 0 && (
                      <div className="notes-section-label" style={{ marginTop: 32 }}>OTHER NOTES</div>
                    )}
                    <div className="notes-grid">
                      {unpinnedNotes.map((n) => (
                        <NoteCard
                          key={n.id}
                          note={n}
                          onView={setViewingNoteId}
                          onEdit={setModal}
                          onDelete={setConfirmDelId}
                          onTogglePin={togglePin}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )
          )}
        </div>
      </div>

      {/* Modals and Overlays */}
      {modal && (
        <NoteForm
          note={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}



      {confirmDelId && (
        <DeleteConfirm
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelId(null)}
        />
      )}
    </>
  );
}

// Delete confirmation dialog
function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Delete Note?</span>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            This action cannot be undone and will delete associated vector indices.
          </p>
          <div className="form-actions">
            <button className="btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn-danger" onClick={onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;