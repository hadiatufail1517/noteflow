import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendsAPI, sharesAPI, notesAPI } from '../services/api';
import FriendProfileDrawer from '../components/FriendProfileDrawer';

function Friends() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');

  // States
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected Friend Profile Drawer State
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Note Sharing Modal state from Friend card shortcut
  const [sharingFriend, setSharingFriend] = useState(null);
  const [myNotes, setMyNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [shareLoading, setShareLoading] = useState(false);

  // Fetch Friends and Requests
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const friendsList = await friendsAPI.getAll();
      setFriends(friendsList);

      const reqList = await friendsAPI.getRequests();
      setRequests(reqList);
    } catch (err) {
      setError('Failed to load friends data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Search users API check
  const handleUserSearch = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await friendsAPI.search(val);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Actions
  const handleSendRequest = async (receiverId) => {
    setError('');
    setSuccess('');
    try {
      await friendsAPI.sendRequest(receiverId);
      setSuccess('Friend request sent.');
      // Refresh search result status locally
      setSearchResults(prev => prev.map(u => u.id === receiverId ? { ...u, status: 'Request Sent' } : u));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request.');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setError('');
    setSuccess('');
    try {
      await friendsAPI.acceptRequest(requestId);
      setSuccess('Friend request accepted.');
      loadData();
    } catch (err) {
      setError('Failed to accept request.');
    }
  };

  const handleRejectRequest = async (requestId) => {
    setError('');
    setSuccess('');
    try {
      await friendsAPI.rejectRequest(requestId);
      setSuccess('Friend request rejected.');
      loadData();
    } catch (err) {
      setError('Failed to reject request.');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    setError('');
    setSuccess('');
    try {
      await friendsAPI.remove(friendId);
      setSuccess('Friend removed.');
      loadData();
    } catch (err) {
      setError('Failed to remove friend.');
    }
  };

  // Fetch own notes when opening the quick share tool
  const openShareModal = async (friend) => {
    setSharingFriend(friend);
    try {
      const notes = await notesAPI.getAll();
      setMyNotes(notes);
      if (notes.length > 0) {
        setSelectedNoteId(notes[0].id);
      }
    } catch (err) {
      console.error('Failed to load notes for sharing:', err);
    }
  };

  const handleShareSubmit = async () => {
    if (!selectedNoteId || !sharingFriend) return;
    setShareLoading(true);
    setError('');
    setSuccess('');
    try {
      await sharesAPI.share(selectedNoteId, sharingFriend.id, sharePermission);
      setSuccess(`Note shared with ${sharingFriend.name} successfully.`);
      setSharingFriend(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share note.');
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div>
      <div className="top-bar">
        <div>
          <div className="page-title">👥 Friends & Collaboration</div>
          <div className="page-subtitle">Connect and share ideas with note collaborators</div>
        </div>
      </div>

      {success && <div className="auth-error" style={{ background: 'rgba(20, 184, 166, 0.1)', borderColor: 'rgba(20, 184, 166, 0.2)', color: 'var(--neon-pink)', marginBottom: '20px' }}>✅ {success}</div>}
      {error && <div className="auth-error" style={{ marginBottom: '20px' }}>⚠️ {error}</div>}

      {/* Tabs Menu */}
      <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('friends')}
          className="btn-secondary"
          style={{
            background: activeTab === 'friends' ? 'var(--grad-primary)' : 'transparent',
            border: activeTab === 'friends' ? 'none' : '1px solid var(--glass-border)',
            color: '#fff',
            padding: '8px 16px',
            fontSize: '14px'
          }}
        >
          My Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className="btn-secondary"
          style={{
            background: activeTab === 'requests' ? 'var(--grad-primary)' : 'transparent',
            border: activeTab === 'requests' ? 'none' : '1px solid var(--glass-border)',
            color: '#fff',
            padding: '8px 16px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          Friend Requests
          {requests.length > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px',
              fontWeight: '700'
            }}>{requests.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className="btn-secondary"
          style={{
            background: activeTab === 'search' ? 'var(--grad-primary)' : 'transparent',
            border: activeTab === 'search' ? 'none' : '1px solid var(--glass-border)',
            color: '#fff',
            padding: '8px 16px',
            fontSize: '14px'
          }}
        >
          Find People
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '50px 0' }}>Loading connection details...</div>
      ) : (
        <>
          {/* Active friends list */}
          {activeTab === 'friends' && (
            <div className="notes-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {friends.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <div className="empty-icon">👥</div>
                  <div className="empty-title">You don't have any friends yet</div>
                  <div className="empty-sub" style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
                    Find people on NoteHub and start collaborating.
                  </div>
                  <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => setActiveTab('search')}>
                    Find People
                  </button>
                </div>
              ) : (
                friends.map(friend => (
                  <div
                    key={friend.id}
                    className="note-card"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                  >
                    <div
                      className="online-avatar"
                      onClick={() => setSelectedFriend(friend)}
                      style={{
                        width: '70px',
                        height: '70px',
                        fontSize: '24px',
                        background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
                        color: '#fff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        marginBottom: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      {friend.avatar}
                    </div>

                    <div
                      className="card-title"
                      onClick={() => setSelectedFriend(friend)}
                      style={{ fontSize: '18px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      {friend.name}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '24px' }}>
                      {friend.email}
                    </div>

                    {/* Actions button blocks */}
                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => navigate(`/messages?friendId=${friend.id}`)}
                        style={{ flex: 1, padding: '8px 0', fontSize: '13px' }}
                      >
                        💬 Chat
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => openShareModal(friend)}
                        style={{ flex: 1, padding: '8px 0', fontSize: '13px' }}
                      >
                        📤 Share
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleRemoveFriend(friend.id)}
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                        title="Remove Friend"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pending friend requests */}
          {activeTab === 'requests' && (
            <div className="notes-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {requests.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                  <div className="empty-icon">✉️</div>
                  <div className="empty-title">No pending friend requests</div>
                </div>
              ) : (
                requests.map(req => {
                  const initials = req.sender.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div key={req.id} className="note-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: 'var(--neon-pink)'
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="card-title" style={{ fontSize: '15px', marginBottom: '2px' }}>{req.sender.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{req.sender.email}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          className="btn-primary"
                          onClick={() => handleAcceptRequest(req.id)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Accept
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => handleRejectRequest(req.id)}
                          style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* User searching directory */}
          {activeTab === 'search' && (
            <div>
              <div style={{ maxWidth: '500px', margin: '0 auto 30px' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={handleUserSearch}
                  style={{ width: '100%', fontSize: '15px', padding: '12px 20px' }}
                />
              </div>

              {searchLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Searching directory...</div>
              ) : (
                <div className="notes-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                  {searchQuery && searchResults.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                      <div className="empty-icon">🔍</div>
                      <div className="empty-title">No users found</div>
                    </div>
                  ) : (
                    searchResults.map(user => (
                      <div key={user.id} className="note-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: '700'
                        }}>
                          {user.avatar}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="card-title" style={{ fontSize: '15px', marginBottom: '2px' }}>{user.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{user.email}</div>
                        </div>
                        <div>
                          {user.status === 'Add Friend' && (
                            <button
                              className="btn-primary"
                              onClick={() => handleSendRequest(user.id)}
                              style={{ padding: '8px 16px', fontSize: '12px' }}
                            >
                              Add Friend
                            </button>
                          )}
                          {user.status === 'Request Sent' && (
                            <button
                              className="btn-secondary"
                              disabled
                              style={{ padding: '8px 16px', fontSize: '12px', opacity: 0.6 }}
                            >
                              Sent
                            </button>
                          )}
                          {user.status === 'Accept Request' && (
                            <button
                              className="btn-primary"
                              onClick={() => setActiveTab('requests')}
                              style={{ padding: '8px 16px', fontSize: '12px' }}
                            >
                              Accept
                            </button>
                          )}
                          {user.status === 'Friends' && (
                            <span style={{
                              color: 'var(--neon-pink)',
                              fontSize: '12px',
                              fontWeight: '700',
                              background: 'rgba(20, 184, 166, 0.1)',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: '1px solid rgba(20, 184, 166, 0.2)'
                            }}>
                              Friends
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Profile Details Drawer */}
      {selectedFriend && (
        <FriendProfileDrawer
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}

      {/* Note Quick Sharing Modal overlay */}
      {sharingFriend && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <span className="modal-title">Share Note with {sharingFriend.name}</span>
              <button className="modal-close" onClick={() => setSharingFriend(null)}>×</button>
            </div>
            <div className="modal-body">
              {myNotes.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                  You don't have any notes to share.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Select Note</label>
                    <select
                      value={selectedNoteId}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                      className="form-input"
                      style={{ background: 'var(--bg-base)', border: '1px solid var(--glass-border)', color: '#fff', padding: '10px' }}
                    >
                      {myNotes.map(n => (
                        <option key={n.id} value={n.id}>{n.title} ({n.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Sharing Permissions</label>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input
                          type="radio"
                          name="permission"
                          value="view"
                          checked={sharePermission === 'view'}
                          onChange={() => setSharePermission('view')}
                        />
                        View Only
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                        <input
                          type="radio"
                          name="permission"
                          value="edit"
                          checked={sharePermission === 'edit'}
                          onChange={() => setSharePermission('edit')}
                        />
                        Can Edit
                      </label>
                    </div>
                  </div>

                  <div className="form-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => setSharingFriend(null)}>Cancel</button>
                    <button className="btn-primary" onClick={handleShareSubmit} disabled={shareLoading}>
                      {shareLoading ? 'Sharing...' : 'Share Note'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Friends;