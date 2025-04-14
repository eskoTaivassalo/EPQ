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
import { db } from '../services/firebase/config';
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
    // Koodi jatkuu...
  }, [events]);

  // Create a new event
  const createEvent = useCallback(async (eventData) => {
    // Koodi jatkuu...
  }, [currentUser]);

  // Update an existing event
  const updateEvent = useCallback(async (eventId, eventData) => {
    // Koodi jatkuu...
  }, [currentUser]);

  // Delete an event
  const deleteEvent = useCallback(async (eventId) => {
    // Koodi jatkuu...
  }, [currentUser]);

  // Join an event
  const joinEvent = useCallback(async (eventId) => {
    // Koodi jatkuu...
  }, [currentUser]);

  // Leave an event
  const leaveEvent = useCallback(async (eventId) => {
    // Koodi jatkuu...
  }, [currentUser]);

  // LISÄÄ TÄMÄ UUSI FUNKTIO: Lisää tapahtuma paikalliseen tilaan ilman tietokannan päivitystä
  // Tämä on kriittinen funktio, jotta uudet tapahtumat näkyvät välittömästi
  const addEvent = useCallback((newEvent) => {
    console.log("Adding event to local state:", newEvent);
    
    if (!newEvent || !newEvent.id) {
      console.error("Invalid event data:", newEvent);
      return false;
    }
    
    // Varmista, ettemme lisää duplikaatteja
    setEvents(prevEvents => {
      // Jos tapahtuma on jo listassa, älä lisää sitä uudelleen
      if (prevEvents.some(event => event.id === newEvent.id)) {
        console.log("Event already exists in state:", newEvent.id);
        return prevEvents;
      }
      
      // Lisää uusi tapahtuma listan alkuun
      console.log("Added new event to state:", newEvent.id);
      return [newEvent, ...prevEvents];
    });
    
    return true;
  }, []);

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
    leaveEvent,
    addEvent  // Lisää tämä uusi funktio palautettavaksi
  };
};

export default useEvents;