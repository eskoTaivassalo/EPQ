import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import './Navbar.css'; // Import the CSS file for styling

const Navbar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    if (dropdownOpen) setDropdownOpen(false);
  };

  const toggleDropdown = (e) => {
    e.preventDefault();
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          EventConnect
        </Link>

        <div className="menu-icon" onClick={toggleMenu}>
          <i className={menuOpen ? 'fas fa-times' : 'fas fa-bars'} />
        </div>

        <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
          <li className="nav-item">
            <Link to="/" className="nav-link">
              Home
            </Link>
          </li>

          <li className="nav-item">
            <Link to="/events" className="nav-link">
              Events
            </Link>
          </li>

          {currentUser ? (
            <>
              <li className="nav-item">
                <Link to="/invites" className="nav-link">
                  Invites
                </Link>
              </li>

              <li className="nav-item dropdown">
                <a href="#" className="nav-link" onClick={toggleDropdown}>
                  <img 
                    src={currentUser.photoURL || '/default-avatar.png'} 
                    alt="Profile" 
                    className="profile-avatar"
                  />
                  <span className="profile-name">{currentUser.displayName || 'User'}</span>
                </a>
                <ul className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`}>
                  <li>
                    <Link to="/profile" className="dropdown-item">
                      My Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/my-events" className="dropdown-item">
                      My Events
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout} className="dropdown-item logout-button">
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="nav-link signup">
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;