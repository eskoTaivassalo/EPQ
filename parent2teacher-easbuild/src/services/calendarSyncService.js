/**
 * Calendar Sync Service
 * 
 * Handles synchronization between app calendar and external calendars:
 * - Google Calendar
 * - Microsoft Outlook/Office 365
 * - Apple iCloud Calendar
 * 
 * Features:
 * - Two-way sync (import external events, export app bookings)
 * - Conflict detection (warn if external event overlaps with availability)
 * - Auto-block busy times from external calendars
 */

import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { toISODate } from '../utils/dateUtils';

/**
 * Request calendar permissions
 */
export async function requestCalendarPermissions() {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Calendar access is needed to sync your schedule'
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error('Calendar permission error:', error);
    return false;
  }
}

/**
 * Get device calendars
 */
export async function getDeviceCalendars() {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return [];

    const calendars = await Calendar.getCalendarsAsync();
    return calendars.filter(cal => 
      cal.allowsModifications && 
      (cal.type === Calendar.CalendarType.LOCAL || 
       cal.type === Calendar.CalendarType.CALDAV ||
       cal.type === Calendar.CalendarType.EXCHANGE)
    );
  } catch (error) {
    console.error('Get calendars error:', error);
    return [];
  }
}

/**
 * Export booking to device calendar
 * @param {Object} booking - Booking object with start, end, teacherName, parentName
 * @param {string} calendarId - Device calendar ID
 */
export async function exportBookingToCalendar(booking, calendarId) {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return null;

    const title = booking.teacherName 
      ? `Session with ${booking.teacherName}` 
      : `Session with ${booking.parentName}`;
    
    const notes = [
      booking.subject ? `Subject: ${booking.subject}` : '',
      booking.notes ? `Notes: ${booking.notes}` : '',
      booking.meetingLink ? `Meeting: ${booking.meetingLink}` : '',
    ].filter(Boolean).join('\n');

    const eventId = await Calendar.createEventAsync(calendarId, {
      title,
      startDate: new Date(booking.start),
      endDate: new Date(booking.end),
      notes,
      alarms: [
        { relativeOffset: -60 }, // 1 hour before
        { relativeOffset: -15 }, // 15 minutes before
      ],
    });

    // Store calendar event ID in booking metadata
    if (db && booking.id) {
      await setDoc(
        doc(db, 'bookings', booking.id),
        { 
          calendarEventId: eventId,
          calendarId: calendarId,
          syncedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return eventId;
  } catch (error) {
    console.error('Export to calendar error:', error);
    throw error;
  }
}

/**
 * Import events from device calendar and detect conflicts
 * @param {string} userId - Teacher user ID
 * @param {string} calendarId - Device calendar ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {Object} { events, conflicts }
 */
export async function importCalendarEvents(userId, calendarId, fromDate, toDate) {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return { events: [], conflicts: [] };

    // Get events from device calendar
    const externalEvents = await Calendar.getEventsAsync(
      [calendarId],
      fromDate,
      toDate
    );

    // Get teacher's availability slots
    // IMPORTANT: Use toISODate() to match the format used when creating slots (local timezone)
    const slotsQuery = query(
      collection(db, 'availabilitySlots'),
      where('teacherId', '==', userId),
      where('date', '>=', toISODate(fromDate)),
      where('date', '<=', toISODate(toDate))
    );
    const slotsSnapshot = await getDocs(slotsQuery);
    const availabilitySlots = slotsSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      start: new Date(d.data().start),
      end: new Date(d.data().end),
    }));

    // Detect conflicts
    const conflicts = [];
    for (const extEvent of externalEvents) {
      const extStart = new Date(extEvent.startDate);
      const extEnd = new Date(extEvent.endDate);

      // Check if external event overlaps with any availability slot
      for (const slot of availabilitySlots) {
        if (
          (extStart < slot.end && extEnd > slot.start) && // Overlap check
          slot.status === 'available' // Only flag if slot is available
        ) {
          conflicts.push({
            externalEvent: {
              title: extEvent.title,
              start: extStart,
              end: extEnd,
            },
            availabilitySlot: {
              id: slot.id,
              start: slot.start,
              end: slot.end,
            },
          });
        }
      }
    }

    return {
      events: externalEvents.map(e => ({
        title: e.title,
        start: new Date(e.startDate),
        end: new Date(e.endDate),
        allDay: e.allDay,
        notes: e.notes,
      })),
      conflicts,
    };
  } catch (error) {
    console.error('Import calendar error:', error);
    return { events: [], conflicts: [] };
  }
}

/**
 * Auto-block times based on external calendar
 * Creates blocked slots for busy times in external calendar
 * @param {string} userId - Teacher user ID
 * @param {string} calendarId - Device calendar ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
export async function autoBlockFromCalendar(userId, calendarId, fromDate, toDate) {
  try {
    const { events, conflicts } = await importCalendarEvents(userId, calendarId, fromDate, toDate);
    
    if (conflicts.length === 0) {
      return { blockedCount: 0, conflicts: [] };
    }

    // Create blocked slots for each conflict
    let blockedCount = 0;
    for (const conflict of conflicts) {
      const slot = conflict.availabilitySlot;
      
      // Update slot status to blocked
      await setDoc(
        doc(db, 'availabilitySlots', slot.id),
        {
          status: 'blocked',
          blockReason: `Busy: ${conflict.externalEvent.title}`,
          blockedAt: serverTimestamp(),
          externalCalendarId: calendarId,
        },
        { merge: true }
      );
      
      blockedCount++;
    }

    return { blockedCount, conflicts };
  } catch (error) {
    console.error('Auto-block error:', error);
    throw error;
  }
}

/**
 * Sync all bookings to calendar
 * @param {string} userId - User ID
 * @param {string} calendarId - Device calendar ID
 */
export async function syncAllBookingsToCalendar(userId, calendarId) {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return { synced: 0, errors: 0 };

    // Get all future bookings
    // IMPORTANT: Use toISODate() to match the format used when creating bookings (local timezone)
    const now = new Date();
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('teacherId', '==', userId),
      where('date', '>=', toISODate(now)),
      where('status', 'in', ['confirmed', 'booked'])
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);

    let synced = 0;
    let errors = 0;

    for (const bookingDoc of bookingsSnapshot.docs) {
      const booking = { id: bookingDoc.id, ...bookingDoc.data() };
      
      // Skip if already synced
      if (booking.calendarEventId) continue;

      try {
        await exportBookingToCalendar(booking, calendarId);
        synced++;
      } catch (error) {
        console.error(`Failed to sync booking ${booking.id}:`, error);
        errors++;
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('Sync all bookings error:', error);
    throw error;
  }
}

/**
 * Get calendar sync status for user
 * @param {string} userId - User ID
 */
export async function getCalendarSyncStatus(userId) {
  try {
    if (!db) return null;

    const configDoc = await getDocs(
      query(
        collection(db, 'calendarSyncConfig'),
        where('userId', '==', userId)
      )
    );

    if (configDoc.empty) return null;

    return configDoc.docs[0].data();
  } catch (error) {
    console.error('Get sync status error:', error);
    return null;
  }
}

/**
 * Save calendar sync configuration
 * @param {string} userId - User ID
 * @param {Object} config - Sync configuration
 */
export async function saveCalendarSyncConfig(userId, config) {
  try {
    if (!db) throw new Error('Firestore not initialized');

    await setDoc(
      doc(db, 'calendarSyncConfig', userId),
      {
        userId,
        ...config,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error('Save sync config error:', error);
    throw error;
  }
}

export default {
  requestCalendarPermissions,
  getDeviceCalendars,
  exportBookingToCalendar,
  importCalendarEvents,
  autoBlockFromCalendar,
  syncAllBookingsToCalendar,
  getCalendarSyncStatus,
  saveCalendarSyncConfig,
};
