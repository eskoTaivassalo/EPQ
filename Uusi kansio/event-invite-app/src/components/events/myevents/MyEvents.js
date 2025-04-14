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
import './MyEvents.css';

const MyEvents = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // Haetaan hookista tarvittavat metodit ja tilat
  const { 
    events, 
    loading, 
    error, 
    fetchEvents, 
    joinEvent, 
    leaveEvent 
  } = useEvents();
  const { getCategoryName } = useCategories();
  
  // UI state - tilat käyttöliittymää varten
  const [activeTab, setActiveTab] = useState('created');
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, eventId: null });
  const [inviteModal, setInviteModal] = useState({ isOpen: false, eventId: null, eventTitle: null });
  const [createModal, setCreateModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  
  // Uudet tapahtumat ja niiden korostus
  const [localEvents, setLocalEvents] = useState([]);
  const [justCreatedEvent, setJustCreatedEvent] = useState(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Tarkistetaan autentikointi
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/my-events', message: 'Please log in to view your events' } });
    }
  }, [currentUser, navigate]);

  // Haetaan tapahtumat aktiivisen välilehden perusteella
  useEffect(() => {
    if (currentUser) {
      const fetchMyEvents = async () => {
        try {
          let fetchedEvents;
          
          if (activeTab === 'created') {
            fetchedEvents = await fetchEvents({
              created: true,
              userId: currentUser.uid,
              maxResults: 100, // Kasvatettu määrää näyttämään kaikki tapahtumat
              forceRefresh: shouldRefresh
            });
          } else if (activeTab === 'attending') {
            fetchedEvents = await fetchEvents({
              participated: true,
              userId: currentUser.uid,
              maxResults: 100, // Kasvatettu määrää näyttämään kaikki tapahtumat
              forceRefresh: shouldRefresh
            });
          }
          
          if (fetchedEvents) {
            setLocalEvents(prev => {
              // Yhdistä haetut tapahtumat paikallisiin tapahtumiin, vältä duplikaatteja
              const combinedEvents = [...fetchedEvents];
              
              // Tarkista onko juuri luotu tapahtuma jo listassa
              if (justCreatedEvent) {
                const justCreatedExists = fetchedEvents.some(e => e.id === justCreatedEvent);
                if (!justCreatedExists) {
                  // Etsi juuri luotu tapahtuma paikallisesta listasta
                  const justCreatedEventObj = prev.find(e => e.id === justCreatedEvent);
                  if (justCreatedEventObj) {
                    combinedEvents.unshift(justCreatedEventObj);
                  }
                }
              }
              
              return combinedEvents;
            });
          }
          
          // Nollataan päivityslippu
          if (shouldRefresh) {
            setShouldRefresh(false);
          }
        } catch (error) {
          console.error("Error fetching events:", error);
        }
      };
      
      fetchMyEvents();
    }
  }, [activeTab, currentUser, fetchEvents, shouldRefresh, justCreatedEvent]);

  // Näytetään palaute käyttäjälle
  const showFeedback = (message, isError = false) => {
    setFeedbackMessage({
      text: message,
      isError
    });
    
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  // Tapahtumasta poistuminen
  const handleLeaveEvent = async (eventId) => {
    try {
      await leaveEvent(eventId);
      showFeedback('You have left the event');
      
      // Poistetaan tapahtuma paikallisesta listasta
      setLocalEvents(prev => prev.filter(event => event.id !== eventId));
      
      // Päivitetään tapahtumalista
      setShouldRefresh(true);
    } catch (error) {
      showFeedback('Failed to leave the event: ' + error.message, true);
    }
  };

  // Modaalien hallinta
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

  // PARANNETTU: Uuden tapahtuman käsittely
  const handleEventCreated = (newEvent) => {
    console.log("Tapahtuma luotu:", newEvent);
    
    if (!newEvent || !newEvent.id) {
      console.error("Virheellinen tapahtumaobjekti:", newEvent);
      return;
    }
    
    // Merkitään tapahtuma juuri luoduksi korostusta varten
    setJustCreatedEvent(newEvent.id);
    
    // Lisätään uusi tapahtuma paikalliseen tilaan välittömästi
    if (activeTab === 'created') {
      // Lisätään tapahtuma paikalliseen tilaan listan alkuun
      setLocalEvents(prev => {
        // Tarkistetaan onko tapahtuma jo listassa
        if (prev.some(e => e.id === newEvent.id)) {
          return prev;
        }
        return [newEvent, ...prev];
      });
      
      showFeedback(`Event "${newEvent.title}" created successfully!`);
    }
    
    // Poista korostus 5 sekunnin kuluttua
    setTimeout(() => {
      setJustCreatedEvent(null);
      // Päivitetään lista kun korostus poistuu
      setShouldRefresh(true);
    }, 5000);
  };

  // Parempi modaalin sulkemisfunktio
  const closeCreateModal = (newEvent) => {
    setCreateModal(false);
    
    // Jos saimme tapahtuman tiedot, lisätään se heti listaan
    if (newEvent && newEvent.id) {
      handleEventCreated(newEvent);
    }
  };

  // Ei renderöidä mitään jos käyttäjä ei ole kirjautunut
  if (!currentUser) return null;

  return (
    <PageContainer>
      <div className="my-events-container">
        <div className="page-header">
          <h1>My Events</h1>
          <button className="btn-create" onClick={openCreateModal}>
            Create Event
          </button>
        </div>

        {/* Palauteviesti */}
        {feedbackMessage && (
          <div className={`feedback-message ${feedbackMessage.isError ? 'error' : 'success'}`}>
            {feedbackMessage.text}
          </div>
        )}

        {/* Välilehdet */}
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

        {/* Tapahtumalistaus */}
        <div className="tab-content">
          {loading && localEvents.length === 0 ? (
            <div className="loading-container">
              <p>Loading events...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>Error: {error}</p>
              <button onClick={() => setShouldRefresh(true)}>
                Try Again
              </button>
            </div>
          ) : localEvents.length === 0 ? (
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
            <EventList 
              events={localEvents.map(event => ({
                ...event,
                categoryName: getCategoryName(event.category),
                isHighlighted: event.id === justCreatedEvent
              }))}
              maxEvents={100} // Varmista, että kaikki tapahtumat näkyvät
              onJoin={activeTab === 'created' ? openInviteModal : null}
              onLeave={activeTab === 'attending' ? handleLeaveEvent : null}
              onOpenDetails={openDetailsModal}
              showJoinButton={activeTab !== 'created'}
              layout="list" // Tämä asettaa listamuotoisen näkymän
            />
          )}
        </div>
      </div>

      {/* Modaalit */}
      <EventDetailsModal 
        isOpen={detailsModal.isOpen} 
        onClose={closeDetailsModal} 
        eventId={detailsModal.eventId}
        onEventUpdated={() => setShouldRefresh(true)}
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
        onCreated={handleEventCreated}
      />
    </PageContainer>
  );
};

export default MyEvents;