import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import useEvents from '../../../hooks/useEvents';
import useCategories from '../../../hooks/useCategories';
import PageContainer from '../../layout/pagecontainer/PageContainer';
import EventList from '../eventlist/EventList';
import EventDetailsModal from '../../modals/eventdetails/EventDetailsModal';
import InviteUserModal from '../../modals/InviteUserModal';
import CreateEventModal from '../../modals/CreateEventModal';

const MyEvents = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    events, 
    loading, 
    error, 
    fetchEvents, 
    joinEvent, 
    leaveEvent 
  } = useEvents();
  const { getCategoryName } = useCategories();
  
  // UI state
  const [activeTab, setActiveTab] = useState('created');
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, eventId: null });
  const [inviteModal, setInviteModal] = useState({ isOpen: false, eventId: null, eventTitle: null });
  const [createModal, setCreateModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Check authentication
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/my-events', message: 'Please log in to view your events' } });
    }
  }, [currentUser, navigate]);

  // Fetch events based on active tab
  useEffect(() => {
    if (currentUser) {
      const fetchMyEvents = async () => {
        if (activeTab === 'created') {
          await fetchEvents({
            created: true,
            maxResults: 20
          });
        } else if (activeTab === 'attending') {
          await fetchEvents({
            participated: true,
            maxResults: 20
          });
        }
      };
      
      fetchMyEvents();
    }
  }, [activeTab, currentUser, fetchEvents]);

  const showFeedback = (message, isError = false) => {
    setFeedbackMessage({
      text: message,
      isError
    });
    
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  const handleLeaveEvent = async (eventId) => {
    try {
      await leaveEvent(eventId);
      showFeedback('You have left the event');
      
      // Refresh the events list
      if (activeTab === 'attending') {
        fetchEvents({ participated: true, maxResults: 20 });
      }
    } catch (error) {
      showFeedback('Failed to leave the event: ' + error.message, true);
    }
  };

  const openDetailsModal = (eventId) => {
    setDetailsModal({ isOpen: true, eventId });
  };

  const closeDetailsModal = () => {
    setDetailsModal({ isOpen: false, eventId: null });
  };

  const openInviteModal = (eventId, eventTitle) => {
    setInviteModal({ isOpen: true, eventId, eventTitle });
  };

  const closeInviteModal = () => {
    setInviteModal({ isOpen: false, eventId: null, eventTitle: null });
  };

  const openCreateModal = () => {
    setCreateModal(true);
  };

  const closeCreateModal = () => {
    setCreateModal(false);
    // Refresh events list after creating a new event
    fetchEvents({ created: true, maxResults: 20 });
  };

  if (!currentUser) return null; // Prevent rendering if not authenticated

  return (
    <PageContainer>
      <div className="my-events-container">
        <div className="page-header">
          <h1>My Events</h1>
          <button className="btn-create" onClick={openCreateModal}>
            Create Event
          </button>
        </div>

        {feedbackMessage && (
          <div className={`feedback-message ${feedbackMessage.isError ? 'error' : 'success'}`}>
            {feedbackMessage.text}
          </div>
        )}

        <div className="events-tabs">
          <button 
            className={`tab-button ${activeTab === 'created' ? 'active' : ''}`}
            onClick={() => setActiveTab('created')}
          >
            Events I Created
          </button>
          <button 
            className={`tab-button ${activeTab === 'attending' ? 'active' : ''}`}
            onClick={() => setActiveTab('attending')}
          >
            Events I'm Attending
          </button>
        </div>

        <div className="tab-content">
          {loading ? (
            <div className="loading-container">
              <p>Loading events...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>Error: {error}</p>
              <button onClick={() => fetchEvents({ 
                created: activeTab === 'created',
                participated: activeTab === 'attending',
                maxResults: 20
              })}>
                Try Again
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-container">
              <p>
                {activeTab === 'created' 
                  ? "You haven't created any events yet." 
                  : "You're not attending any events yet."}
              </p>
              {activeTab === 'created' ? (
                <button className="btn-primary" onClick={openCreateModal}>
                  Create Your First Event
                </button>
              ) : (
                <button className="btn-primary" onClick={() => navigate('/events')}>
                  Browse Events
                </button>
              )}
            </div>
          ) : (
            <div className="events-list-container">
              <EventList 
                events={events.map(event => ({
                  ...event,
                  categoryName: getCategoryName(event.category)
                }))}
                onJoin={activeTab === 'created' ? openInviteModal : null}
                onLeave={activeTab === 'attending' ? handleLeaveEvent : null}
                onOpenDetails={openDetailsModal}
                showJoinButton={activeTab !== 'created'}
              />
            </div>
          )}
        </div>
      </div>

      <EventDetailsModal 
        isOpen={detailsModal.isOpen} 
        onClose={closeDetailsModal} 
        eventId={detailsModal.eventId}
        onEventUpdated={() => fetchEvents({
          created: activeTab === 'created',
          participated: activeTab === 'attending',
          maxResults: 20
        })}
      />
      
      <InviteUserModal 
        isOpen={inviteModal.isOpen}
        onClose={closeInviteModal}
        eventId={inviteModal.eventId}
        eventTitle={inviteModal.eventTitle}
      />
      
      <CreateEventModal 
        isOpen={createModal}
        onClose={closeCreateModal}
      />
    </PageContainer>
  );
};

export default MyEvents;