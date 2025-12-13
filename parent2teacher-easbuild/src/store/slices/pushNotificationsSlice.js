import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@scheduled_push_notifications';

/**
 * Schedule push notifications for a booking
 * Returns array of { notificationId, trigger, bookingId, type }
 */
export const scheduleBookingNotifications = createAsyncThunk(
  'pushNotifications/scheduleBooking',
  async ({ booking, userRole }, { rejectWithValue }) => {
    try {
      // Check permissions first
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          return [];
        }
      }

      // Create/ensure Android notification channel exists
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('booking-reminders', {
          name: 'Booking Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      if (!booking.start) {
        return [];
      }

      const bookingDate = new Date(booking.start);
      const now = new Date();
      
      // Don't schedule if booking is less than 30 minutes away
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      if (bookingDate < thirtyMinutesFromNow) {
        return [];
      }

      const counterpartName = userRole === 'parent' 
        ? (booking.teacherName || 'Teacher')
        : (booking.parentName || 'Parent');

      // Define notification schedule: 24h, 1h before (5min removed temporarily)
      const schedules = [
        {
          minutesBefore: 24 * 60,
          title: '📅 Huomenna tunti',
          body: `Muistutus: ${counterpartName} odottaa sinua huomenna klo ${bookingDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`,
          priority: 'default',
        },
        {
          minutesBefore: 60,
          title: userRole === 'teacher' ? '⏰ Tunti alkaa tunnin päästä' : '⏰ Tuntisi alkaa tunnin päästä',
          body: userRole === 'teacher' 
            ? `${counterpartName} - valmistaudu tuntiin. Muista tarkistaa materiaali!`
            : `${counterpartName} odottaa sinua tunnin kuluttua. Valmistaudu!`,
          priority: 'high',
        },
        // 5 minute reminder DISABLED temporarily due to issues
        // {
        //   minutesBefore: 5,
        //   title: '🔔 Tunti alkaa kohta!',
        //   body: `${counterpartName} odottaa sinua videossa 5 minuutin kuluttua.\n👉 Paina tästä liittyäksesi`,
        //   priority: 'max',
        // },
      ];

      const scheduledNotifications = [];

      for (const schedule of schedules) {
        const reminderTime = new Date(bookingDate.getTime() - schedule.minutesBefore * 60 * 1000);
        
        if (reminderTime > now) {
          // Use seconds from now instead of date object (more reliable on Android)
          const secondsFromNow = Math.floor((reminderTime - now) / 1000);
          
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: schedule.title,
              body: schedule.body,
              data: {
                bookingId: booking.id,
                meetingUrl: booking.meetingUrl,
                type: 'booking_reminder',
                minutesBefore: schedule.minutesBefore,
                userRole,
              },
              sound: true,
              priority: Notifications.AndroidNotificationPriority[schedule.priority.toUpperCase()] || Notifications.AndroidNotificationPriority.DEFAULT,
            },
            trigger: {
              seconds: secondsFromNow,
            },
          });

          scheduledNotifications.push({
            notificationId,
            bookingId: booking.id,
            trigger: reminderTime.toISOString(),
            minutesBefore: schedule.minutesBefore,
            title: schedule.title,
          });
        }
      }

      return scheduledNotifications;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Schedule notifications for all upcoming bookings
 * Cancels existing notifications first to avoid duplicates
 */
export const scheduleAllBookingNotifications = createAsyncThunk(
  'pushNotifications/scheduleAll',
  async ({ bookings, userRole }, { dispatch }) => {
    try {
      // Cancel all existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Filter to only confirmed bookings with meeting URLs
      const now = new Date();
      const upcomingBookings = bookings.filter(b => {
        const isConfirmed = b.status === 'accepted' || b.status === 'confirmed';
        const bookingDate = new Date(b.start || b.date);
        return isConfirmed && bookingDate > now && b.meetingUrl;
      });

      // Schedule notifications for each booking
      const results = await Promise.all(
        upcomingBookings.map(booking => 
          dispatch(scheduleBookingNotifications({ booking, userRole })).unwrap()
        )
      );

      // Flatten results (each booking returns array of notifications)
      const allScheduled = results.flat();
      
      return allScheduled;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Clear all scheduled push notifications
 */
export const clearAllNotifications = createAsyncThunk(
  'pushNotifications/clearAll',
  async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
      return scheduled.length;
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Load scheduled notifications from system
 * (For debugging/verification purposes)
 */
export const loadScheduledNotifications = createAsyncThunk(
  'pushNotifications/loadScheduled',
  async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.map(notif => ({
        id: notif.identifier,
        trigger: notif.trigger?.date ? new Date(notif.trigger.date).toISOString() : null,
        title: notif.content?.title,
        body: notif.content?.body,
        data: notif.content?.data,
      }));
    } catch (error) {
      throw error;
    }
  }
);

const pushNotificationsSlice = createSlice({
  name: 'pushNotifications',
  initialState: {
    // Map of bookingId -> array of scheduled notification objects
    scheduledByBooking: {},
    // Total count of scheduled notifications
    totalScheduled: 0,
    // Loading state
    loading: false,
    error: null,
    // Last sync timestamp
    lastSync: null,
  },
  reducers: {
    // Manual clear of state (doesn't cancel actual notifications)
    resetState: (state) => {
      state.scheduledByBooking = {};
      state.totalScheduled = 0;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Schedule notifications for single booking
      .addCase(scheduleBookingNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scheduleBookingNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const notifications = action.payload;
        
        if (notifications.length > 0) {
          const bookingId = notifications[0].bookingId;
          state.scheduledByBooking[bookingId] = notifications;
          state.totalScheduled = Object.values(state.scheduledByBooking)
            .flat()
            .length;
        }
      })
      .addCase(scheduleBookingNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Schedule all bookings
      .addCase(scheduleAllBookingNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(scheduleAllBookingNotifications.fulfilled, (state, action) => {
        state.loading = false;
        
        // Rebuild scheduledByBooking map
        state.scheduledByBooking = {};
        action.payload.forEach(notif => {
          if (!state.scheduledByBooking[notif.bookingId]) {
            state.scheduledByBooking[notif.bookingId] = [];
          }
          state.scheduledByBooking[notif.bookingId].push(notif);
        });
        
        state.totalScheduled = action.payload.length;
        state.lastSync = new Date().toISOString();
      })
      .addCase(scheduleAllBookingNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      // Clear all notifications
      .addCase(clearAllNotifications.fulfilled, (state, action) => {
        state.scheduledByBooking = {};
        state.totalScheduled = 0;
      })

      // Load scheduled (for debugging)
      .addCase(loadScheduledNotifications.fulfilled, (state, action) => {
        // Notification data loaded
      });
  },
});

export const { resetState } = pushNotificationsSlice.actions;

// Selectors
export const selectScheduledNotifications = (state) => state.pushNotifications.scheduledByBooking;
export const selectTotalScheduled = (state) => state.pushNotifications.totalScheduled;
export const selectNotificationsLoading = (state) => state.pushNotifications.loading;
export const selectNotificationsError = (state) => state.pushNotifications.error;
export const selectLastSync = (state) => state.pushNotifications.lastSync;

export default pushNotificationsSlice.reducer;
