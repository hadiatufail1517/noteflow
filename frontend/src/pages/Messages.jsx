import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messagesAPI, friendsAPI } from '../services/api';

function Messages() {
  const [searchParams] = useSearchParams();
  const targetFriendId = searchParams.get('friendId');

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [history, setHistory] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch active conversations list
  const loadConversations = async (autoSelectId = null) => {
    try {
      const convs = await messagesAPI.getConversations();
      setContacts(convs);

      // Handle auto-selection or target parameters
      if (targetFriendId) {
        const match = convs.find(c => c.id === targetFriendId);
        if (match) {
          setSelectedContact(match);
        } else {
          // If not in active conversations, fetch friend profile to start chat
          try {
            const allFriends = await friendsAPI.getAll();
            const friend = allFriends.find(f => f.id === targetFriendId);
            if (friend) {
              setSelectedContact(friend);
            }
          } catch (err) {
            console.error(err);
          }
        }
      } else if (selectedContact) {
        // If we already have a selected contact, check if they are still in the active conversations
        const stillActive = convs.find(c => c.id === selectedContact.id);
        if (stillActive) {
          setSelectedContact(stillActive);
        } else {
          setSelectedContact(null);
          setHistory([]);
        }
      } else if (convs.length > 0) {
        setSelectedContact(convs[0]);
      } else {
        setSelectedContact(null);
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to load conversations list:', err);
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => loadConversations(), 15000); // Poll list every 15s
    return () => clearInterval(interval);
  }, [targetFriendId]);

  // Fetch chat history with selected contact
  const loadHistory = async () => {
    if (!selectedContact) return;
    setHistoryLoading(true);
    try {
      const chatLogs = await messagesAPI.getHistory(selectedContact.id);
      setHistory(chatLogs);
      
      // Clear unread indicator locally for selected friend
      setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error('Failed to load message history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // Poll chat history logs every 5s for semi-live chat experience
    const interval = setInterval(() => {
      if (selectedContact) {
        messagesAPI.getHistory(selectedContact.id).then(chatLogs => {
          setHistory(chatLogs);
        }).catch(err => console.error(err));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedContact]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    const bodyText = newMessage.trim();
    setNewMessage('');
    setLoading(true);
    try {
      const msg = await messagesAPI.sendMessage(selectedContact.id, bodyText);
      setHistory(prev => [...prev, msg]);
      
      // Update conversations list latest preview
      setContacts(prev => prev.map(c => c.id === selectedContact.id ? {
        ...c,
        latestMessage: bodyText,
        latestMessageAt: new Date().toISOString()
      } : c));
    } catch (err) {
      alert('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message permanently?')) return;
    try {
      await messagesAPI.deleteMessage(msgId);
      setHistory(prev => prev.filter(m => m.id !== msgId));
      loadConversations();
    } catch (err) {
      alert('Failed to delete message.');
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedContact) return;
    if (!window.confirm(`Are you sure you want to delete all messages with ${selectedContact.name}? This cannot be undone.`)) return;
    try {
      await messagesAPI.deleteConversation(selectedContact.id);
      setHistory([]);
      loadConversations();
    } catch (err) {
      alert('Failed to delete conversation.');
    }
  };

  const handleDeleteSidebarConversation = async (contact) => {
    if (!window.confirm(`Clear chat and remove ${contact.name} from recent chats?`)) return;
    try {
      await messagesAPI.deleteConversation(contact.id);
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      if (selectedContact?.id === contact.id) {
        setSelectedContact(null);
        setHistory([]);
      }
    } catch (err) {
      alert('Failed to remove recent chat.');
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 180px)', gap: '20px' }}>
      
      {(!isMobile || !selectedContact) && (
        <div style={{
          width: isMobile ? '100%' : '300px',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(10px)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
        <div className="panel-title" style={{ marginBottom: '16px', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff' }}>
          Friends Chat
        </div>

        {contacts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
            No active conversations. Use the Friends tab to message friends!
          </div>
        ) : (
          contacts.map(contact => (
            <div 
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`online-user ${selectedContact?.id === contact.id ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                padding: '12px 30px 12px 12px', // added extra padding-right to prevent overlap with cross button
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
                background: selectedContact?.id === contact.id ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                border: selectedContact?.id === contact.id ? '1px solid rgba(20, 184, 166, 0.3)' : '1px solid transparent',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {/* Close/Remove conversation button in sidebar list */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSidebarConversation(contact);
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  opacity: 0.5,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  lineHeight: 1,
                  zIndex: 2,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)'; }}
                title="Remove conversation"
              >
                ×
              </button>
              <div className="online-avatar" style={{ 
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))', 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                color: '#fff', 
                fontSize: '13px' 
              }}>
                {contact.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="online-name" style={{ fontWeight: 600, fontSize: '14px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {contact.name}
                  </div>
                  {contact.unreadCount > 0 && (
                    <span style={{
                      background: 'var(--neon-pink)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>{contact.unreadCount}</span>
                  )}
                </div>
                {contact.latestMessage && (
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    marginTop: '2px'
                  }}>
                    {contact.latestMessage}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {(!isMobile || selectedContact) && (
        <div style={{
          flex: 1,
          width: isMobile ? '100%' : 'auto',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(10px)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden'
        }}>
        {selectedContact ? (
          <>
            {/* Header info */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.1)' }}>
              {isMobile && (
                <button
                  onClick={() => setSelectedContact(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    marginRight: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ← Back
                </button>
              )}
              <div className="online-avatar" style={{ 
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))', 
                width: '44px', 
                height: '44px', 
                fontSize: '16px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                color: '#fff' 
              }}>
                {selectedContact.avatar || selectedContact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{selectedContact.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedContact.email}</div>
              </div>
              {history.length > 0 && (
                <div>
                  <button
                    onClick={handleDeleteConversation}
                    className="btn-danger"
                    style={{
                      padding: '8px 16px',
                      fontSize: '12.5px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: 'var(--danger)',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = 'var(--danger)'; }}
                  >
                    🗑️ Clear Conversation
                  </button>
                </div>
              )}
            </div>

            {/* Conversation Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.25)' }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '80px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Write a friendly message to start the conversation!
                </div>
              ) : (
                history.map(msg => {
                  const fromMe = msg.senderId !== selectedContact.id;
                  return (
                    <div 
                      key={msg.id} 
                      style={{
                        marginBottom: '16px',
                        textAlign: fromMe ? 'right' : 'left',
                        display: 'flex',
                        justifyContent: fromMe ? 'flex-end' : 'flex-start',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {!fromMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            opacity: 0.5,
                            padding: '4px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--danger)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)'; }}
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      )}

                      <div style={{
                        display: 'inline-block',
                        maxWidth: '65%',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        background: fromMe ? 'var(--neon-purple)' : 'rgba(255, 255, 255, 0.06)',
                        color: '#fff',
                        border: '1px solid var(--glass-border)',
                        textAlign: 'left',
                        lineHeight: '1.5',
                        fontSize: '13.5px',
                        boxShadow: fromMe ? '0 0 15px rgba(168, 85, 247, 0.15)' : 'none'
                      }}>
                        {msg.content}
                        <div style={{ 
                          fontSize: '9px', 
                          color: 'rgba(255,255,255,0.4)', 
                          marginTop: '4px',
                          textAlign: 'right'
                        }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {fromMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            opacity: 0.5,
                            padding: '4px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--danger)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)'; }}
                          title="Delete message"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.1)' }}>
              <input
                className="form-input"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                disabled={loading}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: '#fff', padding: '12px 16px', borderRadius: '8px', outline: 'none' }}
              />
              <button 
                className="btn-primary" 
                onClick={handleSendMessage} 
                disabled={loading || !newMessage.trim()}
                style={{ padding: '0 28px' }}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14.5px' }}>
            Select a friend connection from the sidebar to view history logs.
          </div>
        )}
        </div>
      )}

    </div>
  );
}

export default Messages;