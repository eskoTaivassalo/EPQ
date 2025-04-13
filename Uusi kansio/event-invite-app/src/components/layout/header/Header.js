import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../../firebase/config';
import './Header.css'; // Import the CSS file for styling
const Header = () => {
  const { currentUser } = useAuth();

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
        <Link to="/" className="logo">
          Region of
        </Link>
        
        <nav className="main-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/events" className="nav-link">Events</Link>
          {currentUser && (
            <>
              <Link to="/invites" className="nav-link">Invites</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
            </>
          )}
        </nav>
        
        <div className="auth-buttons">
          {currentUser ? (
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn btn-login">Login</Link>
              <Link to="/register" className="btn btn-register">Register</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;