import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/DateUtils';
import './common/Modals.css';

const InviteChatModal = ({ isOpen, onClose, inviteId, inviteType = 'open' }) => {
  const { currentUser } = useAuth();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [creatorInfo, setCreatorInfo] = useState(null);
  const [accepterInfo, setAccepterInfo] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);
  
  // Fetch invite details
  useEffect(() => {
    if (!isOpen || !inviteId) return;
    
    const fetchInviteDetails = async () => {
      try {
        setLoading(true);
        // Determine collection based on invite type
        const collectionName = inviteType === 'personal' ? 'invites' : 'openInvitations';
        const inviteRef = doc(db, collectionName, inviteId);
        const inviteSnap = await getDoc(inviteRef);
        
        if (inviteSnap.exists()) {
          const inviteData = { id: inviteSnap.id, ...inviteSnap.data() };
          setInvite(inviteData);
          
          // Fetch creator info
          const creatorId = inviteData.createdBy || inviteData.senderId;
          if (creatorId) {
            fetchUserInfo(creatorId).then(userInfo => {
              setCreatorInfo(userInfo);
            });
          }
          
          // Fetch accepter info (current user if not the creator)
          const accepterId = inviteData.responderId || 
            (currentUser.uid !== creatorId ? currentUser.uid : null);
          
          if (accepterId) {
            fetchUserInfo(accepterId).then(userInfo => {
              setAccepterInfo(userInfo);
            });
          }
        } else {
          setError('Invitation not found');
        }
      } catch (err) {
        console.error('Error fetching invite details:', err);
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInviteDetails();
  }, [isOpen, inviteId, inviteType, currentUser]);
  
  // Subscribe to chat messages
  useEffect(() => {
    if (!isOpen || !inviteId) return;
    
    // Create chat collection reference
    const chatId = `invite_${inviteId}`;
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      scrollToBottom();
    });
    
    return () => unsubscribe();
  }, [isOpen, inviteId]);
  
  // Fetch user info from Firestore
  const fetchUserInfo = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { id: userId, ...userSnap.data() };
      } else if (userId === currentUser.uid) {
        // Use current user's auth data if Firestore data not available
        return {
          id: userId,
          displayName: currentUser.displayName || 'You',
          email: currentUser.email,
          photoURL: currentUser.photoURL
        };
      } else {
        return {
          id: userId,
          displayName: 'Unknown User',
          email: 'unknown'
        };
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      return { id: userId, displayName: 'Error loading user' };
    }
  };
  
  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newMessage.trim() || !currentUser) return;
    
    try {
      // Create message object
      const messageData = {
        text: newMessage.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'Anonymous',
        photoURL: currentUser.photoURL,
        timestamp: serverTimestamp()
      };
      
      // Add message to Firestore
      const chatId = `invite_${inviteId}`;
      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
      
      // Clear input field
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    }
  };
  
  // Handle modal background click
  const handleBackdropClick = (e) => {
    // Only close if the click is directly on the backdrop
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen) return null;

  // Use React Portal to render the modal directly to the body
  return ReactDOM.createPortal(
    <div 
      className="modal-overlay" 
      onClick={handleBackdropClick}
      onMouseMove={(e) => e.stopPropagation()} 
    >
      <div 
        className="modal-content invite-chat-modal" 
        onClick={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseEnter={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Chat - {invite?.title || 'Invitation'}</h2>
          <button 
            className="close-button" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            &times;
          </button>
        </div>
        
        {loading ? (
          <div className="modal-loading">Loading chat...</div>
        ) : error ? (
          <div className="modal-error">{error}</div>
        ) : (
          <div className="invite-chat-container">
            <div className="invite-info-sidebar">
              <div className="invite-details-box">
                <h3>Invitation Details</h3>
                {invite?.description && (
                  <p className="invite-description">{invite.description}</p>
                )}
                
                <div className="info-item">
                  <span className="label">Category:</span>
                  <span className="value">{invite?.category || invite?.title || 'Not specified'}</span>
                </div>
                
                <div className="info-item">
                  <span className="label">Date:</span>
                  <span className="value">
                    {invite?.date ? formatDate(invite.date) : 'Not specified'}
                  </span>
                </div>
                
                {invite?.location && (
                  <div className="info-item">
                    <span className="label">Location:</span>
                    <span className="value">{invite.location}</span>
                  </div>
                )}
                
                {invite?.message && (
                  <div className="invite-message-box">
                    <p className="message-label">Message from creator:</p>
                    <p className="message-text">"{invite.message}"</p>
                  </div>
                )}
              </div>
              
              <div className="chat-participants">
                <h3>Participants</h3>
                
                {creatorInfo && (
                  <div className="participant creator">
                    <div className="participant-avatar">
                      {creatorInfo.photoURL ? (
                        <img src={creatorInfo.photoURL} alt="Creator" />
                      ) : (
                        <div className="avatar-placeholder">
                          {creatorInfo.displayName?.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                    <div className="participant-info">
                      <div className="participant-name">
                        {creatorInfo.displayName || creatorInfo.email || 'Creator'}
                      </div>
                      <div className="participant-role">Creator</div>
                    </div>
                  </div>
                )}
                
                {accepterInfo && (
                  <div className="participant accepter">
                    <div className="participant-avatar">
                      {accepterInfo.photoURL ? (
                        <img src={accepterInfo.photoURL} alt="Accepter" />
                      ) : (
                        <div className="avatar-placeholder">
                          {accepterInfo.displayName?.charAt(0) || 'A'}
                        </div>
                      )}
                    </div>
                    <div className="participant-info">
                      <div className="participant-name">
                        {accepterInfo.displayName || accepterInfo.email || 'Participant'}
                      </div>
                      <div className="participant-role">Participant</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="chat-area">
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`chat-message ${message.userId === currentUser.uid ? 'own-message' : ''}`}
                    >
                      <div className="message-header">
                        <span className="message-sender">
                          {message.userId === currentUser.uid ? 'You' : message.userName}
                        </span>
                        <span className="message-time">
                          {message.timestamp ? 
                            new Date(message.timestamp.toDate()).toLocaleTimeString() : 
                            'Sending...'}
                        </span>
                      </div>
                      <div className="message-bubble">
                        {message.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <form 
                className="chat-form" 
                onSubmit={handleSendMessage}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  className="chat-input"
                  value={newMessage}
                  onChange={(e) => {
                    e.stopPropagation();
                    setNewMessage(e.target.value);
                  }}
                  placeholder="Type a message..."
                />
                <button 
                  type="submit" 
                  className="chat-submit-btn"
                  disabled={!newMessage.trim()}
                  onClick={(e) => e.stopPropagation()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body // Render directly into body
  );
};

export default InviteChatModal;