import { useState, useCallback } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for managing event invites
 * Provides functions to fetch, create, accept, decline invites
 */
const useInvites = () => {
  const { currentUser } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch invites received by current user
  const fetchReceivedInvites = useCallback(async (statusFilter = null) => {
    if (!currentUser) {
      setError("You must be logged in to view invites");
      return [];
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Build query
      let invitesRef = collection(db, 'invites');
      let constraints = [
        where('recipientId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ];
      
      // Add status filter if provided
      if (statusFilter) {
        constraints.push(where('status', '==', statusFilter));
      }
      
      const invitesQuery = query(invitesRef, ...constraints);
      const invitesSnapshot = await getDocs(invitesQuery);
      
      const invitesData = invitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInvites(invitesData);
      return invitesData;
    } catch (err) {
      console.error("Error fetching received invites:", err);
      setError("Failed to load invites");
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch invites sent by current user
  const fetchSentInvites = useCallback(async (statusFilter = null) => {
    if (!currentUser) {
      setError("You must be logged in to view sent invites");
      return [];
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Build query
      let invitesRef = collection(db, 'invites');
      let constraints = [
        where('senderId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ];
      
      // Add status filter if provided
      if (statusFilter) {
        constraints.push(where('status', '==', statusFilter));
      }
      
      const invitesQuery = query(invitesRef, ...constraints);
      const invitesSnapshot = await getDocs(invitesQuery);
      
      const invitesData = invitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInvites(invitesData);
      return invitesData;
    } catch (err) {
      console.error("Error fetching sent invites:", err);
      setError("Failed to load sent invites");
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Create a new invite
  const sendInvite = useCallback(async (eventId, recipientId, message = '') => {
    if (!currentUser) {
      setError("You must be logged in to send invites");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // First get the event details
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        setError("Event not found");
        throw new Error("Event not found");
      }
      
      const eventData = eventDoc.data();
      
      // Check if the user is allowed to invite (creator or participant)
      if (eventData.createdBy !== currentUser.uid && 
          (!eventData.participants || !eventData.participants.includes(currentUser.uid))) {
        setError("You must be part of the event to invite others");
        throw new Error("Permission denied");
      }
      
      // Check if recipient is already invited or participating
      const existingInviteQuery = query(
        collection(db, 'invites'),
        where('eventId', '==', eventId),
        where('recipientId', '==', recipientId),
        where('status', '==', 'pending')
      );
      
      const existingInvites = await getDocs(existingInviteQuery);
      if (!existingInvites.empty) {
        setError("This person has already been invited");
        throw new Error("Duplicate invite");
      }
      
      // Check if recipient is already a participant
      if (eventData.participants && eventData.participants.includes(recipientId)) {
        setError("This person is already participating in the event");
        throw new Error("Already participating");
      }
      
      // Get recipient user to include their name in notifications
      const recipientDoc = await getDoc(doc(db, 'users', recipientId));
      let recipientName = 'User';
      if (recipientDoc.exists()) {
        const recipientData = recipientDoc.data();
        recipientName = recipientData.displayName || recipientData.email || 'User';
      }
      
      // Create the invite
      const inviteData = {
        eventId,
        eventTitle: eventData.title,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email || 'User',
        recipientId,
        recipientName,
        message,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'invites'), inviteData);
      
      const newInvite = {
        id: docRef.id,
        ...inviteData,
        createdAt: new Date()
      };
      
      setInvites(prev => [newInvite, ...prev]);
      return newInvite;
    } catch (err) {
      console.error("Error sending invite:", err);
      setError(err.message || "Failed to send invite");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Accept an invite
  const acceptInvite = useCallback(async (inviteId) => {
    if (!currentUser) {
      setError("You must be logged in to accept invites");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the invite
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteDoc.exists()) {
        setError("Invite not found");
        throw new Error("Invite not found");
      }
      
      const inviteData = inviteDoc.data();
      
      // Verify the recipient is the current user
      if (inviteData.recipientId !== currentUser.uid) {
        setError("You don't have permission to accept this invite");
        throw new Error("Permission denied");
      }
      
      // Check if the invite is still pending
      if (inviteData.status !== 'pending') {
        setError(`This invite has already been ${inviteData.status}`);
        throw new Error("Invalid invite status");
      }
      
      // Get the event to update participants
      const eventRef = doc(db, 'events', inviteData.eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        setError("Event no longer exists");
        throw new Error("Event not found");
      }
      
      const eventData = eventDoc.data();
      
      // Check if event is full
      if (eventData.participants && 
          eventData.maxParticipants && 
          eventData.participants.length >= eventData.maxParticipants) {
        
        // Update invite to 'expired' due to full event
        await updateDoc(doc(db, 'invites', inviteId), {
          status: 'expired',
          respondedAt: serverTimestamp()
        });
        
        setError("This event is already full");
        throw new Error("Event is full");
      }
      
      // Transaction to update both documents
      // Update invite status
      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'accepted',
        respondedAt: serverTimestamp()
      });
      
      // Add user to event participants
      const participants = eventData.participants || [];
      if (!participants.includes(currentUser.uid)) {
        participants.push(currentUser.uid);
        await updateDoc(eventRef, { participants });
      }
      
      // Update local state
      setInvites(prev => 
        prev.map(invite => 
          invite.id === inviteId 
            ? { ...invite, status: 'accepted', respondedAt: new Date() }
            : invite
        )
      );
      
      return true;
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError(err.message || "Failed to accept invite");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Decline an invite
  const declineInvite = useCallback(async (inviteId) => {
    if (!currentUser) {
      setError("You must be logged in to decline invites");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the invite
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteDoc.exists()) {
        setError("Invite not found");
        throw new Error("Invite not found");
      }
      
      const inviteData = inviteDoc.data();
      
      // Verify the recipient is the current user
      if (inviteData.recipientId !== currentUser.uid) {
        setError("You don't have permission to decline this invite");
        throw new Error("Permission denied");
      }
      
      // Check if the invite is still pending
      if (inviteData.status !== 'pending') {
        setError(`This invite has already been ${inviteData.status}`);
        throw new Error("Invalid invite status");
      }
      
      // Update invite status
      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'declined',
        respondedAt: serverTimestamp()
      });
      
      // Update local state
      setInvites(prev => 
        prev.map(invite => 
          invite.id === inviteId 
            ? { ...invite, status: 'declined', respondedAt: new Date() }
            : invite
        )
      );
      
      return true;
    } catch (err) {
      console.error("Error declining invite:", err);
      setError(err.message || "Failed to decline invite");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Cancel a sent invite (only for sender)
  const cancelInvite = useCallback(async (inviteId) => {
    if (!currentUser) {
      setError("You must be logged in to cancel invites");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the invite
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      if (!inviteDoc.exists()) {
        setError("Invite not found");
        throw new Error("Invite not found");
      }
      
      const inviteData = inviteDoc.data();
      
      // Verify the sender is the current user
      if (inviteData.senderId !== currentUser.uid) {
        setError("You don't have permission to cancel this invite");
        throw new Error("Permission denied");
      }
      
      // Check if the invite has already been accepted
      if (inviteData.status === 'accepted') {
        setError("Cannot cancel an accepted invite");
        throw new Error("Invalid invite status");
      }
      
      // Delete the invite
      await deleteDoc(doc(db, 'invites', inviteId));
      
      // Update local state
      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
      
      return true;
    } catch (err) {
      console.error("Error canceling invite:", err);
      setError(err.message || "Failed to cancel invite");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Get invite by ID
  const getInviteById = useCallback(async (inviteId) => {
    try {
      setLoading(true);
      setError(null);
      
      const inviteDoc = await getDoc(doc(db, 'invites', inviteId));
      
      if (!inviteDoc.exists()) {
        setError("Invite not found");
        return null;
      }
      
      return {
        id: inviteDoc.id,
        ...inviteDoc.data()
      };
    } catch (err) {
      console.error("Error getting invite:", err);
      setError("Failed to load invite");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get pending invites count for notification badges
  const getPendingInvitesCount = useCallback(async () => {
    if (!currentUser) return 0;
    
    try {
      const pendingInvitesQuery = query(
        collection(db, 'invites'),
        where('recipientId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(pendingInvitesQuery);
      return snapshot.size;
    } catch (err) {
      console.error("Error counting pending invites:", err);
      return 0;
    }
  }, [currentUser]);

  return {
    invites,
    loading,
    error,
    fetchReceivedInvites,
    fetchSentInvites,
    sendInvite,
    acceptInvite,
    declineInvite,
    cancelInvite,
    getInviteById,
    getPendingInvitesCount
  };
};

export default useInvites;