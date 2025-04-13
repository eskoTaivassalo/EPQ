import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import './styles/Modals.css';

const CreateEventModal = ({ isOpen, onClose }) => {
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    category: '',
    date: '',
    location: '',
    maxParticipants: 10
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // New state for invitation options
  const [sendInviteToAll, setSendInviteToAll] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [isSpecificCategory, setIsSpecificCategory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      setCategories(categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCategoryFilterToggle = (categoryId) => {
    setCategoryFilters(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("You must be logged in to create an event");
      }
      
      const eventToSave = {
        ...eventData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        participants: [user.uid],
        status: 'active'
      };
      
      // Save the event
      const eventDocRef = await addDoc(collection(db, 'events'), eventToSave);
      
      // Handle invitations if needed
      if (sendInviteToAll) {
        await createInvitationsForAll(eventDocRef.id, eventData.title);
      }
      
      setLoading(false);
      onClose();
      
      // Reset form
      setEventData({
        title: '',
        description: '',
        category: '',
        date: '',
        location: '',
        maxParticipants: 10
      });
      setSendInviteToAll(false);
      setCategoryFilters([]);
      setIsSpecificCategory(false);
    } catch (err) {
      console.error("Error creating event:", err);
      setError(err.message);
      setLoading(false);
    }
  };
  
  // Function to create invitations for all users
  const createInvitationsForAll = async (eventId, eventTitle) => {
    try {
      // Get all users based on optional category filters
      let usersQuery;
      
      if (isSpecificCategory && categoryFilters.length > 0) {
        // Get users who have preferences for these specific categories
        usersQuery = query(
          collection(db, 'users'),
          where('preferredCategories', 'array-contains-any', categoryFilters)
        );
      } else {
        // Get all users
        usersQuery = collection(db, 'users');
      }
      
      const usersSnapshot = await getDocs(usersQuery);
      const currentUserId = auth.currentUser.uid;
      
      // Create invitation for each user (except current user who is already a participant)
      const invitationPromises = usersSnapshot.docs
        .filter(doc => doc.id !== currentUserId)
        .map(userDoc => {
          return addDoc(collection(db, 'invitations'), {
            eventId,
            eventTitle,
            recipientId: userDoc.id,
            senderId: currentUserId,
            status: 'pending',
            createdAt: serverTimestamp(),
            categoryFilters: isSpecificCategory ? categoryFilters : []
          });
        });
      
      await Promise.all(invitationPromises);
    } catch (err) {
      console.error("Error sending invitations:", err);
      throw new Error("Event was created but there was an error sending invitations");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Event</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input 
              type="text" 
              name="title"
              value={eventData.title}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description"
              value={eventData.description}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Category</label>
            <select 
              name="category"
              value={eventData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Date</label>
            <input 
              type="datetime-local" 
              name="date"
              value={eventData.date}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Location</label>
            <input 
              type="text" 
              name="location"
              value={eventData.location}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Max Participants</label>
            <input 
              type="number" 
              name="maxParticipants"
              min="1"
              value={eventData.maxParticipants}
              onChange={handleChange}
              required
            />
          </div>
          
          {/* New invitation options */}
          <div className="form-group invitation-options">
            <div className="checkbox-group">
              <input 
                type="checkbox" 
                id="send-invite-all"
                checked={sendInviteToAll}
                onChange={() => setSendInviteToAll(!sendInviteToAll)}
              />
              <label htmlFor="send-invite-all">Send invitation to everyone</label>
            </div>
            
            {sendInviteToAll && (
              <div className="category-filter-section">
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="category-specific"
                    checked={isSpecificCategory}
                    onChange={() => setIsSpecificCategory(!isSpecificCategory)}
                  />
                  <label htmlFor="category-specific">Filter by specific categories</label>
                </div>
                
                {isSpecificCategory && (
                  <div className="category-checkboxes">
                    <p>Send invitations only to people interested in:</p>
                    {categories.map(category => (
                      <div className="checkbox-group" key={`filter-${category.id}`}>
                        <input 
                          type="checkbox" 
                          id={`category-${category.id}`}
                          checked={categoryFilters.includes(category.id)}
                          onChange={() => handleCategoryFilterToggle(category.id)}
                        />
                        <label htmlFor={`category-${category.id}`}>{category.name}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose} 
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;