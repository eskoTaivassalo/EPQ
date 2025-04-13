import React, { useState } from 'react';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import './styles/Modals.css'

const InviteUserModal = ({ isOpen, onClose, eventId, eventTitle }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { currentUser } = useAuth();
  
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !eventId || !currentUser) {
      setFeedback({
        type: 'error',
        message: 'Missing required information'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Create an invitation in Firestore
      await addDoc(collection(db, 'invitations'), {
        eventId,
        eventTitle,
        senderUid: currentUser.uid,
        senderEmail: currentUser.email,
        recipientEmail: email.trim().toLowerCase(),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Show success message
      setFeedback({
        type: 'success',
        message: 'Invitation sent successfully!'
      });
      
      // Clear the form
      setEmail('');
      
      // Close after short delay to show success message
      setTimeout(() => {
        onClose();
        setFeedback(null);
      }, 2000);
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      setFeedback({
        type: 'error',
        message: 'Failed to send invitation. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Invite to Event</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="invite-email">Email Address</label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>
            
            {eventTitle && (
              <p className="mt-2 mb-2">
                You are inviting someone to join: <strong>{eventTitle}</strong>
              </p>
            )}
            
            {feedback && (
              <div className={`feedback-message ${feedback.type}`}>
                {feedback.message}
              </div>
            )}
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !email}
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;