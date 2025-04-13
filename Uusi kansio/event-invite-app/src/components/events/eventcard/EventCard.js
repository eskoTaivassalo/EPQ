import React from 'react';
import { formatDate } from '../../../utils/DateUtils';
import './EventCard.css';

const EventCard = ({ 
  event, 
  onJoin, 
  onLeave, 
  onOpenDetails, 
  showJoinButton = true
}) => {
  const isUserJoined = event.isUserJoined;
  const isCreator = event.isCreator;

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
  
  return (
    <div className="event-card">
      <div className="event-card-content" onClick={handleClick}>
        <div className="event-card-header">
          <h3>{event.title}</h3>
          {event.categoryName && (
            <span className="event-category">{event.categoryName}</span>
          )}
        </div>
        
        <div className="event-card-details">
          <p className="event-date">
            <i className="icon-calendar"></i>
            {formatDate(event.date)}
          </p>
          
          <p className="event-location">
            <i className="icon-location"></i>
            {event.location}
          </p>
          
          {event.maxParticipants && (
            <p className="event-participants">
              <i className="icon-users"></i>
              {event.participants?.length || 0}/{event.maxParticipants}
            </p>
          )}
        </div>
        
        {event.description && (
          <p className="event-description">
            {event.description.length > 100 
              ? `${event.description.substring(0, 100)}...` 
              : event.description}
          </p>
        )}
        
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
          
          {/* Kuka tahansa paitsi luoja voi liittyä/poistua vapaasti */}
          {showJoinButton && !isCreator && (
            isUserJoined ? (
              <button 
                className="btn-danger" // Punainen tyyli
                onClick={handleLeave}
              >
                Leave
              </button>
            ) : (
              <button 
                className="btn-primary"
                onClick={handleJoin}
              >
                Join
              </button>
            )
          )}
          
          {/* Näytetään Invite-nappi vain tapahtuman luojalle */}
          {isCreator && onJoin && (
            <button 
              className="btn-outline"
              onClick={(e) => {
                e.stopPropagation();
                onJoin(event.id);
              }}
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