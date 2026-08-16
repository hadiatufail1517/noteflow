import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendsAPI, messagesAPI } from '../services/api';
import NotificationCenter from './NotificationCenter';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      try {
        const requests = await friendsAPI.getRequests();
        setPendingRequestsCount(requests.length);

        const convs = await messagesAPI.getConversations();
        const unreadSum = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadMessagesCount(unreadSum);
      } catch (err) {
        console.error('Failed to fetch navbar badge counts:', err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const initials = user
    ? user.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : 'U';

  const isActive = (path) => {
    const base = path.split('?')[0];
    const param = path.includes('?') ? path.split('?')[1] : '';
    if (param) {
      return location.pathname === base && location.search.includes(param);
    }
    return location.pathname === base && !location.search;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: '◉', label: 'Dashboard' },
    { path: '/assistant', icon: '🤖', label: 'AI Assistant' },
    { path: '/dashboard?filter=all', icon: '☰', label: 'All Notes' },
    { path: '/shared-notes', icon: '📁', label: 'Shared Notes' },
    { path: '/graph', icon: '🕸️', label: 'Knowledge Graph' },

    { path: '/dashboard?filter=pinned', icon: '📌', label: 'Pinned' },
    { path: '/schedule', icon: '📅', label: 'Schedule' },
    {
      path: '/friends',
      icon: '👥',
      label: 'Friends',
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
    },
    {
      path: '/messages',
      icon: '💬',
      label: 'Messages',
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : null
    },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">N</div>
        <div className="logo-text">
          Note<span>Hub</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`nav-item${isActive(item.path) ? ' active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge !== null && item.badge !== undefined && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <NotificationCenter />

        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            ↩
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
