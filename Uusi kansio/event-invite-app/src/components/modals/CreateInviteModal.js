import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase/config';
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDocs } from 'firebase/firestore';
import { formatForDateTimeInput, formatDate } from '../../utils/DateUtils';
import './styles/Modals.css';

const CreateInviteModal = ({ isOpen, onClose, onSuccess, onDelete, existingInvite = null, isEditMode = false }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [availabilityHours, setAvailabilityHours] = useState('24');
  const [errorMessage, setErrorMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Lisätään kategorioihin liittyvät tilamuuttujat
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  
  // Alusta lomake, kun modaali avataan
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && existingInvite) {
        // Muokkaustila - täytä lomake olemassa olevan kutsun tiedoilla
        setTitle(existingInvite.title || '');
        setDescription(existingInvite.description || '');
        setSelectedCategory(existingInvite.category || '');
        setDate(existingInvite.date ? 
          (existingInvite.date.toDate ? existingInvite.date.toDate() : new Date(existingInvite.date)) 
          : new Date());
        setLocation(existingInvite.location || '');
        setMessage(existingInvite.message || '');
        setAvailabilityHours(existingInvite.availabilityHours || '24');
        
        // Tarkista onko kutsu jo hyväksytty
        if (existingInvite.status === 'accepted') {
          setReadOnly(true);
          setErrorMessage('Kutsua ei voi enää muokata, koska se on jo hyväksytty.');
        } else {
          setReadOnly(false);
          setErrorMessage(null);
        }
      } else {
        // Uusi kutsu - tyhjennä lomake
        resetForm();
      }
      
      // Varmista, että poiston vahvistusikkuna on suljettu
      setShowDeleteConfirm(false);
      
      // Lataa kategoriat
      fetchCategories();
    }
  }, [isOpen, isEditMode, existingInvite]);
  
  // Hae kategoriat Firestore-tietokannasta
  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableCategories(categoriesData);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setErrorMessage("Kategorioiden lataaminen epäonnistui");
    } finally {
      setCategoryLoading(false);
    }
  };
  
  // Tyhjennä lomake
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedCategory('');
    setDate(new Date());
    setLocation('');
    setMessage('');
    setAvailabilityHours('24');
    setErrorMessage(null);
    setReadOnly(false);
    setShowDeleteConfirm(false);
  };
  
  // Poista kutsu
  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    
    if (onDelete && existingInvite) {
      onDelete(existingInvite.id, existingInvite.type);
    }
  };
  
  // Peruuta poisto
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };
  
  // Lomakkeen lähetys
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    
    try {
      // Jos kyseessä on muokkaus, tarkista onko kutsu jo hyväksytty
      if (isEditMode && existingInvite) {
        const inviteRef = doc(db, existingInvite.type === 'personal' ? 'invites' : 'openInvitations', existingInvite.id);
        const inviteSnap = await getDoc(inviteRef);
        
        if (inviteSnap.exists()) {
          const currentInviteData = inviteSnap.data();
          
          if (currentInviteData.status === 'accepted') {
            setErrorMessage('Kutsua ei voi enää muokata, koska se on jo hyväksytty.');
            setSubmitting(false);
            return;
          }
        }
      }
      
      // Validate form
      if (!title.trim()) {
        setErrorMessage('Kutsun otsikko on pakollinen.');
        setSubmitting(false);
        return;
      }
      
      if (!selectedCategory) {
        setErrorMessage('Valitse kategoria.');
        setSubmitting(false);
        return;
      }
      
      const inviteData = {
        title: title.trim(),
        description: description.trim(),
        category: selectedCategory,
        date: Timestamp.fromDate(date),
        location: location.trim(),
        message: message.trim(),
        availabilityHours: parseInt(availabilityHours) || 24,
        updatedAt: serverTimestamp()
      };
      
      if (isEditMode && existingInvite) {
        // Päivitä olemassa oleva kutsu
        const inviteRef = doc(db, existingInvite.type === 'personal' ? 'invites' : 'openInvitations', existingInvite.id);
        await updateDoc(inviteRef, inviteData);
      } else {
        // Luo uusi kutsu
        inviteData.createdBy = currentUser.uid;
        inviteData.creatorName = currentUser.displayName || currentUser.email;
        inviteData.createdAt = serverTimestamp();
        inviteData.isActive = true;
        inviteData.status = 'pending';
        
        await addDoc(collection(db, 'openInvitations'), inviteData);
      }
      
      // Sulje lomake ja ilmoita onnistumisesta
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error submitting invitation:', err);
      setErrorMessage(`Failed to ${isEditMode ? 'update' : 'create'} invitation: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEditMode ? 'Muokkaa kutsua' : 'Luo uusi kutsu'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}
          
          <div className="form-group">
            <label>Otsikko</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Anna kutsulle otsikko"
              disabled={readOnly}
              required
            />
          </div>
          
          {/* Kategoriavalikko kuvauskentän tilalle */}
          <div className="form-group">
            <label>Kategoria</label>
            {categoryLoading ? (
              <p className="loading-text">Ladataan kategorioita...</p>
            ) : (
              <div className="category-selector">
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={readOnly}
                  required
                >
                  <option value="">Valitse kategoria</option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {/* Lisätään valinnainen kuvauskenttä */}
          <div className="form-group">
            <label>Lisätiedot</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kirjoita lisätietoja tapahtumasta"
              disabled={readOnly}
              rows={3}
            />
          </div>
          
          <div className="form-group">
            <label>Voimassaolo:</label>
            <input
              type="text"
              value={availabilityHours}
              onChange={(e) => setAvailabilityHours(e.target.value)}
              placeholder="tunteja"
              disabled={readOnly}
            />
            <small>Kutsun voimassaoloaika tunneissa alkuperäisestä luontihetkestä</small>
          </div>
          
          <div className="form-group">
            <label>Sijainti</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Kouvola"
              disabled={readOnly}
            />
          </div>
          
          <div className="form-group">
            <label>Päivämäärä ja aika</label>
            <input
              type="datetime-local"
              value={formatForDateTimeInput(date)}
              onChange={(e) => setDate(new Date(e.target.value))}
              disabled={readOnly}
            />
            <small className="form-info">
              {formatDate(date, { includeTime: true })}
            </small>
          </div>
          
          <div className="form-group">
            <label>Viesti osallistujille</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Kirjoita viesti mahdollisille osallistujille"
              disabled={readOnly}
              rows={4}
            />
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Peruuta
            </button>
            
            {isEditMode && !readOnly && (
              <button 
                type="button" 
                className={`btn-danger ${showDeleteConfirm ? 'btn-confirm-delete' : ''}`}
                onClick={handleDelete}
              >
                {showDeleteConfirm ? 'Vahvista poisto' : 'Poista kutsu'}
              </button>
            )}
            
            {showDeleteConfirm && (
              <button type="button" className="btn-secondary" onClick={cancelDelete}>
                Peruuta poisto
              </button>
            )}
            
            {!readOnly && !showDeleteConfirm && (
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Tallennetaan...' : isEditMode ? 'Päivitä kutsu' : 'Lähetä kutsu'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInviteModal;