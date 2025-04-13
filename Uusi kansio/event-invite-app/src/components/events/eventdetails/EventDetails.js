import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import useEvents from '../../../hooks/useEvents';
import useCategories from '../../../hooks/useCategories';
import InviteUserModal from '../../modals/InviteUserModal';
import { formatDate, formatTime } from '../../../utils/DateUtils';
import { formatLocation } from '../../../utils/locationUtils';
import './EventDetails.css';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    getEventById, 
    joinEvent, 
    leaveEvent, 
    hasJoinedEvent, 
    isEventCreator, 
    loading, 
    error: eventError 
  } = useEvents();
  const { getCategoryName } = useCategories();
  
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [inviteModal, setInviteModal] = useState({ isOpen: false });
  
  // Fetch event details when component mounts or id changes
  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        if (id) {
          const eventData = await getEventById(id);
          if (!eventData) {
            setError("Event not found");
            return;
          }
          setEvent(eventData);
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(err.message || "Failed to load event details");
      }
    };
    
    fetchEventDetails();
  }, [id, getEventById]);
  
  // Display feedback message with auto-dismiss
  const showFeedback = (message, type = 'success') => {
    setFeedback({ type, message });
    
    setTimeout(() => {
      setFeedback({ type: '', message: '' });
    }, 3000);
  };
  
  // Join event handler
  const handleJoin = async () => {
    if (!currentUser) {
      navigate('/login', { 
        state: { from: `/event/${id}`, message: 'Please log in to join events' } 
      });
      return;
    }
    
    try {
      await joinEvent(id);
      showFeedback('You have successfully joined the event!');
      
      // Update local state to show immediate feedback
      if (event) {
        const updatedParticipants = [...(event.participants || [])];
        if (!updatedParticipants.includes(currentUser.uid)) {
          updatedParticipants.push(currentUser.uid);
          setEvent({ ...event, participants: updatedParticipants });
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to join the event', 'error');
    }
  };
  
  // Leave event handler
  const handleLeave = async () => {
    try {
      await leaveEvent(id);
      showFeedback('You have left the event');
      
      // Update local state to show immediate feedback
      if (event && currentUser) {
        const updatedParticipants = (event.participants || [])
          .filter(uid => uid !== currentUser.uid);
        setEvent({ ...event, participants: updatedParticipants });
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to leave the event', 'error');
    }
  };
  
  // Open invite modal
  const openInviteModal = () => {
    if (!currentUser) {
      navigate('/login', { 
        state: { from: `/event/${id}`, message: 'Please log in to invite others' } 
      });
      return;
    }
    
    setInviteModal({ 
      isOpen: true, 
      eventId: id, 
      eventTitle: event?.title || 'Event' 
    });
  };
  
  // Close invite modal
  const closeInviteModal = () => {
    setInviteModal({ isOpen: false });
  };
  
  // Navigate to event edit page
  const handleEditEvent = () => {
    navigate(`/event/edit/${id}`);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="event-details-container loading">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || eventError) {
    return (
      <div className="event-details-container error">
        <h2>Error</h2>
        <p>{error || eventError}</p>
        <button onClick={() => navigate('/events')} className="btn-primary">
          Browse Other Events
        </button>
      </div>
    );
  }
  
  // Not found state
  if (!event) {
    return (
      <div className="event-details-container not-found">
        <h2>Event Not Found</h2>
        <p>The event you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate('/events')} className="btn-primary">
          Browse Events
        </button>
      </div>
    );
  }
  
  // Determine if user has joined or created this event
  const isJoined = currentUser && hasJoinedEvent(id);
  const isCreator = currentUser && isEventCreator(id);
  const participantCount = event.participants?.length || 0;
  const eventCategory = getCategoryName(event.category);
  
  return (
    <div className="event-details-container">
      {feedback.message && (
        <div className={`feedback-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}
      
      <div className="event-header">
        <div className="event-title-section">
          <h1>{event.title}</h1>
          <span className="event-category">{eventCategory}</span>
        </div>
        
        <div className="event-actions">
          {isCreator ? (
            <>
              <button onClick={openInviteModal} className="btn-primary">
                Invite Others
              </button>
              <button onClick={handleEditEvent} className="btn-secondary">
                Edit Event
              </button>
            </>
          ) : isJoined ? (
            <button onClick={handleLeave} className="btn-secondary">
              Leave Event
            </button>
          ) : (
            <button onClick={handleJoin} className="btn-primary">
              Join Event
            </button>
          )}
        </div>
      </div>
      
      <div className="event-details-grid">
        <div className="event-main-info">
          <div className="event-image-container">
            {event.imageURL ? (
              <img src={event.imageURL} alt={event.title} className="event-image" />
            ) : (
              <div className="event-image-placeholder">
                <span>{eventCategory}</span>
              </div>
            )}
          </div>
          
          <div className="event-key-details">
            <div className="detail-item">
              <i className="fas fa-calendar"></i>
              <div>
                <h3>Date & Time</h3>
                <p>{formatDate(event.date)}</p>
                <p>{formatTime(event.date)} - {event.endTime ? formatTime(event.endTime) : 'Unspecified'}</p>
              </div>
            </div>
            
            <div className="detail-item">
              <i className="fas fa-map-marker-alt"></i>
              <div>
                <h3>Location</h3>
                <p>{formatLocation(event.location)}</p>
                {event.locationDetails && <p>{event.locationDetails}</p>}
              </div>
            </div>
            
            <div className="detail-item">
              <i className="fas fa-users"></i>
              <div>
                <h3>Participants</h3>
                <p>
                  {participantCount} {participantCount === 1 ? 'person' : 'people'} going
                  {event.maxParticipants && ` (${event.maxParticipants - participantCount} spots left)`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="event-description">
            <h2>About this event</h2>
            <p>{event.description || 'No description provided.'}</p>
          </div>
        </div>
        
        <div className="event-sidebar">
          <div className="event-organizer card">
            <h3>Organizer</h3>
            <div className="organizer-info">
              <div className="organizer-avatar">
                {event.organizerPhoto ? (
                  <img src={event.organizerPhoto} alt={event.organizerName} />
                ) : (
                  <div className="avatar-placeholder">
                    {event.organizerName ? event.organizerName.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <div>
                <p className="organizer-name">{event.organizerName || 'Event Organizer'}</p>
                {!isCreator && (
                  <button className="btn-text">Contact</button>
                )}
              </div>
            </div>
          </div>
          
          <div className="share-event card">
            <h3>Share Event</h3>
            <div className="share-buttons">
              <button className="share-btn facebook" title="Share on Facebook">
                <i className="fab fa-facebook-f"></i>
              </button>
              <button className="share-btn twitter" title="Share on Twitter">
                <i className="fab fa-twitter"></i>
              </button>
              <button className="share-btn email" title="Share via Email">
                <i className="fas fa-envelope"></i>
              </button>
              <button className="share-btn link" title="Copy Link">
                <i className="fas fa-link"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <InviteUserModal 
        isOpen={inviteModal.isOpen}
        onClose={closeInviteModal}
        eventId={inviteModal.eventId}
        eventTitle={inviteModal.eventTitle}
      />
    </div>
  );
};

export default EventDetails;