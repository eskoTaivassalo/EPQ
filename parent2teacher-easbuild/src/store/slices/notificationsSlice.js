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
      if (!userId) {
        return [];
      }
      
      // Check if user is actually authenticated in Firebase
      if (!auth?.currentUser) {
        console.error('[fetchNotifications] ❌ User not authenticated in Firebase!');
        return [];
      }
      
      // Verify the userId matches the authenticated user
      if (auth.currentUser.uid !== userId) {
        console.error('[fetchNotifications] ❌ userId mismatch! Requested:', userId, 'Authenticated:', auth.currentUser.uid);
        return [];
      }
      
      // Avoid orderBy to prevent missing-index failures on fresh environments; sort on client instead.
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
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
      console.error('[fetchNotifications] ❌ Error fetching notifications:', error);
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
      
      const ref = doc(db, 'notifications', notificationId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.warn('[notifications] markAsRead skipped: doc does not exist', notificationId);
        return notificationId; // Graceful: return so reducer can ignore if needed
      }
      const data = snap.data();
      
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
        const unreadCount = action.payload.filter(n => !n.read).length;
        state.unreadCount = unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
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

export const { clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
