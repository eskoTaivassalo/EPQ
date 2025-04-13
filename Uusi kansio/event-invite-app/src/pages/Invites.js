import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useInvites from '../hooks/useInvites';
import PageContainer from '../components/layout/pagecontainer/PageContainer';
import InviteList from '../components/invitations/invitelist/InviteList';
import '../styles/Invites.css'; // Import the dedicated CSS file
const Invites = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    fetchReceivedInvites, 
    fetchSentInvites, 
    acceptInvite,
    declineInvite,
    loading, 
    error 
  } = useInvites();
  
  const [activeTab, setActiveTab] = useState('received');
  const [invites, setInvites] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  
  // Check authentication
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { 
        state: { from: '/invites', message: 'Please log in to view your invitations' } 
      });
    }
  }, [currentUser, navigate]);
  
  // Fetch invites when tab changes or component mounts
  useEffect(() => {
    const loadInvites = async () => {
      try {
        if (activeTab === 'received') {
          const receivedInvites = await fetchReceivedInvites();
          setInvites(receivedInvites.map(invite => ({...invite, type: 'received'})));
        } else {
          const sentInvites = await fetchSentInvites();
          setInvites(sentInvites.map(invite => ({...invite, type: 'sent'})));
        }
      } catch (err) {
        console.error('Error loading invites:', err);
        showFeedback('Failed to load invitations', true);
      }
    };
    
    if (currentUser) {
      loadInvites();
    }
  }, [activeTab, currentUser, fetchReceivedInvites, fetchSentInvites]);
  
  const showFeedback = (message, isError = false) => {
    setFeedbackMessage({
      text: message,
      isError
    });
    
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };
  
  const handleStatusChange = async (inviteId, newStatus) => {
    try {
      // Update the invitation status based on the action
      if (newStatus === 'accepted') {
        await acceptInvite(inviteId);
        showFeedback('Invitation accepted!');
      } else if (newStatus === 'declined') {
        await declineInvite(inviteId);
        showFeedback('Invitation declined');
      }
      
      // Update local state to reflect the change immediately
      setInvites(prev => 
        prev.map(invite => 
          invite.id === inviteId 
            ? { ...invite, status: newStatus, respondedAt: new Date() }
            : invite
        )
      );
    } catch (err) {
      console.error('Error updating invitation:', err);
      showFeedback(`Failed to ${newStatus === 'accepted' ? 'accept' : 'decline'} invitation`, true);
    }
  };
  
  const handleViewEvent = (eventId) => {
    navigate(`/event/${eventId}`);
  };
  
  if (!currentUser) return null; // Prevent rendering if not authenticated
  
  return (
    <PageContainer>
      <div className="invites-page">
        <div className="invites-header">
          <h1>Invitations</h1>
        </div>
        
        {feedbackMessage && (
          <div className={`feedback-message ${feedbackMessage.isError ? 'error' : 'success'}`}>
            {feedbackMessage.text}
          </div>
        )}
        
        <div className="invites-tabs">
          <button 
            className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received
          </button>
          <button 
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent
          </button>
        </div>
        
        <div className="invites-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading invitations...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <button 
                onClick={() => activeTab === 'received' ? fetchReceivedInvites() : fetchSentInvites()}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : (
            <InviteList
              invites={invites}
              onStatusChange={handleStatusChange}
              onViewEvent={handleViewEvent}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Invites;