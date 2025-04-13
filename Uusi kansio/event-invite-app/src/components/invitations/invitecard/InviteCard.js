import React, { useState } from 'react';
import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import './InviteCard.css'; 
const InviteCard = ({ invite, onStatusChange, onViewEvent }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Update invite status
      const inviteRef = doc(db, 'invites', invite.id);
      await updateDoc(inviteRef, {
        status: 'accepted',
        respondedAt: new Date()
      });
      
      // 2. Add user to event participants
      const eventRef = doc(db, 'events', invite.eventId);
      await updateDoc(eventRef, {
        participants: arrayUnion(auth.currentUser.uid)
      });
      
      onStatusChange(invite.id, 'accepted');
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("Failed to accept invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const inviteRef = doc(db, 'invites', invite.id);
      await updateDoc(inviteRef, {
        status: 'declined',
        respondedAt: new Date()
      });
      
      onStatusChange(invite.id, 'declined');
    } catch (err) {
      console.error("Error declining invite:", err);
      setError("Failed to decline invitation");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch(invite.status) {
      case 'accepted':
        return <span className="status-badge accepted">Accepted</span>;
      case 'declined':
        return <span className="status-badge declined">Declined</span>;
      case 'pending':
      default:
        return <span className="status-badge pending">Pending</span>;
    }
  };

  return (
    <div className="invite-card">
      <div className="invite-header">
        <h3 className="event-title">{invite.eventTitle}</h3>
        {getStatusBadge()}
      </div>
      
      <div className="invite-details">
        <p className="invite-sender">
          From: <span>{invite.senderName}</span>
        </p>
        
        {invite.message && (
          <p className="invite-message">"{invite.message}"</p>
        )}
        
        <p className="invite-date">
          Sent: {formatDate(invite.createdAt)}
        </p>
      </div>
      
      {error && <p className="error-message">{error}</p>}
      
      <div className="invite-actions">
        <button 
          className="btn-view" 
          onClick={() => onViewEvent(invite.eventId)}
        >
          View Event
        </button>
        
        {invite.status === 'pending' && (
          <>
            <button 
              className="btn-accept" 
              onClick={handleAccept}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Accept'}
            </button>
            <button 
              className="btn-decline" 
              onClick={handleDecline}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Decline'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InviteCard;