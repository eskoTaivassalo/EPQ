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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';

// Fetch notifications for current user
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (userId) => {
    try {
      // Avoid orderBy to prevent missing-index failures on fresh environments; sort on client instead.
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString()
      }));
      // Sort newest first
      notifications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }
);

// Create a new notification
export const createNotification = createAsyncThunk(
  'notifications/create',
  async (notificationData) => {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        read: false,
        createdAt: serverTimestamp()
      });

      // Do NOT read back here: sender isn't allowed to read receiver's notifications by rules.
      // Return a serializable client timestamp for immediate UI update; the server timestamp remains in Firestore.
      return {
        id: docRef.id,
        ...notificationData,
        read: false,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
);

// Mark notification as read
export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId) => {
    try {
      console.log('[markAsRead] Starting for notificationId:', notificationId);
      console.log('[markAsRead] Current user:', auth?.currentUser?.uid);
      
      const ref = doc(db, 'notifications', notificationId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.warn('[notifications] markAsRead skipped: doc does not exist', notificationId);
        return notificationId; // Graceful: return so reducer can ignore if needed
      }
      const data = snap.data();
      console.log('[markAsRead] Notification data:', {
        userId: data.userId,
        type: data.type,
        read: data.read
      });
      
      if (!data || typeof data.userId !== 'string') {
        console.warn('[notifications] markAsRead skipped: missing userId field (legacy malformed doc?)', notificationId);
        return notificationId;
      }
      await updateDoc(ref, { read: true });
      return notificationId;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
);

// Mark all notifications as read
export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (userId) => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      
      const updates = snapshot.docs.map(document => 
        updateDoc(doc(db, 'notifications', document.id), { read: true })
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
      await deleteDoc(doc(db, 'notifications', notificationId));
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
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', true)
      );
      const snapshot = await getDocs(q);
      
      const deletions = snapshot.docs.map(document => 
        deleteDoc(doc(db, 'notifications', document.id))
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
      
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      
      // Filter old notifications client-side
      const oldDocs = snapshot.docs.filter(doc => {
        const createdAt = doc.data().createdAt;
        if (!createdAt) return false;
        const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        return date < thirtyDaysAgo;
      });
      
      const deletions = oldDocs.map(document => 
        deleteDoc(doc(db, 'notifications', document.id))
      );
      
      await Promise.all(deletions);
      return oldDocs.map(doc => doc.id);
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }
);

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
        state.unreadCount = action.payload.filter(n => !n.read).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // Create notification
      .addCase(createNotification.fulfilled, (state, action) => {
        state.notifications.unshift(action.payload);
        if (!action.payload.read) {
          state.unreadCount += 1;
        }
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

export const { clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
