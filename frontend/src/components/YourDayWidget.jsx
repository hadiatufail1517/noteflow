import React, { useState, useEffect } from 'react';
import { aiAPI } from '../services/api';

function YourDayWidget({ onViewNote }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [preparing, setPreparing] = useState(false);
  const [dailyPlan, setDailyPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      const res = await aiAPI.getDailyBrief();
      setData(res);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch daily brief:', err);
      setError('Unable to load daily brief');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  const handlePrepareDay = async () => {
    try {
      setPreparing(true);
      setShowPlanModal(true);
      const res = await aiAPI.prepareDay();
      setDailyPlan(res.dailyPlan);
    } catch (err) {
      console.error('Failed to prepare daily plan:', err);
      setDailyPlan('Failed to compile your personalized daily plan. Please try again.');
    } finally {
      setPreparing(false);
    }
  };

  if (loading) {
    return (
      <div className="your-day-widget loading">
        <div className="skeleton-title"></div>
        <div className="skeleton-grid">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="your-day-widget error">
        <div className="error-text">⚠️ {error}</div>
        <button className="btn-secondary" style={{ marginTop: 8 }} onClick={fetchBrief}>Retry</button>
      </div>
    );
  }

  const { priorityNotes, upcomingEvents, continueNotes, unfinishedTasks, knowledgeInsights } = data || {};

  return (
    <div className="your-day-widget">
      <div className="your-day-header">
        <div className="yd-title-wrap">
          <span className="yd-icon">🧠</span>
          <span className="yd-title">Your Day</span>
        </div>
        <button className="btn-prepare" onClick={handlePrepareDay}>
          ✨ Prepare My Day
        </button>
      </div>

      <div className="your-day-grid">
        {/* Priority tasks & events */}
        <div className="yd-col">
          <div className="yd-section-label">🔥 PRIORITY</div>
          <div className="yd-card">
            {priorityNotes && priorityNotes.length > 0 ? (
              priorityNotes.map(n => (
                <div key={n.id} className="yd-item clickable" onClick={() => onViewNote(n.id)}>
                  <div className="yd-item-title">{n.title}</div>
                  <div className="yd-item-desc">Priority note in {n.category || 'General'}</div>
                </div>
              ))
            ) : (
              <div className="yd-empty">Your workspace is calm today. No immediate priorities.</div>
            )}
          </div>
        </div>

        {/* Upcoming items */}
        <div className="yd-col">
          <div className="yd-section-label">📅 UPCOMING EVENTS</div>
          <div className="yd-card">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 3).map(e => (
                <div key={e.id} className="yd-item">
                  <div className="yd-item-title">{e.title}</div>
                  <div className="yd-item-desc">📍 {e.date} {e.time ? `at ${e.time}` : ''}</div>
                </div>
              ))
            ) : (
              <div className="yd-empty">No events scheduled.</div>
            )}
          </div>
        </div>

        {/* Continue notes */}
        <div className="yd-col">
          <div className="yd-section-label">📝 CONTINUE WORKING</div>
          <div className="yd-card">
            {continueNotes && continueNotes.length > 0 ? (
              continueNotes.map(n => (
                <div key={n.id} className="yd-item clickable" onClick={() => onViewNote(n.id)}>
                  <div className="yd-item-title">{n.title}</div>
                  <div className="yd-item-desc">Modified {new Date(n.updatedAt).toLocaleDateString()}</div>
                </div>
              ))
            ) : (
              <div className="yd-empty">No recent notes found.</div>
            )}
          </div>
        </div>
      </div>

      <div className="your-day-subgrid">
        {/* Unfinished action checklist */}
        <div className="yd-col-wide">
          <div className="yd-section-label">⚠️ UNFINISHED TASKS</div>
          <div className="yd-card yd-scrollable">
            {unfinishedTasks && unfinishedTasks.length > 0 ? (
              unfinishedTasks.map((t, idx) => (
                <div key={idx} className="yd-todo-item">
                  <span className="yd-checkbox">☐</span>
                  <span className="yd-todo-text">{t.text}</span>
                  <span className="yd-todo-source clickable" onClick={() => onViewNote(t.noteId)}>
                    in "{t.noteTitle}"
                  </span>
                </div>
              ))
            ) : (
              <div className="yd-empty">No incomplete tasks found in your notes.</div>
            )}
          </div>
        </div>

        {/* AI Knowledge Insight */}
        <div className="yd-col-narrow">
          <div className="yd-section-label">💡 KNOWLEDGE INSIGHT</div>
          <div className="yd-card yd-insight-card">
            {knowledgeInsights && knowledgeInsights.length > 0 ? (
              knowledgeInsights.map((insight, idx) => (
                <div key={idx} className="yd-insight-item">
                  ✨ {insight}
                </div>
              ))
            ) : (
              <div className="yd-empty">No insights generated yet. Add more notes!</div>
            )}
          </div>
        </div>
      </div>

      {/* Prepare My Day AI Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => !preparing && setShowPlanModal(false)}>
          <div className="modal-box plan-modal">
            <div className="modal-header">
              <span className="modal-title">✨ Your Personalized Daily Plan</span>
              <button className="modal-close" disabled={preparing} onClick={() => setShowPlanModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ minHeight: 200 }}>
              {preparing ? (
                <div className="yd-plan-preparing">
                  <div className="yd-plan-spinner"></div>
                  <div>NoteHub AI is analyzing your notes, tasks, and calendar...</div>
                </div>
              ) : (
                <div className="yd-plan-content">
                  {dailyPlan ? (
                    <div className="yd-markdown-body">
                      {dailyPlan.split('\n').map((line, idx) => {
                        if (line.startsWith('# ')) return <h2 key={idx} style={{ marginTop: 12, marginBottom: 8, color: 'var(--neon-purple)' }}>{line.slice(2)}</h2>;
                        if (line.startsWith('## ')) return <h3 key={idx} style={{ marginTop: 12, marginBottom: 8, color: 'var(--neon-pink)' }}>{line.slice(3)}</h3>;
                        if (line.startsWith('### ')) return <h4 key={idx} style={{ marginTop: 10, marginBottom: 6 }}>{line.slice(4)}</h4>;
                        if (line.startsWith('- [ ] ')) return <div key={idx} className="md-checkbox"><span style={{marginRight: 6}}>☐</span> {line.slice(6)}</div>;
                        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={idx} style={{ marginLeft: 12, marginBottom: 4 }}>{line.slice(2)}</li>;
                        return <p key={idx} style={{ marginBottom: 8, lineHeight: 1.5 }}>{line}</p>;
                      })}
                    </div>
                  ) : (
                    <div className="yd-empty">No data available to create a plan.</div>
                  )}
                </div>
              )}
              {!preparing && (
                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button className="btn-primary" onClick={() => setShowPlanModal(false)}>Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default YourDayWidget;
