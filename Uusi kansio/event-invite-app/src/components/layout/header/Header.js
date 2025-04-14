import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../../services/firebase/config';
import { getUserLocation } from '../../../services/location/LocationService';
import './Header.css';

const Header = () => {
  const { currentUser } = useAuth();
  const [location, setLocation] = useState({
    city: 'Haetaan sijaintia...',
    loading: true,
    error: null
  });

  // Haetaan sijainti kun komponentti latautuu
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const userLocation = await getUserLocation();
        setLocation(userLocation);
      } catch (error) {
        setLocation({
          city: 'Sijainti ei saatavilla',
          loading: false,
          error: error.message
        });
      }
    };

    fetchLocation();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-container">
          <Link to="/" className="logo">
            Region of {!location.loading && !location.error && (
              <span className="location-name">{location.city}</span>
            )}
          </Link>
          {location.loading && (
            <span className="location-loading">Haetaan sijaintia...</span>
          )}
          {location.error && (
            <span className="location-error" title={location.error}>Sijainti ei saatavilla</span>
          )}
        </div>
        
        <nav className="main-nav">
          <Link to="/" className="nav-link">Pääsivu</Link>
          <Link to="/events" className="nav-link">Tapahtumat</Link>
          {currentUser && (
            <>
              <Link to="/invites" className="nav-link">Kutsut</Link>
              <Link to="/profile" className="nav-link">Profiili</Link>
            </>
          )}
        </nav>
        
        <div className="auth-buttons">
          {currentUser ? (
            <button onClick={handleLogout} className="logout-button">
              Kirjaudu ulos
            </button>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn btn-login">Login</Link>
              <Link to="/register" className="btn btn-register">Luo ilmainen tili</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;