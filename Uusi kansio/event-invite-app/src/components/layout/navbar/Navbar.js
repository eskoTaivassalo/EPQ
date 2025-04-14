import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getUserLocation } from '../../../services/LocationService';
import './NavBar.css';

const NavBar = () => {
  const { currentUser, logout } = useAuth();
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
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            EventApp
          </Link>
          {/* Näytetään sijainti logon vieressä */}
          <span className="navbar-location">
            <i className="fas fa-map-marker-alt"></i> {/* FontAwesome ikoni, lisää tarvittaessa */}
            {location.loading ? (
              <span className="loading-indicator">Haetaan sijaintia...</span>
            ) : location.error ? (
              <span className="location-error" title={location.error}>
                <i className="fas fa-exclamation-circle"></i> Sijainti ei saatavilla
              </span>
            ) : (
              <span className="location-name" title={`Sijaintisi: ${location.city}`}>
                {location.city}
              </span>
            )}
          </span>
        </div>

        <div className="navbar-menu">
          <Link to="/" className="navbar-item">Etusivu</Link>
          <Link to="/events" className="navbar-item">Tapahtumat</Link>
          <Link to="/invitations" className="navbar-item">Kutsut</Link>
          
          {currentUser ? (
            <div className="navbar-auth">
              <Link to="/profile" className="navbar-item">Profiili</Link>
              <button onClick={handleLogout} className="logout-button">
                Kirjaudu ulos
              </button>
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="navbar-item">Kirjaudu</Link>
              <Link to="/signup" className="signup-button">Rekisteröidy</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;