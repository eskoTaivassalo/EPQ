import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from user
 * @returns {Promise<boolean>} true if permissions granted
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bookings', {
        name: 'Booking Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule notifications for upcoming booking with multiple reminders
 * @param {Object} booking - Booking object with id, start, teacherName/parentName, meetingUrl
 * @param {string} userRole - 'teacher' or 'parent'
 * @returns {Promise<Array<string>>} Array of scheduled notification identifiers
 */
export async function scheduleBookingReminder(booking, userRole = 'parent') {
  try {
    // CRITICAL: Must use booking.start for accurate time
    if (!booking.start) {
      console.warn(`⚠️ Booking ${booking.id} missing 'start' field, using 'date' as fallback (may be inaccurate)`);
    }
    
    const bookingDate = new Date(booking.start || booking.date);
    const now = new Date();
    
    const hoursUntilBooking = (bookingDate - now) / (1000 * 60 * 60);
    
    // Don't schedule anything if booking is less than 30 minutes away
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    if (bookingDate < thirtyMinutesFromNow) {
      return [];
    }

    const counterpartName = userRole === 'parent' 
      ? (booking.teacherName || 'Teacher')
      : (booking.parentName || 'Parent');

    const scheduledIds = [];

    // Define notification times: 24h, 1h, and 5min before
    const notificationSchedule = [
      {
        minutesBefore: 24 * 60, // 24 hours
        title: '📅 Huomenna tunti',
        body: `Muistutus: ${counterpartName} odottaa sinua huomenna klo ${bookingDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      {
        minutesBefore: 60, // 1 hour
        title: '⏰ Tunti alkaa tunnin päästä',
        body: `${counterpartName} - valmistaudu tuntiin. Muista tarkistaa materiaali!`,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      {
        minutesBefore: 5, // 5 minutes
        title: '🔔 Tunti alkaa kohta!',
        body: `${counterpartName} odottaa sinua videossa 5 minuutin kuluttua.\n👉 Paina tästä liittyäksesi`,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
    ];

    // Schedule each notification if it's in the future
    for (const schedule of notificationSchedule) {
      const reminderTime = new Date(bookingDate.getTime() - schedule.minutesBefore * 60 * 1000);
      
      if (reminderTime > now) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: schedule.title,
            body: schedule.body,
            data: {
              bookingId: booking.id,
              meetingUrl: booking.meetingUrl,
              type: 'booking_reminder',
              minutesBefore: schedule.minutesBefore
            },
            sound: true,
            priority: schedule.priority,
            channelId: 'bookings',
          },
          trigger: {
            date: reminderTime,
          },
        });
        
        scheduledIds.push(notificationId);
      } else {
        // Reminder time already passed
      }
    }

    return scheduledIds;

  } catch (error) {
    console.error('❌ Error scheduling booking reminder:', error);
    return null;
  }
}

/**
 * Schedule reminders for all upcoming bookings
 * @param {Array} bookings - Array of booking objects
 * @param {string} userRole - 'teacher' or 'parent'
 */
export async function scheduleAllUpcomingReminders(bookings, userRole) {
  try {
    // NOTE: Caller should cancel existing notifications before calling this
    // to avoid race conditions. We don't cancel here.
    
    const now = new Date();
    const upcomingBookings = bookings.filter(b => {
      const isConfirmed = b.status === 'accepted' || b.status === 'confirmed';
      // Use b.start for full timestamp, fallback to date if not available
      const bookingDate = new Date(b.start || b.date);
      return isConfirmed && bookingDate > now && b.meetingUrl;
    });

    const scheduled = await Promise.all(
      upcomingBookings.map(booking => scheduleBookingReminder(booking, userRole))
    );

    const successCount = scheduled.filter(id => id !== null).length;
    
    return successCount;
  } catch (error) {
    console.error('❌ Error scheduling all reminders:', error);
    return 0;
  }
}

/**
 * Cancel a specific scheduled notification
 * @param {string} notificationId - Notification identifier
 */
export async function cancelNotification(notificationId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('❌ Error cancelling notification:', error);
  }
}

/**
 * Send an immediate local notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data
 */
export async function sendImmediateNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // immediate
    });
  } catch (error) {
    console.error('❌ Error sending immediate notification:', error);
  }
}

/**
 * Handle notification response (when user taps notification)
 * @param {Function} callback - Callback function to handle navigation
 */
export function addNotificationResponseListener(callback) {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response?.notification?.request?.content?.data || {};
    
    if (callback) {
      callback(data); // Return all data fields
    }
  });

  return subscription;
}
