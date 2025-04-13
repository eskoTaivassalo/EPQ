import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css'; // Import the CSS file for styling

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>EventConnect</h3>
          <p>Connect with friends and share events together.</p>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/events">Events</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Contact</h3>
          <p>Email: support@eventconnect.example</p>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">FB</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">TW</a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">IG</a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {year} EventConnect. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;