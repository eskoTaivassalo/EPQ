import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../services/firebase/config';
// POISTETTU PageContainer import, koska se tulee App.js:stä
import MyEvents from '../../events/myevents/MyEvents';
import MyInvites from '../../invitations/myinvites/MyInvites';
import Favorites from '../../favorites/Favorites';
import ProfileSettings from '../profilesettings/ProfileSettings';
import './Profile.css';

const Profile = () => {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: ''
  });
  const [activeTab, setActiveTab] = useState('events');
  const [stats, setStats] = useState({
    eventsCreated: 0,
    eventsAttended: 0,
    followers: 0
  });

  useEffect(() => {
    if (currentUser) {
      fetchProfileData();
      fetchUserStats();
    }
  }, [currentUser]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfileData({
          id: userDoc.id,
          ...userData
        });
        
        // Init form data
        setFormData({
          displayName: userData.displayName || '',
          bio: userData.bio || '',
          location: userData.location || ''
        });
      } else {
        // Create new profile if it doesn't exist
        const newProfileData = {
          displayName: currentUser.displayName || currentUser.email.split('@')[0],
          email: currentUser.email,
          photoURL: currentUser.photoURL || '',
          bio: '',
          location: '',
          createdAt: new Date()
        };
        
        await updateDoc(userDocRef, newProfileData);
        setProfileData(newProfileData);
        setFormData({
          displayName: newProfileData.displayName,
          bio: '',
          location: ''
        });
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // You would implement the logic to fetch user stats here
      // For now, we'll use default values
      setStats({
        eventsCreated: 0,
        eventsAttended: 0,
        followers: 0
      });
    } catch (err) {
      console.error("Error fetching user stats:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, formData);
      
      setProfileData(prev => ({
        ...prev,
        ...formData
      }));
      
      setEditMode(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profile_images/${currentUser.uid}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        photoURL: downloadURL
      });
      
      setProfileData(prev => ({
        ...prev,
        photoURL: downloadURL
      }));
    } catch (err) {
      console.error("Error uploading profile image:", err);
      setError("Failed to upload profile image");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'events':
        return <MyEvents />;
      case 'invites':
        return <MyInvites />;
      case 'favorites':
        return <Favorites />;
      case 'settings':
        return <ProfileSettings />;
      default:
        return <MyEvents />;
    }
  };

  // MUUTETTU: Poistettu PageContainer sisäkkäisyyden poistamiseksi
  if (loading) return <div className="loading-container">Loading profile...</div>;

  if (error) return (
    <div className="error-container">
      <p>{error}</p>
      <button onClick={fetchProfileData}>Try Again</button>
    </div>
  );

  return (
    // MUUTETTU: Poistettu PageContainer sisäkkäisyyden poistamiseksi
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-image-container">
          <img 
            src={profileData?.photoURL || '/default-avatar.png'} 
            alt="Profile" 
            className="profile-image"
          />
          {!editMode && (
            <label className="profile-image-upload-btn">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleProfileImageUpload} 
                style={{ display: 'none' }}
              />
              <span>Change Photo</span>
            </label>
          )}
        </div>

        <div className="profile-info">
          {editMode ? (
            <form onSubmit={handleProfileUpdate} className="profile-edit-form">
              <div className="form-group">
                <label htmlFor="displayName">Name</label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Tell us about yourself"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, Country"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setEditMode(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="profile-name">{profileData?.displayName}</h1>
              
              {profileData?.bio && (
                <p className="profile-bio">{profileData.bio}</p>
              )}
              
              {profileData?.location && (
                <p className="profile-location">
                  <i className="icon-location"></i>
                  {profileData.location}
                </p>
              )}

              <button 
                className="btn-outline edit-profile-btn" 
                onClick={() => setEditMode(true)}
              >
                Edit Profile
              </button>
            </>
          )}
        </div>
        
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.eventsCreated}</span>
            <span className="stat-label">Events Created</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.eventsAttended}</span>
            <span className="stat-label">Events Attended</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.followers}</span>
            <span className="stat-label">Followers</span>
          </div>
        </div>
      </div>
      
      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          My Events
        </button>
        <button 
          className={`tab-button ${activeTab === 'invites' ? 'active' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          My Invites
        </button>
        <button 
          className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
      
      <div className="profile-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Profile;