import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  serverTimestamp, 
  orderBy, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import PageContainer from '../components/layout/pagecontainer/PageContainer';
import InviteList from '../components/invitations/invitelist/InviteList';
import InviteChatModal from '../components/modals/InviteChatModal';
import '../styles/Invites.css';

const Invites = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState('received');
  const [invites, setInvites] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  
  // Check authentication
  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { 
        state: { from: '/invites', message: 'Please log in to view your invitations' } 
      });
    }
  }, [currentUser, navigate]);
  
  // Fetch invites when tab changes or component mounts
  useEffect(() => {
    if (!currentUser) return;
    
    const loadInvites = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (activeTab === 'received') {
          await fetchReceivedInvites();
        } else {
          await fetchSentInvites();
        }
      } catch (err) {
        setError('Failed to load invitations. Please try again.');
        showFeedback('Failed to load invitations', true);
      } finally {
        setLoading(false);
      }
    };
    
    loadInvites();
  }, [activeTab, currentUser]);
  
  // Fetch received invitations with chat histories
  const fetchReceivedInvites = async () => {
    try {
      // Fetch personal invites sent to the current user
      const personalInvitesQuery = query(
        collection(db, 'invites'),
        where('recipientId', '==', currentUser.uid)
      );
      
      const personalInvitesSnapshot = await getDocs(personalInvitesQuery);
      const personalInvites = personalInvitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'personal',
        inviteType: 'received'
      }));
      
      // Fetch open invitations the user has responded to
      const openInvitesQuery = query(
        collection(db, 'openInvitations'),
        where('responderId', '==', currentUser.uid)
      );
      
      const openInvitesSnapshot = await getDocs(openInvitesQuery);
      const openInvites = openInvitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'open',
        inviteType: 'received'
      }));
      
      // Combine and enrich with chat history info
      const allInvites = [...personalInvites, ...openInvites];
      const enrichedInvites = await Promise.all(
        allInvites.map(async invite => {
          // If accepted, get chat info
          if (invite.status === 'accepted') {
            const chatInfo = await getChatInfo(invite.id);
            return { ...invite, chatInfo };
          }
          return invite;
        })
      );
      
      // Sort by status (accepted first) and then by date
      const sortedInvites = sortInvites(enrichedInvites);
      setInvites(sortedInvites);
      return sortedInvites;
      
    } catch (err) {
      throw err;
    }
  };
  
  // Fetch sent invitations with chat histories
  const fetchSentInvites = async () => {
    try {
      // Fetch personal invites sent by the current user
      const personalInvitesQuery = query(
        collection(db, 'invites'),
        where('senderId', '==', currentUser.uid)
      );
      
      const personalInvitesSnapshot = await getDocs(personalInvitesQuery);
      const personalInvites = personalInvitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'personal',
        inviteType: 'sent'
      }));
      
      // Fetch open invitations created by the current user
      const openInvitesQuery = query(
        collection(db, 'openInvitations'),
        where('createdBy', '==', currentUser.uid)
      );
      
      const openInvitesSnapshot = await getDocs(openInvitesQuery);
      const openInvites = openInvitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'open',
        inviteType: 'sent'
      }));
      
      // Combine and enrich with chat history info
      const allInvites = [...personalInvites, ...openInvites];
      const enrichedInvites = await Promise.all(
        allInvites.map(async invite => {
          // If accepted, get chat info
          if (invite.status === 'accepted') {
            const chatInfo = await getChatInfo(invite.id);
            return { ...invite, chatInfo };
          }
          return invite;
        })
      );
      
      // Sort by status (accepted first) and then by date
      const sortedInvites = sortInvites(enrichedInvites);
      setInvites(sortedInvites);
      return sortedInvites;
      
    } catch (err) {
      throw err;
    }
  };
  
  // Get chat history information for an invitation
  const getChatInfo = async (inviteId) => {
    try {
      const chatId = `invite_${inviteId}`;
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        messageCount: messages.length,
        lastMessage: messages[0] || null,
        lastActivity: messages[0]?.timestamp || null
      };
    } catch (err) {
      return {
        messageCount: 0,
        lastMessage: null,
        lastActivity: null,
        error: err.message
      };
    }
  };
  
  // Sort invites by status and date
  const sortInvites = (invitesToSort) => {
    return [...invitesToSort].sort((a, b) => {
      // First sort by status (accepted first)
      if (a.status === 'accepted' && b.status !== 'accepted') return -1;
      if (a.status !== 'accepted' && b.status === 'accepted') return 1;
      
      // Then sort by chat activity if both are accepted
      if (a.status === 'accepted' && b.status === 'accepted') {
        const aLastActivity = a.chatInfo?.lastActivity?.toDate?.() || a.respondedAt?.toDate?.() || new Date();
        const bLastActivity = b.chatInfo?.lastActivity?.toDate?.() || b.respondedAt?.toDate?.() || new Date();
        return bLastActivity - aLastActivity; // Most recent first
      }
      
      // Then sort by date for other statuses
      const aDate = a.date?.toDate?.() || a.createdAt?.toDate?.() || new Date();
      const bDate = b.date?.toDate?.() || b.createdAt?.toDate?.() || new Date();
      return bDate - aDate; // Most recent first
    });
  };
  
  // Accept or decline an invitation
  const handleStatusChange = async (inviteId, newStatus) => {
    try {
      const invite = invites.find(inv => inv.id === inviteId);
      
      if (!invite) {
        return;
      }
      
      // Determine collection based on invite type
      const collectionName = invite.type === 'personal' ? 'invites' : 'openInvitations';
      const inviteRef = doc(db, collectionName, inviteId);
      
      // Update status in Firestore
      await updateDoc(inviteRef, {
        status: newStatus,
        respondedAt: serverTimestamp(),
        responderId: currentUser.uid
      });
      
      // Update local state
      const updatedInvites = invites.map(inv => 
        inv.id === inviteId ? { ...inv, status: newStatus } : inv
      );
      
      // Re-sort the invites
      const sortedInvites = sortInvites(updatedInvites);
      setInvites(sortedInvites);
      
      showFeedback(`Invitation ${newStatus === 'accepted' ? 'accepted' : 'declined'}`);
      
      // If accepted, open chat modal
      if (newStatus === 'accepted') {
        handleOpenChat(invite);
      }
      
    } catch (err) {
      showFeedback(`Failed to ${newStatus === 'accepted' ? 'accept' : 'decline'} invitation`, true);
    }
  };
  
  // Open chat modal for a specific invitation
  const handleOpenChat = (invite) => {
    setSelectedInvite(invite);
    setChatModalOpen(true);
  };
  
  // Close chat modal
  const handleCloseChat = () => {
    setChatModalOpen(false);
    // Refresh the invitation list to get updated chat history
    if (activeTab === 'received') {
      fetchReceivedInvites();
    } else {
      fetchSentInvites();
    }
  };
  
  // Show feedback message
  const showFeedback = (message, isError = false) => {
    setFeedbackMessage({
      text: message,
      isError
    });
    
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };
  
  // Handle viewing event details
  const handleViewEvent = (eventId) => {
    navigate(`/event/${eventId}`);
  };
  
  if (!currentUser) return null; // Prevent rendering if not authenticated
  
  return (
    <PageContainer>
      <div className="invites-page">
        <div className="invites-header">
          <h1>Invitations</h1>
        </div>
        
        {feedbackMessage && (
          <div className={`feedback-message ${feedbackMessage.isError ? 'error' : 'success'}`}>
            {feedbackMessage.text}
          </div>
        )}
        
        <div className="invites-tabs">
          <button 
            className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Hyväksytyt
          </button>
          <button 
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Lähetetyt
          </button>
        </div>
        
        <div className="invites-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading invitations...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p>{error}</p>
              <button 
                onClick={() => activeTab === 'received' ? fetchReceivedInvites() : fetchSentInvites()}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : (
            <InviteList
              invites={invites}
              onStatusChange={handleStatusChange}
              onViewEvent={handleViewEvent}
              onOpenChat={handleOpenChat}
              showChatOption={true}
            />
          )}
        </div>
      </div>
      
      {/* Chat Modal */}
      {selectedInvite && (
        <InviteChatModal 
          isOpen={chatModalOpen}
          onClose={handleCloseChat}
          inviteId={selectedInvite.id}
          inviteType={selectedInvite.type || 'open'}
        />
      )}
    </PageContainer>
  );
};

export default Invites;