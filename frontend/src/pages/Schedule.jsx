import React, { useState, useEffect } from 'react';
import { LS } from '../utils/localStorage';
import { eventsAPI } from '../services/api';

function Schedule() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncAndLoad = async () => {
      try {
        setLoading(true);
        const localEvents = LS.get('noteflow_events', []);
        if (localEvents && localEvents.length > 0) {
          for (const ev of localEvents) {
            await eventsAPI.create({
              title: ev.title,
              date: ev.date,
              time: ev.time || ''
            });
          }
          LS.remove('noteflow_events');
        }
        const backendEvents = await eventsAPI.getAll();
        setEvents(backendEvents);
      } catch (err) {
        console.error('Failed to load/sync events from backend:', err);
        const saved = LS.get('noteflow_events', []);
        setEvents(saved);
      } finally {
        setLoading(false);
      }
    };
    syncAndLoad();
  }, []);

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    try {
      const created = await eventsAPI.create({
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.time
      });
      setEvents([created, ...events]);
      setNewEvent({ title: '', date: '', time: '' });
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create event:', err);
      const fallbackEvent = {
        id: Date.now().toString(),
        ...newEvent,
        createdAt: new Date().toISOString()
      };
      const updated = [fallbackEvent, ...events];
      LS.set('noteflow_events', updated);
      setEvents(updated);
      setNewEvent({ title: '', date: '', time: '' });
      setShowForm(false);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await eventsAPI.delete(id);
      setEvents(events.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete event:', err);
      const updated = events.filter(e => e.id !== id);
      LS.set('noteflow_events', updated);
      setEvents(updated);
    }
  };


  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="page-title">📅 Schedule</div>
          <div className="page-subtitle">Manage your tasks and reminders</div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Event</button>
      </div>

      <div className="notes-grid">
        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-title">No events yet</div>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="note-card" style={{ borderLeft: '4px solid var(--pink)' }}>
              <div className="card-title">{event.title}</div>
              <div style={{ margin: '12px 0', color: 'var(--text-muted)' }}>
                📍 {event.date} {event.time && `at ${event.time}`}
              </div>
              <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '13px' }} 
                      onClick={() => deleteEvent(event.id)}>Delete</button>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <span className="modal-title">New Event</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <input className="form-input" placeholder="Event title" value={newEvent.title} 
                     onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              <input className="form-input" type="date" value={newEvent.date} 
                     onChange={e => setNewEvent({...newEvent, date: e.target.value})} style={{marginTop: 12}} />
              <input className="form-input" type="time" value={newEvent.time} 
                     onChange={e => setNewEvent({...newEvent, time: e.target.value})} style={{marginTop: 12}} />
              <div className="form-actions" style={{marginTop: 20}}>
                <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={addEvent}>Add Event</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;