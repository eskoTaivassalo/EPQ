import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../../../services/firebase/config';
import { useAuth } from '../../../context/AuthContext';
import './ProfileSettings.css';

const ProfileSettings = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: false,
    pushNotifications: false,
    publicProfile: false,
    showLocation: false
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [emailData, setEmailData] = useState({
    newEmail: currentUser?.email || '',
    password: ''
  });
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [activeSection, setActiveSection] = useState('general'); // 'general', 'password', 'email'

  useEffect(() => {
    fetchSettings();
  }, [currentUser]);

  const fetchSettings = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingSettings(true);
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      const settingsDoc = await getDoc(userSettingsRef);
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
      } else {
        // Create default settings
        const defaultSettings = {
          emailNotifications: true,
          pushNotifications: true,
          publicProfile: false,
          showLocation: false,
          createdAt: new Date()
        };
        
        await updateDoc(userSettingsRef, defaultSettings);
        setSettings(defaultSettings);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      setFeedbackMessage({
        type: 'error',
        message: 'Failed to load settings'
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSettingToggle = async (setting) => {
    try {
      const newSettings = {
        ...settings,
        [setting]: !settings[setting]
      };
      
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      await updateDoc(userSettingsRef, {
        [setting]: newSettings[setting]
      });
      
      setSettings(newSettings);
      
      setFeedbackMessage({
        type: 'success',
        message: 'Settings updated successfully'
      });
      
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error updating settings:", err);
      setFeedbackMessage({
        type: 'error',
        message: 'Failed to update settings'
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setFeedbackMessage({
        type: 'error',
        message: 'Passwords do not match'
      });
      return;
    }
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwordData.newPassword);
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setFeedbackMessage({
        type: 'success',
        message: 'Password updated successfully'
      });
      
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error updating password:", err);
      setFeedbackMessage({
        type: 'error',
        message: err.message || 'Failed to update password'
      });
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        emailData.password
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      await updateEmail(currentUser, emailData.newEmail);
      
      setEmailData({
        newEmail: emailData.newEmail,
        password: ''
      });
      
      setFeedbackMessage({
        type: 'success',
        message: 'Email updated successfully'
      });
      
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Error updating email:", err);
      setFeedbackMessage({
        type: 'error',
        message: err.message || 'Failed to update email'
      });
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="settings-container">
      <h2 className="settings-title">Account Settings</h2>
      
      {feedbackMessage && (
        <div className={`feedback-message ${feedbackMessage.type}`}>
          {feedbackMessage.message}
        </div>
      )}
      
      <div className="settings-navigation">
        <button 
          className={`settings-nav-btn ${activeSection === 'general' ? 'active' : ''}`}
          onClick={() => setActiveSection('general')}
        >
          General
        </button>
        <button 
          className={`settings-nav-btn ${activeSection === 'password' ? 'active' : ''}`}
          onClick={() => setActiveSection('password')}
        >
          Change Password
        </button>
        <button 
          className={`settings-nav-btn ${activeSection === 'email' ? 'active' : ''}`}
          onClick={() => setActiveSection('email')}
        >
          Change Email
        </button>
      </div>
      
      {activeSection === 'general' && (
        <div className="settings-section">
          <div className="settings-group">
            <h3 className="settings-group-title">Notification Preferences</h3>
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-name">Email Notifications</p>
                <p className="setting-description">Receive email notifications about events and invitations</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.emailNotifications} 
                  onChange={() => handleSettingToggle('emailNotifications')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-name">Push Notifications</p>
                <p className="setting-description">Receive push notifications on your device</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.pushNotifications} 
                  onChange={() => handleSettingToggle('pushNotifications')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <div className="settings-group">
            <h3 className="settings-group-title">Privacy Settings</h3>
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-name">Public Profile</p>
                <p className="setting-description">Allow others to see your profile information</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.publicProfile} 
                  onChange={() => handleSettingToggle('publicProfile')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <p className="setting-name">Show Location</p>
                <p className="setting-description">Show your location to other users</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={settings.showLocation} 
                  onChange={() => handleSettingToggle('showLocation')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      )}
      
      {activeSection === 'password' && (
        <div className="settings-section">
          <h3 className="settings-group-title">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="settings-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input 
                type="password" 
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input 
                type="password" 
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordInputChange}
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordInputChange}
                required
              />
            </div>
            
            <button type="submit" className="btn-primary">Update Password</button>
          </form>
        </div>
      )}
      
      {activeSection === 'email' && (
        <div className="settings-section">
          <h3 className="settings-group-title">Change Email Address</h3>
          <form onSubmit={handleEmailChange} className="settings-form">
            <div className="form-group">
              <label htmlFor="newEmail">New Email Address</label>
              <input 
                type="email" 
                id="newEmail"
                name="newEmail"
                value={emailData.newEmail}
                onChange={handleEmailInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="emailPassword">Current Password</label>
              <input 
                type="password" 
                id="emailPassword"
                name="password"
                value={emailData.password}
                onChange={handleEmailInputChange}
                required
              />
            </div>
            
            <button type="submit" className="btn-primary">Update Email</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;