import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, getDoc, doc, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import { useAuth } from '../../../context/AuthContext'; 
import CategorySelector from '../../layout/CategorySelector';
import EventCard from '../eventcard/EventCard';
import './EventList.css';

/**
 * EventList-komponentti näyttää tapahtumat joko ruudukko- tai listanäkymässä
 * 
 * @param {Array} providedEvents - Valmiiksi haetut tapahtumat (valinnainen)
 * @param {number} maxEvents - Tapahtumien enimmäismäärä
 * @param {boolean} showCategory - Näytetäänkö kategoriavalikko
 * @param {function} onJoin - Tapahtumaan liittymisen käsittelijäfunktio
 * @param {function} onLeave - Tapahtumasta poistumisen käsittelijäfunktio
 * @param {function} onOpenDetails - Tapahtuman tietojen avaamisen käsittelijäfunktio
 * @param {function} onInvite - Kutsujen lähettämisen käsittelijäfunktio
 * @param {boolean} showJoinButton - Näytetäänkö liittymispainike
 * @param {string} layout - Näkymän asettelu: "grid" (ruudukko) tai "list" (vieritettävä lista)
 */
const EventList = ({ 
  events: providedEvents,
  maxEvents = 100, 
  showCategory = true, 
  onJoin, 
  onLeave, 
  onOpenDetails, 
  onInvite,
  showJoinButton = true,
  layout = "grid" // Uusi prop: "grid" tai "list"
}) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Jos events on annettu propseissa, käytetään niitä suoraan
    if (providedEvents) {
      setEvents(providedEvents);
      setLoading(false);
    } else {
      fetchEvents();
    }
  }, [selectedCategory, providedEvents]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      let eventsQuery = collection(db, 'events');
      let constraints = [];
      
      if (selectedCategory) {
        constraints.push(where('category', '==', selectedCategory));
      }
      
      constraints.push(orderBy('date', 'asc'));
      constraints.push(limit(maxEvents));
      
      const eventsSnapshot = await getDocs(query(eventsQuery, ...constraints));
      
      const eventsData = [];
      for (const docSnap of eventsSnapshot.docs) {
        const eventData = { id: docSnap.id, ...docSnap.data() };
        
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

  // Virheilmoitukset ja lataustilojen käsittely
  if (loading && !providedEvents) return <div className="events-loading">Loading events...</div>;
  if (error) return <div className="events-error">{error}</div>;
  if (events.length === 0) return <div className="events-empty">No events found</div>;

  // Valitaan CSS-luokkanimi layoutin perusteella
  const eventListClassName = `event-list ${layout === "list" ? "scrollable" : ""}`;

  return (
    <div className="events-container">
      {showCategory && !providedEvents && (
        <div className="events-filter">
          <CategorySelector 
            selectedCategory={selectedCategory} 
            onChange={handleCategoryChange} 
          />
        </div>
      )}
      
      {/* Vieritettävä tapahtumalistaus */}
      <div className="events-list-container">
        {/* Tässä on varsinainen tapahtumalista */}
        <div className={eventListClassName}>
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onJoin={onJoin}
              onOpenDetails={onOpenDetails}
              onInvite={onInvite}
              onLeave={onLeave}
              showJoinButton={showJoinButton}
              // Lisätään CSS-luokka highlightattua tapahtumaa varten
              className={event.isHighlighted ? 'highlighted' : ''}
              // Välitetään layout myös EventCard-komponentille jos tarvitaan
              layout={layout}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventList;