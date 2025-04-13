import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for managing events
 * Provides functions to fetch, create, update, delete, join, and leave events
 */
const useEvents = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Fetch events with various filtering options
  const fetchEvents = useCallback(async ({
    categoryId = null,
    userId = null,
    upcoming = false,
    past = false,
    participated = false,
    created = false,
    maxResults = 50,
    forceRefresh = false
  } = {}) => {
    // Use cached events if available and not forcing refresh
    if (events.length > 0 && !forceRefresh && lastFetched && 
        !categoryId && !userId && !upcoming && !past && !participated && !created) {
      // If last fetch was less than 2 minutes ago, use cached data
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      if (lastFetched > twoMinutesAgo) {
        return events;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      // Build query constraints
      let eventsRef = collection(db, 'events');
      const constraints = [];
      
      // Add filters
      if (categoryId) {
        constraints.push(where('category', '==', categoryId));
      }
      
      if (userId) {
        constraints.push(where('createdBy', '==', userId));
      }
      
      if (participated && currentUser) {
        constraints.push(where('participants', 'array-contains', currentUser.uid));
      }
      
      if (created && currentUser) {
        constraints.push(where('createdBy', '==', currentUser.uid));
      }
      
      if (upcoming) {
        constraints.push(where('date', '>=', Timestamp.now()));
        constraints.push(orderBy('date', 'asc'));
      } else if (past) {
        constraints.push(where('date', '<', Timestamp.now()));
        constraints.push(orderBy('date', 'desc'));
      } else {
        constraints.push(orderBy('date', 'asc'));
      }
      
      constraints.push(limit(maxResults));
      
      // Execute query
      const eventsQuery = query(eventsRef, ...constraints);
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEvents(eventsData);
      setLastFetched(new Date());
      return eventsData;
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events");
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser, events, lastFetched]);

  // Get a single event by ID
  const getEventById = useCallback(async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if event is already in state
      const cachedEvent = events.find(event => event.id === eventId);
      if (cachedEvent) {
        setLoading(false);
        return cachedEvent;
      }
      
      // Fetch from Firestore
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        setError("Event not found");
        return null;
      }
      
      const eventData = {
        id: eventDoc.id,
        ...eventDoc.data()
      };
      
      return eventData;
    } catch (err) {
      console.error("Error fetching event:", err);
      setError("Failed to load event");
      return null;
    } finally {
      setLoading(false);
    }
  }, [events]);

  // Create a new event
  const createEvent = useCallback(async (eventData) => {
    if (!currentUser) {
      setError("You must be logged in to create events");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const newEvent = {
        ...eventData,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        participants: [currentUser.uid],
        status: 'active'
      };
      
      const docRef = await addDoc(collection(db, 'events'), newEvent);
      
      const createdEvent = {
        id: docRef.id,
        ...newEvent,
        createdAt: new Date()
      };
      
      setEvents(prev => [createdEvent, ...prev]);
      return createdEvent;
    } catch (err) {
      console.error("Error creating event:", err);
      setError("Failed to create event");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Update an existing event
  const updateEvent = useCallback(async (eventId, eventData) => {
    if (!currentUser) {
      setError("You must be logged in to update events");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // First verify ownership
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        setError("Event not found");
        throw new Error("Event not found");
      }
      
      const existingEvent = eventDoc.data();
      if (existingEvent.createdBy !== currentUser.uid) {
        setError("You don't have permission to edit this event");
        throw new Error("Permission denied");
      }
      
      // Update the event
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        ...eventData,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setEvents(prev => 
        prev.map(event => 
          event.id === eventId 
            ? { ...event, ...eventData, updatedAt: new Date() }
            : event
        )
      );
      
      return { id: eventId, ...eventData };
    } catch (err) {
      console.error("Error updating event:", err);
      setError(err.message || "Failed to update event");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Delete an event
  const deleteEvent = useCallback(async (eventId) => {
    if (!currentUser) {
      setError("You must be logged in to delete events");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // First verify ownership
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        setError("Event not found");
        throw new Error("Event not found");
      }
      
      const existingEvent = eventDoc.data();
      if (existingEvent.createdBy !== currentUser.uid) {
        setError("You don't have permission to delete this event");
        throw new Error("Permission denied");
      }
      
      // Delete the event
      await deleteDoc(doc(db, 'events', eventId));
      
      // Update local state
      setEvents(prev => prev.filter(event => event.id !== eventId));
      
      return true;
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(err.message || "Failed to delete event");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Join an event
  const joinEvent = useCallback(async (eventId) => {
    if (!currentUser) {
      setError("You must be logged in to join events");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const eventRef = doc(db, 'events', eventId);
      
      // Check if event exists and has space
      const eventDoc = await getDoc(eventRef);
      if (!eventDoc.exists()) {
        setError("Event not found");
        throw new Error("Event not found");
      }
      
      const eventData = eventDoc.data();
      if (eventData.participants && eventData.participants.includes(currentUser.uid)) {
        setError("You've already joined this event");
        return false;
      }
      
      if (eventData.participants && 
          eventData.maxParticipants && 
          eventData.participants.length >= eventData.maxParticipants) {
        setError("This event is already full");
        throw new Error("Event is full");
      }
      
      // Add user to participants
      await updateDoc(eventRef, {
        participants: arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setEvents(prev => 
        prev.map(event => 
          event.id === eventId
            ? { 
                ...event, 
                participants: [...(event.participants || []), currentUser.uid],
                updatedAt: new Date()
              }
            : event
        )
      );
      
      return true;
    } catch (err) {
      console.error("Error joining event:", err);
      setError(err.message || "Failed to join event");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Leave an event
  const leaveEvent = useCallback(async (eventId) => {
    if (!currentUser) {
      setError("You must be logged in to leave events");
      throw new Error("Authentication required");
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const eventRef = doc(db, 'events', eventId);
      
      // Check if event exists and user is a participant
      const eventDoc = await getDoc(eventRef);
      if (!eventDoc.exists()) {
        setError("Event not found");
        throw new Error("Event not found");
      }
      
      const eventData = eventDoc.data();
      if (!eventData.participants || !eventData.participants.includes(currentUser.uid)) {
        setError("You haven't joined this event");
        return false;
      }
      
      // Check if user is the creator and only participant
      if (eventData.createdBy === currentUser.uid && eventData.participants.length === 1) {
        setError("As the creator, you cannot leave without deleting the event");
        throw new Error("Creator cannot leave event");
      }
      
      // Remove user from participants
      await updateDoc(eventRef, {
        participants: arrayRemove(currentUser.uid),
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setEvents(prev => 
        prev.map(event => 
          event.id === eventId
            ? { 
                ...event, 
                participants: (event.participants || []).filter(uid => uid !== currentUser.uid),
                updatedAt: new Date()
              }
            : event
        )
      );
      
      return true;
    } catch (err) {
      console.error("Error leaving event:", err);
      setError(err.message || "Failed to leave event");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Return hook values and functions
  return {
    events,
    loading,
    error,
    fetchEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    joinEvent,
    leaveEvent
  };
};

export default useEvents;