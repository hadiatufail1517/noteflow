import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../services/api';
import NoteDetailModal from '../components/NoteDetailModal';

function Assistant() {
  const [messages, setMessages] = useState([]); // { role: 'user'|'model', content: string, toolCalls: Array, toolResponses: Array }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeNoteId, setActiveNoteId] = useState(null); // For viewing citation note details
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input.trim();
    if (!query) return;

    if (!textToSend) setInput('');
    setError('');
    
    // Add user message to state
    const userMsg = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send chat history and current message to backend agent
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        toolResponses: m.toolResponses
      }));

      const res = await aiAPI.agentChat(history, query);
      
      const assistantMsg = {
        role: 'model',
        content: res.content,
        toolCalls: res.toolCalls,
        toolResponses: res.toolResponses
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to get response from AI Agent.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract unique source citations from tool responses
  const getCitations = (toolResponses) => {
    if (!toolResponses || !Array.isArray(toolResponses)) return [];
    
    const citationsMap = {};
    toolResponses.forEach(res => {
      // If we searched notes or summarized notes, extract notes
      if (res.name === 'searchNotes' && Array.isArray(res.result)) {
        res.result.forEach(note => {
          if (note.noteId) {
            citationsMap[note.noteId] = {
              id: note.noteId,
              title: note.noteTitle,
              category: note.category || 'General'
            };
          }
        });
      }
      if (res.name === 'getNote' && res.result && res.result.id) {
        citationsMap[res.result.id] = {
          id: res.result.id,
          title: res.result.title,
          category: res.result.category || 'General'
        };
      }
      if ((res.name === 'summarizeNote' || res.name === 'generateTags' || res.name === 'extractActionItems') && res.result && res.result.noteId) {
        citationsMap[res.result.noteId] = {
          id: res.result.noteId,
          title: res.result.title,
          category: 'General'
        };
      }
    });

    return Object.values(citationsMap);
  };

  const samplePrompts = [
    { text: "What have I learned about React?", icon: "⚛️" },
    { text: "Find my notes about AI agents.", icon: "🤖" },
    { text: "What tasks have I mentioned in my notes?", icon: "✅" },
    { text: "Summarize my notes about RAG.", icon: "📚" }
  ];

  return (
    <div className="assistant-container">
      {/* Top Title Bar */}
      <div className="top-bar">
        <div>
          <div className="page-title">🤖 AI Knowledge Assistant</div>
          <div className="page-subtitle">Ask questions across your entire note database</div>
        </div>
        <button className="btn-secondary" onClick={() => setMessages([])}>Clear Chat History</button>
      </div>

      {/* Main Area */}
      <div className="assistant-chat-window">
        {messages.length === 0 ? (
          /* Empty Chat / Prompts Dashboard */
          <div className="assistant-welcome">
            <div className="welcome-avatar">🧠</div>
            <h2>Ask your Knowledge Assistant</h2>
            <p>
              NoteHub is equipped with a tool-augmented agent. It will automatically search your notes, retrieve contents, extract action items, or summarize data to answer you.
            </p>
            
            <div className="sample-prompts-grid">
              {samplePrompts.map((p, i) => (
                <div key={i} className="prompt-card" onClick={() => handleSend(p.text)}>
                  <span className="prompt-icon">{p.icon}</span>
                  <span className="prompt-text">{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Messages List */
          <div className="chat-messages-scroller">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-row ${msg.role}`}>
                
                {/* Avatar Icon */}
                <div className="chat-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>

                {/* Bubble content */}
                <div className="chat-bubble-wrapper">
                  
                  {/* Tool execution badge log */}
                  {msg.role === 'model' && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="agent-tools-log">
                      {msg.toolCalls.map((call, idx) => (
                        <span key={idx} className="tool-log-badge">
                          🔧 Executed Tool: <strong>{call.name}</strong> 
                          {call.args && call.args.query && ` for "${call.args.query}"`}
                          {call.args && call.args.noteId && ` (ID: ${call.args.noteId.slice(0,6)}...)`}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className="chat-msg-bubble">
                    {msg.content ? (
                      msg.content.split('\n').map((line, i) => <p key={i}>{line}</p>)
                    ) : (
                      <span className="loading-dots">Thinking...</span>
                    )}
                  </div>

                  {/* Grounded Citation Sources */}
                  {msg.role === 'model' && msg.toolResponses && getCitations(msg.toolResponses).length > 0 && (
                    <div className="citations-wrapper">
                      <div className="citations-title">Sources used:</div>
                      <div className="citations-list">
                        {getCitations(msg.toolResponses).map((source) => (
                          <div
                            key={source.id}
                            className="citation-chip"
                            onClick={() => setActiveNoteId(source.id)}
                            title={`Click to open "${source.title}"`}
                          >
                            📄 {source.title} <span className="citation-category">{source.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="chat-row model">
                <div className="chat-avatar">🤖</div>
                <div className="chat-bubble-wrapper">
                  <div className="agent-skeleton-loader">
                    <div className="skeleton-line badge"></div>
                    <div className="skeleton-line text"></div>
                    <div className="skeleton-line text short"></div>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="chat-error-message">⚠️ {error}</div>}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Row */}
      <div className="assistant-input-footer">
        <div className="assistant-input-container">
          <input
            className="assistant-text-input"
            placeholder="Ask your knowledge assistant about your notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button className="btn-primary" onClick={() => handleSend()} disabled={loading || !input.trim()}>
            Send Message
          </button>
        </div>
      </div>

      {/* View Citation Note details */}
      {activeNoteId && (
        <NoteDetailModal noteId={activeNoteId} onClose={() => setActiveNoteId(null)} />
      )}
    </div>
  );
}

export default Assistant;
