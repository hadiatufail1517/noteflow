import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

function NoteApp() {
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const savedNotes = JSON.parse(localStorage.getItem('notes')) || [];
    setNotes(savedNotes);
  }, []);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  const handleInputChange = (event) => {
    setNoteInput(event.target.value);
  };

  const addNote = useCallback(() => {
    if (noteInput.trim() !== '') {
      setNotes((prevNotes) => [...prevNotes, noteInput.trim()]);
      setNoteInput('');
    }
  }, [noteInput]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [notes]);

  const noteCount = useMemo(() => notes.length, [notes]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h1>Note-Taking App</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          ref={inputRef}
          type="text"
          value={noteInput}
          onChange={handleInputChange}
          placeholder="Enter your note here..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button onClick={addNote} style={{ padding: '10px 20px', borderRadius: '4px', border: 'none', background: '#007bff', color: '#fff', cursor: 'pointer' }}>
          Add Note
        </button>
      </div>
      <p style={{ fontWeight: 'bold' }}>Total Notes: {noteCount}</p>
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {notes.map((note, index) => (
          <li key={index} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

export default NoteApp;
