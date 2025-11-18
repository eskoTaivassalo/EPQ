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
      console.warn('⚠️ Notification permissions not granted');
      return false;
    }

    console.log('✅ Notification permissions granted');

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
 * Schedule a local notification for upcoming booking
 * @param {Object} booking - Booking object with id, date, teacherName/parentName, meetingUrl
 * @param {string} userRole - 'teacher' or 'parent'
 * @returns {Promise<string|null>} notification identifier or null if failed
 */
export async function scheduleBookingReminder(booking, userRole = 'parent') {
  try {
    const bookingDate = new Date(booking.date);
    const now = new Date();
    
    // Schedule notification 5 minutes before booking
    const reminderTime = new Date(bookingDate.getTime() - 5 * 60 * 1000);
    
    // Don't schedule if:
    // 1. Reminder time is in the past
    // 2. Booking is less than 30 minutes away (too soon to be useful, prevents spam)
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    if (reminderTime <= now) {
      console.log('⏰ Reminder time in past, skipping');
      return null;
    }
    if (bookingDate < thirtyMinutesFromNow) {
      console.log('⏰ Booking less than 30 min away, skipping reminder to prevent spam');
      return null;
    }

    const counterpartName = userRole === 'parent' 
      ? (booking.teacherName || 'Teacher')
      : (booking.parentName || 'Parent');

    const notificationContent = {
      title: '🔔 Tunti alkaa kohta!',
      body: `${counterpartName} odottaa sinua videossa 5 minuutin kuluttua.\n👉 Paina tästä liittyäksesi`,
      data: {
        bookingId: booking.id,
        meetingUrl: booking.meetingUrl,
        type: 'booking_reminder'
      },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      channelId: 'bookings',
    };

    const trigger = {
      date: reminderTime,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger,
    });

    console.log(`✅ Scheduled booking reminder (ID: ${notificationId}) for ${reminderTime.toLocaleString()}`);
    return notificationId;

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
    // Cancel all existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const now = new Date();
    const upcomingBookings = bookings.filter(b => {
      const isConfirmed = b.status === 'accepted' || b.status === 'confirmed';
      const bookingDate = new Date(b.date);
      return isConfirmed && bookingDate > now && b.meetingUrl;
    });

    console.log(`📅 Scheduling reminders for ${upcomingBookings.length} upcoming bookings`);
    if (upcomingBookings.length > 0) {
      console.log('📋 Booking details:', upcomingBookings.map(b => ({
        id: b.id,
        date: b.date,
        status: b.status,
        daysFromNow: Math.round((new Date(b.date) - now) / (1000 * 60 * 60 * 24))
      })));
    }

    const scheduled = await Promise.all(
      upcomingBookings.map(booking => scheduleBookingReminder(booking, userRole))
    );

    const successCount = scheduled.filter(id => id !== null).length;
    console.log(`✅ Successfully scheduled ${successCount} reminders`);

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
    console.log(`✅ Cancelled notification: ${notificationId}`);
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
    console.log('✅ Sent immediate notification');
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
    const { meetingUrl, bookingId, type } = response.notification.request.content.data;
    
    console.log('📬 Notification tapped:', { meetingUrl, bookingId, type });
    
    if (callback) {
      callback({ meetingUrl, bookingId, type });
    }
  });

  return subscription;
}
