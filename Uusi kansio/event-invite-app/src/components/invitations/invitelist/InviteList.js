import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import InviteCard from '../invitecard/InviteCard';
import './InviteList.css'; // Assuming you have a CSS file for styling

const InviteList = ({ onViewEvent, onStatusChange }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'accepted', 'declined'

  useEffect(() => {
    if (auth.currentUser) {
      fetchInvites();
    }
  }, [filter]);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User must be logged in to view invites");
      }
      
      // Build query
      const invitesRef = collection(db, 'invites');
      let constraints = [
        where('recipientId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ];
      
      if (filter !== 'all') {
        constraints.push(where('status', '==', filter));
      }
      
      const invitesQuery = query(invitesRef, ...constraints);
      const invitesSnapshot = await getDocs(invitesQuery);
      
      const invitesList = invitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInvites(invitesList);
      setError(null);
    } catch (err) {
      console.error("Error fetching invites:", err);
      setError("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (inviteId, newStatus) => {
    setInvites(prevInvites => 
      prevInvites.map(invite => 
        invite.id === inviteId 
          ? { ...invite, status: newStatus, respondedAt: new Date() }
          : invite
      )
    );
    
    if (onStatusChange) {
      onStatusChange(inviteId, newStatus);
    }
  };

  // Update filter status
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  if (loading) return <div className="invites-loading">Loading invitations...</div>;
  if (error) return <div className="invites-error">{error}</div>;
  
  return (
    <div className="invites-container">
      <div className="invites-filter">
        <select 
          value={filter} 
          onChange={handleFilterChange}
          className="filter-dropdown"
        >
          <option value="all">All Invitations</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
        
        <button 
          className="refresh-btn" 
          onClick={fetchInvites}
        >
          Refresh
        </button>
      </div>
      
      {invites.length === 0 ? (
        <div className="no-invites">
          <p>No invitations {filter !== 'all' ? `with status "${filter}"` : ''}</p>
        </div>
      ) : (
        <div className="invites-list">
          {invites.map(invite => (
            <InviteCard 
              key={invite.id}
              invite={invite}
              onStatusChange={handleStatusChange}
              onViewEvent={onViewEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InviteList;