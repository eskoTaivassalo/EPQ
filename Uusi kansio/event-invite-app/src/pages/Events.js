import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useEvents from '../hooks/useEvents';
import useCategories from '../hooks/useCategories';
import { useLocation as useLocationHook } from '../context/LocationContext';
import PageContainer from '../components/layout/pagecontainer/PageContainer';
import EventList from '../components/events/eventlist/EventList';
import EventDetailsModal from '../components/modals/eventdetails/EventDetailsModal';
import InviteUserModal from '../components/modals/InviteUserModal';
import CreateEventModal from '../components/modals/CreateEventModal';
import '../styles/Events.css';

const Events = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { events, loading, error, fetchEvents, joinEvent, leaveEvent } = useEvents();
  const { categories, loading: loadingCategories, fetchCategories } = useCategories();
  const { currentLocation, getUserLocation } = useLocationHook();
  
  // Filter state
  const [activeCategory, setActiveCategory] = useState('all');
  const [filterDistance, setFilterDistance] = useState(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, eventId: null });
  const [inviteModal, setInviteModal] = useState({ isOpen: false, eventId: null, eventTitle: null });
  const [createModal, setCreateModal] = useState(false);
  
  // UI state
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Event handlers
  const handleJoinEvent = async (eventId) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/events', message: 'Please log in to join events' } });
      return;
    }
    
    try {
      await joinEvent(eventId);
      showFeedback('You have successfully joined the event!');
    } catch (error) {
      console.error('Error joining event:', error);
      showFeedback('Failed to join the event: ' + error.message, true);
    }
  };

  const handleLeaveEvent = async (eventId) => {
    try {
      await leaveEvent(eventId);
      showFeedback('You have left the event');
    } catch (error) {
      console.error('Error leaving event:', error);
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
    if (!currentUser) {
      navigate('/login', { state: { from: '/events', message: 'Please log in to invite others' } });
      return;
    }
    
    setInviteModal({ isOpen: true, eventId, eventTitle });
  };

  const closeInviteModal = () => {
    setInviteModal({ isOpen: false, eventId: null, eventTitle: null });
  };

  const openCreateModal = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/events', message: 'Please log in to create events' } });
      return;
    }
    
    setCreateModal(true);
  };

  const closeCreateModal = () => {
    setCreateModal(false);
    fetchEvents({ 
      categoryId: activeCategory !== 'all' ? activeCategory : null,
      upcoming: !showPastEvents,
      past: showPastEvents
    });
  };

  const showFeedback = (message, isError = false) => {
    setFeedbackMessage({
      text: message,
      isError
    });
    
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const handleLocationFilter = async () => {
    try {
      await getUserLocation();
      setFilterDistance(10);
      showFeedback('Location filter applied');
    } catch (error) {
      showFeedback('Failed to get your location', true);
    }
  };

  const clearLocationFilter = () => {
    setFilterDistance(null);
  };

  const resetFilters = () => {
    setActiveCategory('all');
    setFilterDistance(null);
    setShowPastEvents(false);
    setSearchTerm('');
  };

  // Data fetching
  useEffect(() => {
    const loadData = async () => {
      await fetchEvents({ upcoming: !showPastEvents, past: showPastEvents });
      await fetchCategories();
      setIsInitialLoad(false);
    };
    
    loadData();
  }, [fetchEvents, fetchCategories, showPastEvents]);
  
  useEffect(() => {
    if (isInitialLoad) return;
    
    const filterOptions = {
      categoryId: activeCategory !== 'all' ? activeCategory : null,
      upcoming: !showPastEvents,
      past: showPastEvents,
      searchTerm: searchTerm.length > 2 ? searchTerm : null
    };
    
    if (filterDistance && currentLocation) {
      filterOptions.nearby = true;
      filterOptions.location = currentLocation;
      filterOptions.distance = filterDistance;
    }
    
    fetchEvents(filterOptions);
  }, [fetchEvents, activeCategory, showPastEvents, searchTerm, filterDistance, currentLocation, isInitialLoad]);

  return (
    <PageContainer>
      <div className="events-page">
        {loading && isInitialLoad && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        )}

        <div className={`content-wrapper ${isInitialLoad ? 'content-loading' : ''}`}>
          <div className="events-header">
            <h1>Discover Events</h1>
            <button className="btn-primary" onClick={openCreateModal}>
              Create Event
            </button>
          </div>

          {feedbackMessage && (
            <div className={`feedback-message ${feedbackMessage.isError ? 'error' : 'success'}`}>
              {feedbackMessage.text}
            </div>
          )}

          <div className="events-filters">
            <div className="search-bar">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit">Search</button>
              </form>
            </div>
            
            <div className="filter-options">
              <div className="category-filters">
                <button
                  className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                >
                  All Categories
                </button>
                
                {!loadingCategories && categories.map(category => (
                  <button
                    key={category.id}
                    className={`filter-btn ${activeCategory === category.id ? 'active' : ''}`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              
              <div className="time-filters">
                <button
                  className={`filter-btn ${!showPastEvents ? 'active' : ''}`}
                  onClick={() => setShowPastEvents(false)}
                >
                  Upcoming
                </button>
                <button
                  className={`filter-btn ${showPastEvents ? 'active' : ''}`}
                  onClick={() => setShowPastEvents(true)}
                >
                  Past Events
                </button>
              </div>
              
              {filterDistance ? (
                <button
                  className="filter-btn location-btn active"
                  onClick={clearLocationFilter}
                >
                  Within {filterDistance}km ✕
                </button>
              ) : (
                <button
                  className="filter-btn location-btn"
                  onClick={handleLocationFilter}
                >
                  Near Me
                </button>
              )}
            </div>
          </div>

          <div className="events-content">
            {error ? (
              <div className="error-container">
                <p>Error: {error}</p>
                <button onClick={() => fetchEvents()}>Try Again</button>
              </div>
            ) : events.length === 0 ? (
              <div className="no-events">
                <h3>No events found</h3>
                <p>Try adjusting your filters or create your own event!</p>
                <button className="btn-primary" onClick={openCreateModal}>
                  Create Event
                </button>
              </div>
            ) : (
              <EventList
                events={events}
                onJoin={handleJoinEvent}
                onLeave={handleLeaveEvent}
                onOpenDetails={openDetailsModal}
                onInvite={openInviteModal}
                showCategory={true}
              />
            )}
          </div>
        </div>
        
        <EventDetailsModal 
          isOpen={detailsModal.isOpen} 
          onClose={closeDetailsModal} 
          eventId={detailsModal.eventId}
          onJoin={handleJoinEvent}
          onLeave={handleLeaveEvent}
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
      </div>
    </PageContainer>
  );
};

export default Events;