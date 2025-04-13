import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import '../styles/Profile.css'; // Assuming you have a CSS file for styling

const ProfileContent = () => {
  const { currentUser } = useAuth();
  const { formatLocation } = useLocation();
  const [profileData, setProfileData] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [userInvites, setUserInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        // Fetch user profile data
        const profileDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (profileDoc.exists()) {
          setProfileData(profileDoc.data());
        }
        
        // Fetch user's events
        const eventsQuery = query(
          collection(db, 'events'),
          where('createdBy', '==', currentUser.uid)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        setUserEvents(eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));

        // Fetch user's invites
        const invitesQuery = query(
          collection(db, 'invites'),
          where('userId', '==', currentUser.uid)
        );
        const invitesSnapshot = await getDocs(invitesQuery);
        setUserInvites(invitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [currentUser]);

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (!profileData && !loading) {
    return <div className="profile-error">Could not load profile data</div>;
  }

  return (
    <div className="profile-content">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-container">
          <img 
            src={profileData?.photoURL || '/default-avatar.png'} 
            alt={profileData?.displayName || 'User'} 
            className="profile-avatar" 
          />
          <button className="avatar-edit-button">
            <i className="fas fa-camera"></i>
          </button>
        </div>
        
        <div className="profile-info">
          <h1 className="profile-name">
            {profileData?.displayName || currentUser?.email || 'User'}
          </h1>
          
          {profileData?.username && (
            <div className="profile-username">@{profileData.username}</div>
          )}
          
          {profileData?.bio && (
            <p className="profile-bio">{profileData.bio}</p>
          )}
          
          {profileData?.location && (
            <div className="profile-location">
              <i className="fas fa-map-marker-alt"></i> 
              {formatLocation(profileData.location)}
            </div>
          )}
          
          <div className="profile-actions">
            <Link to="/profile/edit" className="btn btn-primary">Edit Profile</Link>
            <Link to="/settings" className="btn btn-secondary">Settings</Link>
          </div>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-value">{userEvents.length}</div>
          <div className="stat-label">Events Created</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{userInvites.filter(invite => invite.status === 'accepted').length}</div>
          <div className="stat-label">Events Attended</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{profileData?.followers?.length || 0}</div>
          <div className="stat-label">Followers</div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="profile-tabs">
        <div className="tabs-container">
          <div 
            className={`profile-tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            My Events
          </div>
          <div 
            className={`profile-tab ${activeTab === 'invites' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            My Invites
          </div>
          <div 
            className={`profile-tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </div>
          <div 
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="profile-tab-content">
        {activeTab === 'events' && (
          <div className="profile-section">
            <div className="section-title">
              Events Created
              <Link to="/create-event" className="btn btn-sm btn-primary">Create New Event</Link>
            </div>

            {userEvents.length > 0 ? (
              <div className="activity-list">
                {userEvents.map(event => (
                  <div key={event.id} className="activity-card">
                    <div className="event-image">
                      <img src={event.imageURL || '/default-event.jpg'} alt={event.title} />
                    </div>
                    <div className="event-details">
                      <h3 className="event-title">
                        <Link to={`/event/${event.id}`}>{event.title}</Link>
                      </h3>
                      <div className="event-date">
                        <i className="far fa-calendar"></i> 
                        {new Date(event.date?.toDate()).toLocaleDateString()}
                      </div>
                      <div className="event-location">
                        <i className="fas fa-map-marker-alt"></i> 
                        {formatLocation(event.location)}
                      </div>
                      <div className="event-attendees">
                        <i className="fas fa-users"></i> 
                        {event.attendees?.length || 0} attendees
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <i className="far fa-calendar-plus"></i>
                </div>
                <div className="empty-state-message">
                  You haven't created any events yet
                </div>
                <Link to="/create-event" className="btn btn-primary">Create Your First Event</Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="profile-section">
            <div className="section-title">My Invites</div>

            {userInvites.length > 0 ? (
              <div className="invites-list">
                {userInvites.map(invite => (
                  <div key={invite.id} className="invite-card">
                    <div className="invite-event-name">
                      <Link to={`/event/${invite.eventId}`}>{invite.eventTitle}</Link>
                    </div>
                    <div className="invite-status">
                      <span className={`status-badge status-${invite.status}`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </div>
                    <div className="invite-date">
                      <i className="far fa-clock"></i> 
                      {new Date(invite.invitedAt?.toDate()).toLocaleDateString()}
                    </div>
                    <div className="invite-actions">
                      {invite.status === 'pending' && (
                        <>
                          <button className="btn btn-success btn-sm">Accept</button>
                          <button className="btn btn-danger btn-sm">Decline</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <i className="far fa-envelope"></i>
                </div>
                <div className="empty-state-message">
                  You don't have any invites yet
                </div>
                <Link to="/events" className="btn btn-primary">Browse Events</Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="profile-section">
            <div className="section-title">Favorite Events</div>

            {profileData?.favorites && profileData.favorites.length > 0 ? (
              <div className="favorites-list">
                {/* Favorites content would go here */}
                <div className="empty-state">
                  <div className="empty-state-message">
                    Favorites feature coming soon!
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <i className="far fa-heart"></i>
                </div>
                <div className="empty-state-message">
                  You haven't favorited any events yet
                </div>
                <Link to="/events" className="btn btn-primary">Browse Events</Link>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="profile-section">
            <div className="section-title">Account Settings</div>
            
            <div className="settings-grid">
              <div className="settings-card">
                <h3 className="settings-card-title">Notification Preferences</h3>
                <div className="settings-item">
                  <div className="settings-label">Email Notifications</div>
                  <div className="settings-control">
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={profileData?.settings?.emailNotifications || false}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
                <div className="settings-item">
                  <div className="settings-label">Push Notifications</div>
                  <div className="settings-control">
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={profileData?.settings?.pushNotifications || false}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <h3 className="settings-card-title">Privacy Settings</h3>
                <div className="settings-item">
                  <div className="settings-label">Public Profile</div>
                  <div className="settings-control">
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={profileData?.settings?.publicProfile || false}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
                <div className="settings-item">
                  <div className="settings-label">Show Location</div>
                  <div className="settings-control">
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={profileData?.settings?.shareLocation || false}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileContent;