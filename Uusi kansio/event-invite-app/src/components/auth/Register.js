import React, { useState, useEffect, useMemo } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { setDoc, doc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase/config';
import { useNavigate } from 'react-router-dom';
import './styles/Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    location: ''
  });
  
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState('idle'); // 'idle', 'auth-success', 'profile-updated', 'firestore-success'
  const [registrationLog, setRegistrationLog] = useState([]);
  
  const navigate = useNavigate();

  // Lokifunktio rekisteröintiprosessin seurantaa varten
  const logRegistration = (stage, message) => {
    console.log(`Registration ${stage}: ${message}`);
    setRegistrationLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${stage} - ${message}`]);
    setRegistrationStatus(stage);
  };

  // Lataa kategoriat Firestore-tietokannasta
  useEffect(() => {
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
        setError("Kategorioiden lataaminen epäonnistui");
      } finally {
        setCategoryLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Ohjaa käyttäjä profiilisivulle kun rekisteröinti onnistuu
  useEffect(() => {
    if (success && registrationStatus === 'firestore-success') {
      const timer = setTimeout(() => {
        navigate('/');
      }, 800); // Pieni viive ennen navigointia
      
      return () => clearTimeout(timer);
    }
  }, [success, registrationStatus, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Nollaa virhe kun käyttäjä muuttaa kenttien arvoja
    if (error) setError(null);
  };

  const handleCategoryToggle = (categoryName) => {
    setSelectedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
    
    // Nollaa virhe kategorian valinnan yhteydessä
    if (error === "Valitse vähintään yksi kiinnostuksen kohde") {
      setError(null);
    }
  };

  // Tarkastaa lomakkeen ilman virhetilojen asettamista
  const isFormValid = () => {
    if (!formData.email.trim()) return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return false;
    
    if (formData.password !== formData.confirmPassword) return false;
    
    if (formData.password.length < 6) return false;
    
    if (selectedCategories.length === 0) return false;
    
    return true;
  };

  // Varsinainen validointifunktio joka asettaa virheilmoitukset
  const validateForm = (setErrorState = true) => {
    // Resetoidaan virheet vain jos tarvitaan
    if (setErrorState) setError(null);
    
    // Tarkistetaan että sähköposti on annettu
    if (!formData.email.trim()) {
      if (setErrorState) setError("Sähköpostiosoite on pakollinen");
      return false;
    }
    
    // Tarkistetaan sähköpostin muoto
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      if (setErrorState) setError("Virheellinen sähköpostiosoite");
      return false;
    }
    
    // Tarkistetaan että salasana ja vahvistus täsmäävät
    if (formData.password !== formData.confirmPassword) {
      if (setErrorState) setError("Salasanat eivät täsmää");
      return false;
    }
    
    // Tarkistetaan salasanan vahvuus (vähintään 6 merkkiä)
    if (formData.password.length < 6) {
      if (setErrorState) setError("Salasanan tulee olla vähintään 6 merkkiä pitkä");
      return false;
    }
    
    // Tarkistetaan että vähintään yksi kategoria on valittu
    if (selectedCategories.length === 0) {
      if (setErrorState) setError("Valitse vähintään yksi kiinnostuksen kohde");
      return false;
    }
    
    return true;
  };

  // Memoized validointitilaviesti renderöintiä varten
  const validationStatus = useMemo(() => {
    return isFormValid() ? 'Lomake kunnossa' : 'Lomakkeessa virheitä';
  }, [formData.email, formData.password, formData.confirmPassword, selectedCategories]);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Nollaa aiemmat tilat
    setError(null);
    setSuccess(false);
    setRegistrationLog([]);
    setRegistrationStatus('idle');
    
    // Validoi lomake ennen lähetystä
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    logRegistration('start', 'Aloitetaan rekisteröintiprosessi');
    
    try {
      logRegistration('auth-attempt', 'Luodaan käyttäjätili Firebase Authenticationiin');
      
      // Luo käyttäjä Firebase Authenticationilla
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      logRegistration('auth-success', 'Käyttäjätili luotu onnistuneesti');
      
      try {
        // Aseta käyttäjänimi jos annettu
        if (formData.displayName) {
          logRegistration('profile-update', 'Päivitetään käyttäjäprofiilia');
          
          await updateProfile(userCredential.user, {
            displayName: formData.displayName
          });
          
          logRegistration('profile-updated', 'Käyttäjäprofiili päivitetty');
        }
        
        logRegistration('firestore-attempt', 'Tallennetaan käyttäjätiedot tietokantaan');
        
        // Tallenna käyttäjän tiedot Firestoreen
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: formData.email,
          displayName: formData.displayName || '',
          location: formData.location || '',
          preferredCategories: selectedCategories,
          interestedCategories: selectedCategories,
          categoryPreferences: selectedCategories,
          createdAt: serverTimestamp() // Käytä serverTimestamp Date-olion sijaan
        });
        
        logRegistration('firestore-success', 'Käyttäjätiedot tallennettu onnistuneesti');
        
        // Merkitse rekisteröityminen onnistuneeksi
        setSuccess(true);
        setError(null);
        
      } catch (profileError) {
        logRegistration('error', `Profiilitietojen päivitys epäonnistui: ${profileError.message}`);
        console.error("Profile/Firestore error:", profileError);
        setError("Tiliä ei voitu viimeistellä. Kokeile kirjautua sisään ja päivittää tietosi myöhemmin.");
      }
      
    } catch (authError) {
      // Käsitellään yleisimmät virheet käyttäjäystävällisesti
      let errorMessage = "Rekisteröityminen epäonnistui";
      
      logRegistration('auth-error', `Autentikointi epäonnistui: ${authError.code}`);
      
      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = "Sähköpostiosoite on jo käytössä";
      } else if (authError.code === 'auth/invalid-email') {
        errorMessage = "Virheellinen sähköpostiosoite";
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = "Salasana on liian heikko";
      } else if (authError.code === 'auth/network-request-failed') {
        errorMessage = "Verkkovirhe. Tarkista internetyhteytesi.";
      }
      
      setError(errorMessage);
      console.error("Authentication error:", authError);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Rekisteröidy</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Rekisteröityminen onnistui! Ohjataan profiilisivulle...</div>}
        
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="email">Sähköposti *</label>
            <input 
              id="email"
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange} 
              required 
              placeholder="example@mail.com"
              disabled={loading || success}
              className={error && error.includes("sähköposti") ? "input-error" : ""}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="displayName">Nimi</label>
            <input 
              id="displayName"
              type="text" 
              name="displayName" 
              value={formData.displayName} 
              onChange={handleChange} 
              placeholder="Näytettävä nimesi"
              disabled={loading || success}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="location">Sijainti</label>
            <input 
              id="location"
              type="text" 
              name="location" 
              value={formData.location} 
              onChange={handleChange} 
              placeholder="Esim. Helsinki"
              disabled={loading || success}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Salasana *</label>
              <input 
                id="password"
                type="password" 
                name="password"
                value={formData.password} 
                onChange={handleChange} 
                required
                minLength="6"
                disabled={loading || success}
                className={error && error.includes("salasana") ? "input-error" : ""}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Vahvista salasana *</label>
              <input 
                id="confirmPassword"
                type="password" 
                name="confirmPassword"
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required
                minLength="6"
                disabled={loading || success}
                className={error && error.includes("täsmää") ? "input-error" : ""}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Valitse kiinnostuksen kohteet *</label>
            <p className="helper-text">Valitse kategoriat, joiden tapahtumat kiinnostavat sinua</p>
            
            {categoryLoading ? (
              <div className="loading-categories">Ladataan kategorioita...</div>
            ) : (
              <div className={`categories-grid ${error && error.includes("kiinnostuksen") ? "categories-error" : ""}`}>
                {availableCategories.length > 0 ? (
                  availableCategories.map(category => (
                    <div 
                      key={category.id} 
                      className={`category-item ${selectedCategories.includes(category.name) ? 'selected' : ''}`}
                      onClick={() => !loading && !success && handleCategoryToggle(category.name)}
                    >
                      {category.icon && <span className="category-icon">{category.icon}</span>}
                      <span className="category-name">{category.name}</span>
                      {selectedCategories.includes(category.name) && (
                        <span className="category-check">✓</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p>Ei kategorioita saatavilla</p>
                )}
              </div>
            )}
            
            <div className="selected-categories">
              <p>Valitut kategoriat: {selectedCategories.length > 0 ? 
                selectedCategories.join(', ') : 
                'Ei valintoja'}
              </p>
            </div>
          </div>
          
          <button 
            type="submit" 
            className={`auth-button ${success ? 'success-button' : ''}`}
            disabled={loading || success}
          >
            {loading ? 'Rekisteröidään...' : success ? 'Rekisteröityminen onnistui!' : 'Rekisteröidy'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Onko sinulla jo tili? <a href="/login">Kirjaudu sisään</a></p>
        </div>

        {/* Debug-osio näkyy vain kehitystilassa */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="debug-section">
            <details>
              <summary>Debug Info</summary>
              <div className="debug-info">
                <p><strong>Rekisteröinnin tila:</strong> {registrationStatus}</p>
                <p><strong>Lomakkeen validointi:</strong> {validationStatus}</p>
                
                <h4>Rekisteröintiloki:</h4>
                <ul className="registration-log">
                  {registrationLog.map((entry, index) => (
                    <li key={index}>{entry}</li>
                  ))}
                </ul>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;