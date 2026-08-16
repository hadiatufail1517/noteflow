import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleMarkAsRead = async () => {
    try {
      await notificationsAPI.markAsRead();
      // Instantly mark local state as read
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-center-container" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        className="nav-item"
        style={{
          background: isOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: 'none',
          color: 'inherit',
          textAlign: 'left',
          width: '100%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: '8px'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="nav-icon" style={{ position: 'relative' }}>
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--neon-pink)', /* Teal */
              width: '8px',
              height: '8px',
              borderRadius: '50%'
            }} />
          )}
        </span>
        <span style={{ flex: 1 }}>Notifications</span>
        {unreadCount > 0 && (
          <span className="nav-badge" style={{ background: 'var(--neon-pink)' }}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" style={{
          position: 'absolute',
          bottom: '50px',
          left: '0',
          width: '280px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 100,
          padding: '12px',
          maxHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--glass-border)'
          }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: '#fff' }}>Recent Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--neon-pink)',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div style={{
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px'
          }}>
            {notifications.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '20px 0',
                color: 'var(--text-muted)',
                fontSize: '12px'
              }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: n.read ? 'transparent' : 'rgba(20, 184, 166, 0.05)',
                    borderLeft: `3px solid ${n.read ? 'transparent' : 'var(--neon-pink)'}`,
                    fontSize: '12px',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{n.title}</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.content}</div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                    textAlign: 'right'
                  }}>
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
