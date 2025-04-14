import React from 'react';
import { formatDate } from '../../../utils/DateUtils';
import { useAuth } from '../../../context/AuthContext';
import './EventCard.css';

const EventCard = ({ 
  event, 
  onJoin, 
  onLeave, 
  onOpenDetails, 
  onInvite,
  showJoinButton = true,
  className = '' // Lisätty className-propsi korostamista varten
}) => {
  const { currentUser } = useAuth();
  
  // Check if the current user is a participant in this event
  const isUserJoined = currentUser && event.participants && 
    event.participants.includes(currentUser.uid);
  
  // Check if the current user is the creator
  const isCreator = currentUser && event.createdBy === currentUser.uid;

  const handleJoin = (e) => {
    e.stopPropagation();
    onJoin(event.id);
    // Join painikkeen jälkeen avataan suoraan tapahtuman tiedot
    onOpenDetails(event.id);
  };

  const handleLeave = (e) => {
    e.stopPropagation();
    if (onLeave) onLeave(event.id);
  };
  
  const handleClick = () => {
    if (onOpenDetails) onOpenDetails(event.id);
  };
  
  // Lisätään handleInvite-funktio
  const handleInvite = (e) => {
    e.stopPropagation();
    if (onInvite) onInvite(event.id, event.title);
  };
  
  return (
    // Lisätty className event-card-luokkaan, jotta kortti voidaan korostaa
    <div className={`event-card ${className}`}>
      <div className="event-card-content" onClick={handleClick}>
        {/* Tapahtuman tiedot */}
        <div className="event-card-header">
          <h3>{event.title}</h3>
          {event.categoryName && <span className="event-category">{event.categoryName}</span>}
        </div>
        
        <div className="event-card-body">
          <div className="event-info">
            <p><i className="fa fa-calendar"></i> {formatDate(event.date)}</p>
            <p><i className="fa fa-map-marker"></i> {event.location}</p>
            {event.maxParticipants && (
              <p><i className="fa fa-users"></i> {event.participants?.length || 0}/{event.maxParticipants}</p>
            )}
          </div>
          
          {event.description && (
            <div className="event-description">
              <p>{event.description.length > 100 
                ? `${event.description.substring(0, 100)}...` 
                : event.description}
              </p>
            </div>
          )}
        </div>
        
        <div className="event-card-actions">
          <button 
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(event.id);
            }}
          >
            Details
          </button>
          
          {showJoinButton && !isCreator && currentUser && (
            isUserJoined ? (
              <button 
                className="btn-danger"
                onClick={handleLeave}
              >
                Leave
              </button>
            ) : (
              <button 
                className="btn-primary"
                onClick={handleJoin}
                disabled={event.participants?.length >= event.maxParticipants}
              >
                {event.participants?.length >= event.maxParticipants 
                  ? 'Full' 
                  : 'Join'}
              </button>
            )
          )}
          
          {isCreator && (
            <button 
              className="btn-outline"
              onClick={handleInvite}
            >
              Invite
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;