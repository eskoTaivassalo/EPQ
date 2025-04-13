import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, getDoc, doc, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext'; // Lisätty AuthContext
import CategorySelector from '../../layout/CategorySelector';
import EventCard from '../eventcard/EventCard';
import './EventList.css'; // Assuming you have a CSS file for styling

const EventList = ({ maxEvents = 6, showCategory = true, onJoin, onOpenDetails, onInvite }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { currentUser } = useAuth(); // Haetaan currentUser AuthContext:sta

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Build query
      let eventsQuery = collection(db, 'events');
      let constraints = [];
      
      // Add filters and sorting
      if (selectedCategory) {
        constraints.push(where('category', '==', selectedCategory));
      }
      
      constraints.push(orderBy('date', 'asc'));
      constraints.push(limit(maxEvents));
      
      // Execute query
      const eventsSnapshot = await getDocs(query(eventsQuery, ...constraints));
      
      // Process results
      const eventsData = [];
      for (const docSnap of eventsSnapshot.docs) {
        const eventData = { id: docSnap.id, ...docSnap.data() };
        
        // Get category name if needed
        if (eventData.category) {
          try {
            const categoryDocRef = doc(db, 'categories', eventData.category);
            const categoryDoc = await getDoc(categoryDocRef);
            if (categoryDoc.exists()) {
              eventData.categoryName = categoryDoc.data().name;
            }
          } catch (err) {
            console.error("Error fetching category name:", err);
          }
        }
        
        eventsData.push(eventData);
      }
      
      setEvents(eventsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  if (loading) return <div className="events-loading">Loading events...</div>;
  if (error) return <div className="events-error">{error}</div>;
  if (events.length === 0) return <div className="events-empty">No events found</div>;

  return (
    <div className="events-container">
      {showCategory && (
        <div className="events-filter">
          <CategorySelector 
            selectedCategory={selectedCategory} 
            onChange={handleCategoryChange} 
          />
        </div>
      )}
      
      <div className="events-grid">
        {events.map(event => (
          <EventCard 
            key={event.id}
            event={event}
            onJoin={onJoin}
            onOpenDetails={onOpenDetails}
            onInvite={onInvite}
            isJoined={currentUser ? event.participants?.includes(currentUser.uid) : false} // Lisätty null-check
          />
        ))}
      </div>
    </div>
  );
};

export default EventList;