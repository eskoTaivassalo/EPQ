import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import './styles/Modals.css'

const InviteUserModal = ({ isOpen, onClose, eventId, eventTitle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search for users when search term changes
  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    try {
      setSearchLoading(true);
      // In a real app, you might want to use a more sophisticated search
      // This is a simplified example
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const currentUser = auth.currentUser;
      const filteredUsers = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => 
          // Filter by search term and exclude current user
          user.id !== currentUser.uid && 
          (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      
      setUsers(filteredUsers);
    } catch (err) {
      console.error("Error searching users:", err);
      setError("Failed to search for users");
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const currentUser = auth.currentUser;
      
      // Create invites for all selected users
      for (const userId of selectedUsers) {
        await addDoc(collection(db, 'invites'), {
          eventId,
          eventTitle,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || currentUser.email,
          recipientId: userId,
          message,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      
      setLoading(false);
      onClose();
    } catch (err) {
      console.error("Error sending invites:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Invite People to {eventTitle}</h2>
        {error && <div className="error">{error}</div>}
        
        <div className="form-group">
          <label>Search for people</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email"
          />
        </div>
        
        <div className="search-results">
          {searchLoading ? (
            <p>Searching...</p>
          ) : (
            <>
              {users.length > 0 ? (
                <ul className="user-list">
                  {users.map(user => (
                    <li key={user.id} className="user-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                        />
                        <span className="user-name">
                          {user.displayName || user.email}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                searchTerm.length >= 2 && <p>No users found</p>
              )}
            </>
          )}
        </div>
        
        <div className="form-group">
          <label>Add a personal message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey! Check out this event..."
            rows={3}
          />
        </div>
        
        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSendInvites} 
            disabled={loading || selectedUsers.length === 0}
          >
            {loading ? 'Sending...' : `Send Invites (${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;