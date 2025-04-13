import React, { useState, useEffect, useRef } from 'react';
import { formatDate } from '../../../utils/DateUtils';
import { useAuth } from '../../../context/AuthContext';
import { collection, addDoc, doc, getDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import Modal from '../common/Modal';
import './EventDetailsModal.css';

const EventDetailsModal = ({ isOpen, onClose, eventId, onJoin, onLeave }) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('details'); // 'details' tai 'chat'
  
  // Chat-toiminnallisuus
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !eventId) return;
    
    setLoading(true);
    
    // Hae tapahtuman tiedot
    const fetchEvent = async () => {
      try {
        // Tämä on oletettu toteutus, muokkaa tarvittaessa
        const eventRef = doc(db, 'events', eventId);
        const eventDoc = await getDoc(eventRef);
        
        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          // Tarkista onko käyttäjä jo liittynyt
          eventData.isUserJoined = eventData.participants?.includes(currentUser?.uid);
          // Tarkista onko käyttäjä tapahtuman luoja
          eventData.isCreator = eventData.createdBy === currentUser?.uid;
          
          setEvent(eventData);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId, isOpen, currentUser]);

  // Vieritetään chat-näkymä alas kun uusia viestejä tulee
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Haetaan viestit Firebasesta kun chat-välilehti avataan
  useEffect(() => {
    if (!isOpen || !eventId || activeTab !== 'chat') return;

    const messagesRef = collection(db, 'event_messages');
    const messagesQuery = query(
      messagesRef,
      where('eventId', '==', eventId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageList);
    });

    return () => unsubscribe();
  }, [eventId, isOpen, activeTab]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !eventId) return;

    try {
      await addDoc(collection(db, 'event_messages'), {
        eventId: eventId,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        photoURL: currentUser.photoURL || null,
        text: newMessage.trim(),
        timestamp: serverTimestamp()
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleJoin = async () => {
    if (onJoin) {
      await onJoin(eventId);
      // Päivitä paikallinen tila
      setEvent(prev => ({...prev, isUserJoined: true}));
      // Vaihda automaattisesti chat-välilehdelle liittymisen jälkeen
      setActiveTab('chat');
    }
  };

  const handleLeave = async () => {
    if (onLeave) {
      await onLeave(eventId);
      // Päivitä paikallinen tila
      setEvent(prev => ({...prev, isUserJoined: false}));
      // Vaihda takaisin details-välilehdelle poistumisen jälkeen
      setActiveTab('details');
    }
  };

  if (!isOpen) return null;
  
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
                  {event.participants?.map(participantId => (
                    <li key={participantId} className="participant-item">
                      {/* Tässä voisi näyttää osallistujan tiedot */}
                      {participantId === event.createdBy ? (
                        <span className="host-badge">Host</span>
                      ) : null}
                      {participantId}
                    </li>
                  ))}
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
                {/* Muita toimintapainikkeita */}
              </div>
            </div>
          )}
          
          {activeTab === 'chat' && (
            <div className="modal-chat">
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-empty-state">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`chat-message ${msg.userId === currentUser?.uid ? 'own-message' : ''}`}
                    >
                      <div className="message-user">
                        {msg.photoURL ? (
                          <img src={msg.photoURL} alt={msg.userName} className="user-avatar" />
                        ) : (
                          <div className="user-avatar-placeholder">
                            {msg.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="user-name">{msg.userName}</span>
                      </div>
                      <div className="message-content">{msg.text}</div>
                      <div className="message-time">
                        {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={!event.isUserJoined}
                />
                <button 
                  type="submit" 
                  disabled={!event.isUserJoined}
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