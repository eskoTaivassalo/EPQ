import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import PageContainer from '../components/layout/pagecontainer/PageContainer';
import EventList from '../components/events/eventlist/EventList';
import EventDetailsModal from '../components/modals/eventdetails/EventDetailsModal';
import InviteUserModal from '../components/modals/InviteUserModal';
import CreateEventModal from '../components/modals/CreateEventModal';
import CreateInvitationModal from '../components/modals/CreateInviteModal';
import '../styles/Home.css';

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Modal states
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, eventId: null });
  const [inviteModal, setInviteModal] = useState({ isOpen: false, eventId: null, eventTitle: null });
  const [createModal, setCreateModal] = useState(false);
  const [createInvitationModal, setCreateInvitationModal] = useState(false);
  
  // User data states
  const [userEvents, setUserEvents] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch user events if user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchUserEvents();
    }
  }, [currentUser]);

  const fetchUserEvents = async () => {
    try {
      setLoading(true);
      const eventsQuery = query(
        collection(db, 'events'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('date', 'desc'),
        limit(3)
      );
      
      const snapshot = await getDocs(eventsQuery);
      setUserEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching user events:', error);
      showFeedback('Failed to load your events', true);
    } finally {
      setLoading(false);
    }
  };

  // Feedback message handler
  const showFeedback = (message, isError = false) => {
    setFeedbackMessage({
      text: message,
      isError
    });
    
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  // Event join/leave handlers
  const handleJoinEvent = async (eventId) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to join events' } });
      return;
    }
    
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayUnion(currentUser.uid)
      });
      
      showFeedback('You have successfully joined the event!');
      fetchUserEvents();
    } catch (error) {
      console.error('Error joining event:', error);
      showFeedback('Failed to join the event. Please try again.', true);
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!currentUser) return;
    
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayRemove(currentUser.uid)
      });
      
      showFeedback('You have left the event');
      fetchUserEvents();
    } catch (error) {
      console.error('Error leaving event:', error);
      showFeedback('Failed to leave the event. Please try again.', true);
    }
  };

  // Modal handlers for event details
  const openDetailsModal = (eventId) => {
    setDetailsModal({ isOpen: true, eventId });
  };

  const closeDetailsModal = () => {
    setDetailsModal({ isOpen: false, eventId: null });
  };

  // Modal handlers for inviting users
  const openInviteModal = (eventId, eventTitle) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to invite others' } });
      return;
    }
    
    setInviteModal({ isOpen: true, eventId, eventTitle });
  };

  const closeInviteModal = () => {
    setInviteModal({ isOpen: false, eventId: null, eventTitle: null });
  };

  // Modal handlers for creating events
  const openCreateModal = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to create events' } });
      return;
    }
    
    setCreateModal(true);
  };

  const closeCreateModal = () => {
    setCreateModal(false);
  };

  // Modal handlers for creating invitations
  const openCreateInvitationModal = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to create invitations' } });
      return;
    }
    
    setCreateInvitationModal(true);
  };

  const closeCreateInvitationModal = () => {
    setCreateInvitationModal(false);
  };

  return (
    <PageContainer>
      <section className="hero-section">
        <div className="hero-content">
          <h1>Find events and connect with friends</h1>
          <p>Discover exciting events happening around you or create your own and invite others!</p>
          
          <div className="hero-actions">
            <button className="btn-primary" onClick={openCreateModal}>
              Create Event
            </button>
            <button className="btn-secondary" onClick={() => navigate('/events')}>
              Browse All Events
            </button>
          </div>
        </div>
      </section>

      {feedbackMessage && (
        <div className={`feedback-message ${feedbackMessage.isError ? 'error' : 'success'}`}>
          {feedbackMessage.text}
        </div>
      )}
      
      <section className="featured-events">
        <div className="section-header">
          <h2>Upcoming Events</h2>
          <button className="view-all-btn" onClick={() => navigate('/events')}>
            View All
          </button>
        </div>
        
        <EventList 
          maxEvents={6}
          showCategory={true}
          onJoin={handleJoinEvent}
          onLeave={handleLeaveEvent}
          onOpenDetails={openDetailsModal}
          onInvite={(eventId) => {
            const event = document.getElementById(`event-${eventId}`);
            const title = event ? event.querySelector('.event-title').textContent : 'Event';
            openInviteModal(eventId, title);
          }}
        />
      </section>
      
      {currentUser && (
        <section className="your-events">
          <div className="section-header">
            <h2>Your Events</h2>
            <button className="view-all-btn" onClick={() => navigate('/profile')}>
              View All
            </button>
          </div>
          
          {loading ? (
            <div className="loading-spinner">Loading your events...</div>
          ) : userEvents.length > 0 ? (
            <div className="user-events-grid">
              {userEvents.map(event => (
                <div key={event.id} id={`event-${event.id}`} className="event-card user-event">
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-date">
                    {event.date?.toDate?.() ? new Date(event.date.toDate()).toLocaleDateString() : 'Date not available'}
                  </p>
                  <div className="event-actions">
                    <button 
                      className="btn-secondary btn-sm"
                      onClick={() => openDetailsModal(event.id)}
                    >
                      View Details
                    </button>
                    <button 
                      className="btn-primary btn-sm"
                      onClick={() => openInviteModal(event.id, event.title)}
                    >
                      Invite Friends
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-events">
              <p className="cta-message">You haven't joined any events yet. Create one or browse events to join!</p>
            </div>
          )}
          
          <div className="action-buttons">
            <button className="btn-primary centered" onClick={openCreateModal}>
              Create New Event
            </button>
            <button className="btn-create-invite" onClick={openCreateInvitationModal}>
              Create New Invitation
            </button>
          </div>
        </section>
      )}
      
      {/* Modals */}
      <EventDetailsModal 
        isOpen={detailsModal.isOpen} 
        onClose={closeDetailsModal} 
        eventId={detailsModal.eventId} 
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
        onSuccess={() => {
          showFeedback('Event created successfully!');
          fetchUserEvents();
        }}
      />
      
      <CreateInvitationModal
        isOpen={createInvitationModal}
        onClose={closeCreateInvitationModal}
        onSuccess={() => showFeedback('Invitation created successfully!')}
      />
    </PageContainer>
  );
};

export default Home;