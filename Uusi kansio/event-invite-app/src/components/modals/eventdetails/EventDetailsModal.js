import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { formatDate } from '../../../utils/DateUtils';
import Modal from '../common/Modal';
import './EventDetailsModal.css';

const EventDetailsModal = ({ isOpen, onClose, eventId, onJoin, onLeave }) => {
  const { currentUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  
  const messagesEndRef = useRef(null);

  // Fetch event details
  useEffect(() => {
    if (!eventId) return;
    
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const eventDocRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventDocRef);
        
        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          
          // Check if user is participant
          const isUserJoined = currentUser && 
            eventData.participants?.includes(currentUser.uid);
          
          // Check if user is creator
          const isCreator = currentUser && 
            eventData.createdBy === currentUser.uid;
          
          setEvent({
            ...eventData,
            isUserJoined,
            isCreator
          });
          
          // Fetch participant details
          fetchParticipants(eventData.participants || [], eventData.createdBy);
        } else {
          setError('Event not found');
          setEvent(null);
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, currentUser]);
  
  // Fetch participant user details from Firestore
  const fetchParticipants = async (participantIds, creatorId) => {
    try {
      const participantsData = [];
      
      for (const userId of participantIds) {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          participantsData.push({
            id: userId,
            ...userDoc.data(),
            isCreator: userId === creatorId
          });
        } else {
          // If user data not found, use UID as name
          participantsData.push({
            id: userId,
            displayName: userId.substring(0, 8) + '...',
            isCreator: userId === creatorId
          });
        }
      }
      
      setParticipants(participantsData);
    } catch (err) {
      console.error('Error fetching participant details:', err);
    }
  };

  // Fetch chat messages
  useEffect(() => {
    if (!eventId || !event?.isUserJoined || activeTab !== 'chat') return;
    
    const messagesQuery = query(
      collection(db, 'events', eventId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      scrollToBottom();
    });
    
    return () => unsubscribe();
  }, [eventId, event?.isUserJoined, activeTab]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);
  
  const handleJoin = () => {
    if (onJoin) onJoin(eventId);
  };
  
  const handleLeave = () => {
    if (onLeave) onLeave(eventId);
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !event?.isUserJoined) return;
    
    try {
      // Luodaan viestiobjekti
      const messageData = {
        text: newMessage.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        photoURL: currentUser.photoURL || null,
        timestamp: Timestamp.now()
      };
      
      // Lähetetään viesti Firebaseen
      await addDoc(collection(db, 'events', eventId, 'messages'), messageData);
      
      // Tyhjennetään viestikenttä
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="event-details-modal">
      {loading ? (
        <div className="modal-loading">Loading event details...</div>
      ) : !event ? (
        <div className="modal-error">Event not found</div>
      ) : (
        <>
          <div className="modal-header">
            <h2>{event.title}</h2>
            {event.categoryName && (
              <span className="event-category">{event.categoryName}</span>
            )}
            <button className="modal-close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-tabs">
            <button 
              className={`modal-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            {event.isUserJoined && (
              <button 
                className={`modal-tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                Group Chat {messages.length > 0 && <span className="message-count">{messages.length}</span>}
              </button>
            )}
          </div>
          
          {activeTab === 'details' && (
            <div className="modal-content">
              <div className="event-details">
                <p className="event-date">
                  <i className="icon-calendar"></i>
                  {formatDate(event.date)}
                </p>
                
                <p className="event-location">
                  <i className="icon-location"></i>
                  {event.location}
                </p>
                
                {event.maxParticipants && (
                  <p className="event-participants-count">
                    <i className="icon-users"></i>
                    {event.participants?.length || 0}/{event.maxParticipants} participants
                  </p>
                )}
              </div>
              
              {event.description && (
                <div className="event-description">
                  <h3>Description</h3>
                  <p>{event.description}</p>
                </div>
              )}
              
              <div className="event-participants">
                <h3>Participants ({event.participants?.length || 0})</h3>
                <ul className="participants-list">
                  {participants.length > 0 ? (
                    participants.map(participant => (
                      <li key={participant.id} className="participant-item">
                        {participant.isCreator && (
                          <span className="host-badge">Host</span>
                        )}
                        <span className="participant-name">
                          {participant.displayName || participant.email || participant.id.substring(0, 8) + '...'}
                        </span>
                      </li>
                    ))
                  ) : (
                    event.participants?.map(participantId => (
                      <li key={participantId} className="participant-item">
                        {participantId === event.createdBy ? (
                          <span className="host-badge">Host</span>
                        ) : null}
                        {participantId.substring(0, 8)}...
                      </li>
                    ))
                  )}
                </ul>
              </div>
              
              <div className="modal-actions">
                {!event.isCreator && (
                  event.isUserJoined ? (
                    <button className="btn-danger" onClick={handleLeave}>
                      Leave Event
                    </button>
                  ) : (
                    <button 
                      className="btn-primary"
                      onClick={handleJoin}
                    >
                      Join Event
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'chat' && (
            <div className="modal-chat">
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`chat-message ${message.userId === currentUser.uid ? 'own-message' : 'other-message'}`}
                    >
                      <div className="message-header">
                        <span className="message-username">{message.userName || 'Anonymous'}</span>
                        <span className="message-time">
                          {message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <div className="message-content">{message.text}</div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form className="chat-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={!event.isUserJoined}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || !event.isUserJoined}
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default EventDetailsModal;