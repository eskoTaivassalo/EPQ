import React, { useState } from 'react';
import InviteChatModal from '../../modals/InviteChatModal';
import './InviteCard.css';

const InviteCard = ({ invite, onStatusChange, onViewEvent, compact = false }) => {
  const [showChatModal, setShowChatModal] = useState(false);
  
  // Jos kutsu-objekti puuttuu kokonaan, näytetään virheilmoitus
  if (!invite) {
    return (
      <div className="invite-card error">
        <p>Virheellinen kutsu - dataa ei saatu</p>
      </div>
    );
  }
  
  const isOpenInvite = invite.type === 'open';
  
  // Format date - toimii myös jos päivämäärä puuttuu
  const formatDate = (date) => {
    if (!date) return 'Ei päivämäärää';
    
    try {
      // Convert Firebase timestamp to JS Date if needed
      const dateObj = date.toDate ? date.toDate() : date;
      
      return new Intl.DateTimeFormat('fi-FI', {
        dateStyle: 'full',
        timeStyle: 'short'
      }).format(dateObj);
    } catch (err) {
      console.error("Error formatting date:", err);
      return 'Virheellinen päivämäärä';
    }
  };

  // Handle status change with chat opening for accepted invites
  const handleStatusChange = (status) => {
    if (onStatusChange) {
      onStatusChange(invite.id, status);
      
      // Open chat modal when accepting invitation
      if (status === 'accepted') {
        setShowChatModal(true);
      }
    }
  };
  
  // Määritetään card-luokka tilan mukaan
  const cardClass = `invite-card ${invite.status || 'pending'} ${compact ? 'compact' : ''} ${isOpenInvite ? 'open-invite' : ''}`;
  
  return (
    <div className={cardClass}>
      <div className="invite-header">
        <div className="invite-title-container">
          <span className={`invite-type ${isOpenInvite ? 'open' : 'personal'}`}>
            {isOpenInvite ? 'Avoin kutsu' : 'Henkilökohtainen'}
          </span>
          <h3 className="event-title">
            {invite.title || 'Kutsu ilman otsikkoa'}
          </h3>
        </div>
      </div>
      
      <div className="invite-content">
        {invite.description && (
          <p className="invite-description">
            {invite.description}
          </p>
        )}
        
        <div className="invite-details">
          <p className="invite-date">
            <strong>Päivämäärä:</strong> {formatDate(invite.date)}
          </p>
          
          {invite.location && (
            <p className="invite-location">
              <strong>Sijainti:</strong> {invite.location}
            </p>
          )}
          
          <p className="invite-sender">
            <strong>Lähettäjä:</strong> {invite.creatorName || invite.senderName || 'Tuntematon'}
          </p>
          
          {invite.message && (
            <p className="invite-message">"{invite.message}"</p>
          )}
        </div>
      </div>
      
      <div className="invite-actions">
        {(invite.status === 'pending' || !invite.status) ? (
          <>
            <button 
              className="btn-accept" 
              onClick={() => handleStatusChange('accepted')}
            >
              Hyväksy
            </button>
            <button 
              className="btn-decline" 
              onClick={() => handleStatusChange('declined')}
            >
              Hylkää
            </button>
          </>
        ) : (
          <div className="invite-status">
            <span className={`status-badge ${invite.status}`}>
              {invite.status === 'accepted' ? 'Hyväksytty' : 'Hylätty'}
            </span>
            {invite.status === 'accepted' && (
              <button 
                className="btn-chat" 
                onClick={() => setShowChatModal(true)}
              >
                Avaa keskustelu
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Chat modal */}
      <InviteChatModal 
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        inviteId={invite.id}
        inviteType={invite.type || 'open'}
      />
    </div>
  );
};

export default InviteCard;