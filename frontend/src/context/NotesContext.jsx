import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notesAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotesContext = createContext(null);

export function NotesProvider({ children }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotes = useCallback(async (filters = {}) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await notesAPI.getAll(filters);
      setNotes(data);
    } catch (e) {
      setError(e.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load notes when user changes
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    fetchNotes();
  }, [user, fetchNotes]);

  /** Add a new note */
  const addNote = useCallback(
    async ({ title, content, category, pinned, tags }) => {
      const note = await notesAPI.create({ title, content, category, pinned, tags });
      setNotes((prev) => [note, ...prev]);
      return note;
    },
    []
  );

  /** Update an existing note by id */
  const updateNote = useCallback(
    async (id, data) => {
      const updated = await notesAPI.update(id, data);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      return updated;
    },
    []
  );

  /** Delete a note by id */
  const deleteNote = useCallback(
    async (id) => {
      await notesAPI.delete(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    },
    []
  );

  /** Toggle pinned state for a note */
  const togglePin = useCallback(
    async (id) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      await updateNote(id, { pinned: !note.pinned });
    },
    [notes, updateNote]
  );

  return (
    <NotesContext.Provider
      value={{ notes, loading, error, addNote, updateNote, deleteNote, togglePin, fetchNotes }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}

export default NotesContext;
