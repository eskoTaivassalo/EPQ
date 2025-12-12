import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import * as userDatabaseService from '../../services/userDatabaseService';

// Store active listener for cleanup
let activeNotificationListener = null;

// Fetch notifications for current user
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (userId, { rejectWithValue }) => {
    try {
      if (!userId) {
        return [];
      }
      
      // Check if user is actually authenticated in Firebase
      if (!auth?.currentUser) {
        // Silent fail - this is normal during app startup
        return rejectWithValue('not_authenticated');
      }
      
      // Security: Verify the userId matches the authenticated user
      if (auth.currentUser.uid !== userId) {
        return rejectWithValue('user_mismatch');
      }
      
      // Get notification collection from serviceTypes structure
      const profile = await userDatabaseService.getUserMainProfile(userId);
      if (!profile || !profile.primaryRole) {
        console.warn(`No profile found for userId ${userId}`);
        return [];
      }
      
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
      const notificationsRef = collection(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications');
      const snapshot = await getDocs(notificationsRef);
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
        };
      });
      
      // Sort newest first
      notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return notifications;
    } catch (error) {
      throw error;
    }
  }
);

// Create a new notification
export const createNotification = createAsyncThunk(
  'notifications/create',
  async (notificationData) => {
    try {
      
      if (!notificationData.userId) {
        console.error('[createNotification] ❌ ERROR: No userId specified in notification data!');
        throw new Error('Notification must have a userId (recipient)');
      }
      
      if (notificationData.userId === auth?.currentUser?.uid) {
        console.warn('[createNotification] ⚠️ WARNING: Creating notification for SELF (sender = receiver). This is OK for testing but may indicate a bug.');
      }
      
      // Get user profile to determine collection
      const profile = await userDatabaseService.getUserMainProfile(notificationData.userId);
      if (!profile || !profile.primaryRole) {
        throw new Error('User profile not found');
      }
      
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
      console.log('🔔 Creating notification at path:', `serviceTypes/${serviceType}/${collectionName}/${notificationData.userId}/notifications`);
      console.log('🔔 Profile role:', profile.primaryRole, 'serviceType:', serviceType, 'collection:', collectionName);
      
      // Generate notification ID
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use setDoc with explicit path like bookings do
      const notificationRef = doc(
        db,
        'serviceTypes',
        serviceType,
        collectionName,
        notificationData.userId,
        'notifications',
        notificationId
      );
      
      await setDoc(notificationRef, {
        ...notificationData,
        read: false,
        createdAt: serverTimestamp()
      });
      
      // Do NOT read back here: sender isn't allowed to read receiver's notifications by rules.
      // Return a serializable client timestamp for immediate UI update; the server timestamp remains in Firestore.
      return {
        id: notificationId,
        ...notificationData,
        read: false,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[createNotification] ❌ Error creating notification:', error);
      console.error('[createNotification] Notification data was:', notificationData);
      throw error;
    }
  }
);

// Mark notification as read
export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId) => {
    try {
      console.log('📖 markAsRead called with notificationId:', notificationId);
      
      const userId = auth?.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');
      
      // Get user profile to determine correct collection path
      const profile = await userDatabaseService.getUserMainProfile(userId);
      if (!profile || !profile.primaryRole) {
        throw new Error('User profile not found');
      }
      
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
      
      console.log('👤 Current userId:', userId);
      console.log('📍 Document path:', `serviceTypes/${serviceType}/${collectionName}/${userId}/notifications/${notificationId}`);
      
      const ref = doc(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications', notificationId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.warn('[notifications] ⚠️ markAsRead skipped: doc does not exist', notificationId);
        return notificationId;
      }
      
      console.log('📄 Notification found, updating read status...');
      await updateDoc(ref, { read: true });
      console.log('✅ Notification marked as read successfully');
      return notificationId;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }
);

// Mark all notifications as read
export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (userId) => {
    try {
      const profile = await userDatabaseService.getUserMainProfile(userId);
      if (!profile || !profile.primaryRole) return [];
      
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
      const notificationsRef = collection(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications');
      const q = query(
        notificationsRef,
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      
      const updates = snapshot.docs.map(document => 
        updateDoc(doc(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications', document.id), { read: true })
      );
      
      await Promise.all(updates);
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }
);

// Delete a single notification
export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (notificationId) => {
    try {
      const userId = auth?.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');
      
      const profile = await userDatabaseService.getUserMainProfile(userId);
      if (!profile || !profile.primaryRole) throw new Error('User profile not found');
      
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
      await deleteDoc(doc(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications', notificationId));
      return notificationId;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
);

// Clear all read notifications
export const clearReadNotifications = createAsyncThunk(
  'notifications/clearRead',
  async (userId) => {
    try {
      const profile = await userDatabaseService.getUserMainProfile(userId);
      if (!profile || !profile.primaryRole) return [];
      
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
      const notificationsRef = collection(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications');
      const q = query(
        notificationsRef,
        where('read', '==', true)
      );
      const snapshot = await getDocs(q);
      
      const deletions = snapshot.docs.map(document => 
        deleteDoc(doc(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications', document.id))
      );
      
      await Promise.all(deletions);
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error clearing read notifications:', error);
      throw error;
    }
  }
);

// Delete old notifications (older than 30 days)
export const deleteOldNotifications = createAsyncThunk(
  'notifications/deleteOld',
  async (userId) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const profile = await userDatabaseService.getUserMainProfile(userId);
      if (!profile || !profile.primaryRole) return [];
      
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
      const notificationsRef = collection(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications');
      const snapshot = await getDocs(notificationsRef);
      
      // Filter old notifications client-side
      const oldDocs = snapshot.docs.filter(docSnap => {
        const createdAt = docSnap.data().createdAt;
        if (!createdAt) return false;
        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        return date < thirtyDaysAgo;
      });
      
      const deletions = oldDocs.map(document => 
        deleteDoc(doc(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications', document.id))
      );
      
      await Promise.all(deletions);
      return oldDocs.map(doc => doc.id);
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }
);

// Start real-time listener (replaces polling)
export const startNotificationListener = async (userId, dispatch) => {
  // Stop existing listener if any
  if (activeNotificationListener) {
    activeNotificationListener();
    activeNotificationListener = null;
  }

  if (!userId) return;

  const profile = await userDatabaseService.getUserMainProfile(userId);
  if (!profile || !profile.primaryRole) return;
  
  const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(profile.primaryRole);
  const notificationsRef = collection(db, 'serviceTypes', serviceType, collectionName, userId, 'notifications');

  activeNotificationListener = onSnapshot(notificationsRef, 
    (snapshot) => {
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
        };
      });

      // Sort newest first
      notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      
      // Update store directly
      dispatch(notificationsSlice.actions.setNotifications(notifications));
    },
    (error) => {
      // Notification listener error
    }
  );

  return activeNotificationListener;
};

// Stop listener
export const stopNotificationListener = () => {
  if (activeNotificationListener) {
    activeNotificationListener();
    activeNotificationListener = null;
  }
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null
  },
  reducers: {
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    setNotifications: (state, action) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        const unreadCount = action.payload.filter(n => !n.read).length;
        state.unreadCount = unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        // Don't show error for auth-related rejections during startup
        if (action.payload !== 'not_authenticated' && action.payload !== 'user_mismatch') {
          state.error = action.error.message;
        }
      })
      
      // Create notification - NOTE: Don't add to state here!
      // The notification is created for ANOTHER user (recipient), not the sender.
      // The recipient will get it via fetchNotifications.
      .addCase(createNotification.fulfilled, (state, action) => {
        // Do nothing - notification was created in Firestore for another user
      })
      
      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      
      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state, action) => {
        action.payload.forEach(id => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.read = true;
          }
        });
        state.unreadCount = 0;
      })
      
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(n => n.id !== action.payload);
      })
      
      // Clear read notifications
      .addCase(clearReadNotifications.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(n => !action.payload.includes(n.id));
      })
      
      // Delete old notifications
      .addCase(deleteOldNotifications.fulfilled, (state, action) => {
        const deletedIds = action.payload;
        deletedIds.forEach(id => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        });
        state.notifications = state.notifications.filter(n => !deletedIds.includes(n.id));
      });
  }
});

export const { clearNotifications, setNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
