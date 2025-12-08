import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import { createNotification } from './notificationsSlice';

const initialState = {
  myBookings: [],
  recurringBookings: [], // Master recurring booking records
  loading: false,
  error: null,
};

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async ({ teacherId, date, notes, teacherName }, { rejectWithValue, dispatch }) => {
    try {
      console.log('[createBooking] Starting booking creation...', { teacherId, date, notes });
      
      if (!auth?.currentUser) {
        console.error('[createBooking] Not authenticated');
        throw new Error('Not authenticated');
      }
      if (!db) {
        console.error('[createBooking] Firebase database not initialized');
        throw new Error('Firebase database not initialized');
      }

      // Write payload for Firestore (can include serverTimestamp)
      const payloadToDB = {
        teacherId,
        parentId: auth.currentUser.uid,
        // Firestore rules require 'pending' on create
        status: 'pending',
        date: typeof date === 'string' ? date : new Date(date).toISOString(),
        notes: notes || '',
        createdAt: serverTimestamp(),
      };
      
      console.log('[createBooking] Payload to DB:', payloadToDB);
      const ref = await addDoc(collection(db, 'bookings'), payloadToDB);
      console.log('[createBooking] Booking created with ID:', ref.id);

      // Read back (or compute) a serializable createdAt for Redux state
      let createdAtISO = new Date().toISOString();
      try {
        const snap = await getDoc(ref);
        const data = snap.data();
        if (data?.createdAt?.toDate) {
          createdAtISO = data.createdAt.toDate().toISOString();
        }
      } catch (err) {
        console.warn('[createBooking] Failed to read back document:', err);
      }

      // Create notification for teacher
      console.log('[createBooking] Creating notification for teacher:', teacherId);
      dispatch(createNotification({
        userId: teacherId,
        type: 'booking_request',
        title: 'Uusi ajanvaraus',
        message: `Sinulle on tehty uusi ajanvaraus ${new Date(date).toLocaleString('fi-FI')}`,
        navigationTarget: 'TeacherBookings',
        navigationParams: { bookingId: ref.id }
      }));
      
      console.log('[createBooking] Booking creation successful');

      return { id: ref.id, ...payloadToDB, createdAt: createdAtISO };
    } catch (err) {
      console.error('[createBooking] Error creating booking:', err);
      return rejectWithValue(err.message);
    }
  }
);

export const fetchParentBookings = createAsyncThunk(
  'bookings/fetchParentBookings',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('[fetchParentBookings] Starting fetch...');
      
      // Prefer Firebase auth, but fall back to Redux user if needed
      let uid = auth?.currentUser?.uid;
      if (!uid) {
        const state = getState?.();
        uid = state?.auth?.user?.uid;
      }

      // Small retry window to allow auth hydration
      if (!uid) {
        console.log('[fetchParentBookings] Auth not ready, waiting...');
        await new Promise(resolve => setTimeout(resolve, 150));
        uid = auth?.currentUser?.uid || getState?.()?.auth?.user?.uid;
      }

      if (!uid) {
        console.error('[fetchParentBookings] Still not authenticated after wait');
        return rejectWithValue('Not authenticated');
      }
      
      console.log('[fetchParentBookings] Fetching for parentId:', uid);
      const q = query(collection(db, 'bookings'), where('parentId', '==', uid));
      const snap = await getDocs(q);
      
      const bookings = snap.docs.map(d => {
        const data = d.data();
        const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;
        return { id: d.id, ...data, createdAt };
      });
      
      console.log('[fetchParentBookings] Found bookings:', bookings.length);
      return bookings;
    } catch (err) {
      console.error('[fetchParentBookings] Error:', err);
      return rejectWithValue(err.message);
    }
  }
);

export const fetchTeacherBookings = createAsyncThunk(
  'bookings/fetchTeacherBookings',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('[fetchTeacherBookings] Starting fetch...');
      
      // Prefer Firebase auth, but fall back to Redux user if needed
      let uid = auth?.currentUser?.uid;
      if (!uid) {
        const state = getState?.();
        uid = state?.auth?.user?.uid;
      }

      if (!uid) {
        console.log('[fetchTeacherBookings] Auth not ready, waiting...');
        await new Promise(resolve => setTimeout(resolve, 150));
        uid = auth?.currentUser?.uid || getState?.()?.auth?.user?.uid;
      }

      if (!uid) {
        console.error('[fetchTeacherBookings] Still not authenticated after wait');
        return rejectWithValue('Not authenticated');
      }
      
      console.log('[fetchTeacherBookings] Current user:', uid);
      const q = query(collection(db, 'bookings'), where('teacherId', '==', uid));
      const snap = await getDocs(q);
      const docs = Array.isArray(snap?.docs) ? snap.docs : [];
      console.log('[fetchTeacherBookings] Found', docs.length, 'bookings');
      const bookings = docs.map(d => {
        const data = d.data();
        const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;
        return { id: d.id, ...data, createdAt };
      });
      console.log('[fetchTeacherBookings] Returning', bookings.length, 'bookings');
      return bookings;
    } catch (err) {
      console.error('[fetchTeacherBookings] Error:', err);
      return rejectWithValue(err.message);
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'bookings/updateBookingStatus',
  async ({ bookingId, status, parentId, teacherName, date, declineReason, suggestedDate, suggestedDateFormatted }, { rejectWithValue, dispatch }) => {
    try {
      console.log('[updateBookingStatus] Starting:', { bookingId, status, parentId });
      
      if (!auth?.currentUser) throw new Error('Not authenticated');
      const ref = doc(db, 'bookings', bookingId);
      
      // Check if this is a recurring booking BEFORE updating
      console.log('[updateBookingStatus] Fetching booking data...');
      const bookingSnap = await getDoc(ref);
      if (!bookingSnap.exists()) {
        throw new Error('Booking not found');
      }
      const bookingData = bookingSnap.data();
      console.log('[updateBookingStatus] Booking data:', { isRecurring: bookingData?.isRecurring, recurringBookingId: bookingData?.recurringBookingId });
      const isRecurringBooking = bookingData?.isRecurring && bookingData?.recurringBookingId;
      
      // When accepting, create a Jitsi Meet link (free, no API needed)
      const update = { status };
      if (status === 'accepted') {
        // Generate unique room name from bookingId for privacy
        const roomName = `Lesson-${bookingId}`;
        const meetingUrl = `https://meet.jit.si/${roomName}`;
        update.meetingProvider = 'jitsi';
        update.meetingUrl = meetingUrl;
      }
      
      // When declining, add reason and suggested time if provided
      if (status === 'declined') {
        if (declineReason) {
          update.declineReason = declineReason;
        }
        if (suggestedDate) {
          update.suggestedDate = suggestedDate;
          update.suggestedDateFormatted = suggestedDateFormatted || new Date(suggestedDate).toLocaleString();
          update.awaitingReschedule = true; // Flag for parent to accept new time
        }
      }
      
      console.log('[updateBookingStatus] Updating booking with:', update);
      await updateDoc(ref, update);
      console.log('[updateBookingStatus] ✅ Booking updated successfully');
      
      // Create notification for parent when status changes
      if (parentId) {
        // For recurring bookings, create a grouped notification
        if (isRecurringBooking && status === 'accepted' && bookingData.recurringBookingId) {
          console.log('[updateBookingStatus] Creating grouped recurring notification for:', bookingData.recurringBookingId);
          
          let acceptedCount = 1; // Default to 1 if query fails
          
          try {
            // Check how many bookings in this series are now accepted
            // MUST include teacherId in query for Firestore security rules to work
            const recurringQuery = query(
              collection(db, 'bookings'),
              where('recurringBookingId', '==', bookingData.recurringBookingId),
              where('teacherId', '==', auth.currentUser.uid),
              where('status', '==', 'accepted')
            );
            const acceptedSnap = await getDocs(recurringQuery);
            acceptedCount = acceptedSnap.docs.length;
            
            console.log('[updateBookingStatus] Found', acceptedCount, 'accepted recurring bookings');
          } catch (queryErr) {
            console.error('[updateBookingStatus] Error querying recurring bookings:', queryErr);
          }
          
          // Create a single grouped notification (Redux will handle duplicates)
          try {
            console.log('[updateBookingStatus] 🔔 Creating notification FOR PARENT:', parentId, '(current user:', auth.currentUser.uid, ')');
            dispatch(createNotification({
              userId: parentId, // IMPORTANT: This goes to PARENT, not teacher
              type: 'recurring_booking_accepted',
              title: `${acceptedCount} Recurring Session${acceptedCount > 1 ? 's' : ''} Approved! 🎉`,
              message: `${teacherName || 'Teacher'} has approved ${acceptedCount} of your recurring booking sessions. Check your bookings for meeting links.`,
              navigationTarget: 'ParentBookings'
            }));
            console.log('[updateBookingStatus] ✅ Notification created for parent:', parentId);
          } catch (notifErr) {
            console.error('[updateBookingStatus] Error creating recurring notification:', notifErr);
          }
          
          // Send ONE push notification for the group (but not if testing with same user)
          // Don't await this - let it run in background
          if (auth.currentUser.uid !== parentId) {
            (async () => {
              try {
                const { sendExpoPushNotification } = await import('../../services/pushService');
                const userDoc = await getDoc(doc(db, 'users', parentId));
                const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
                
                if (token) {
                  await sendExpoPushNotification(
                    token,
                    '✅ Bookings Approved',
                    `${acceptedCount} recurring session${acceptedCount > 1 ? 's' : ''} confirmed`,
                    { type: 'recurring_booking_accepted', count: acceptedCount }
                  );
                  console.log('[push] ✅ Recurring push sent successfully');
                }
              } catch (pushErr) {
                console.error('[push] ❌ Failed to send recurring approval push:', pushErr?.message || pushErr);
              }
            })();
          } else {
            console.log('[push] ⏭️ Skipping recurring push - same user testing');
          }
          
          return { bookingId, status, update };
        }
        
        // For non-recurring or declined bookings, use individual notifications
        let notificationData = {
          userId: parentId,
          navigationTarget: 'ParentBookings',
          navigationParams: { bookingId }
        };

        if (status === 'accepted') {
          notificationData.type = 'booking_accepted';
          notificationData.title = 'Booking Confirmed! 🎉';
          notificationData.message = `${teacherName || 'Teacher'} accepted your booking${date ? ' for ' + new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}\n\n📹 Video meeting link available in Dashboard → Upcoming Lessons`;
          
          console.log('[updateBookingStatus] 🔔 Creating notification FOR PARENT:', parentId, '(current user:', auth.currentUser.uid, ')');
          
          // Send push notification to parent (but not if it's the same user testing)
          (async () => {
            try {
              // Don't send push to yourself when testing with same device
              if (auth.currentUser.uid === parentId) {
                console.log('[push] ⏭️ Skipping push notification - same user testing');
                return;
              }
              
              const { sendExpoPushNotification } = await import('../../services/pushService');
              console.log('[push] Fetching parent push token for:', parentId);
              const userDoc = await getDoc(doc(db, 'users', parentId));
              const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
              
              if (token) {
                console.log('[push] Found token, sending push notification to parent...');
                const result = await sendExpoPushNotification(
                  token,
                  '✅ Booking confirmed!',
                  `${teacherName || 'Teacher'} accepted your booking${date ? ' for ' + new Date(date).toLocaleDateString() : ''}`,
                  { bookingId, type: 'booking_accepted', meetingUrl: update.meetingUrl }
                );
                console.log('[push] ✅ Push notification sent to parent:', result);
              } else {
                console.warn('[push] ⚠️ No push token found for parent:', parentId);
              }
            } catch (pushErr) {
              console.error('[push] ❌ Failed to send push to parent:', pushErr?.message || pushErr);
            }
          })();
        } else if (status === 'declined') {
          notificationData.type = 'booking_declined';
          notificationData.title = suggestedDate ? 'Booking - New Time Suggested' : 'Booking Declined';
          
          let message = `${teacherName || 'Teacher'} declined your booking${date ? ' for ' + new Date(date).toLocaleDateString() : ''}`;
          
          if (declineReason) {
            message += `\n\nReason: ${declineReason}`;
          }
          
          if (suggestedDate) {
            message += `\n\n📅 Suggested new time:\n${suggestedDateFormatted || new Date(suggestedDate).toLocaleString()}\n\nTap to accept or decline the new time.`;
          }
          
          notificationData.message = message;
          
          // Send push notification to parent (but not if testing with same user)
          (async () => {
            try {
              if (auth.currentUser.uid === parentId) {
                console.log('[push] ⏭️ Skipping decline push - same user testing');
                return;
              }
              
              const { sendExpoPushNotification } = await import('../../services/pushService');
              const userDoc = await getDoc(doc(db, 'users', parentId));
              const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
              
              if (token) {
                await sendExpoPushNotification(
                  token,
                  notificationData.title,
                  suggestedDate ? `New time suggested: ${new Date(suggestedDate).toLocaleDateString()}` : 'Booking declined',
                  { bookingId, type: 'booking_declined', suggestedDate, declineReason }
                );
              }
            } catch (pushErr) {
              console.error('[push] Failed to send decline notification:', pushErr);
            }
          })();
        }

        if (notificationData.type) {
          console.log('[updateBookingStatus] 🔔 Creating notification with data:', { ...notificationData, targetUser: notificationData.userId });
          console.log('[updateBookingStatus] ⚠️ If notification appears for teacher, check that parentId is correct!');
          dispatch(createNotification(notificationData));
        }
      }
      
      return { bookingId, status };
    } catch (err) {
      console.error('[updateBookingStatus] ❌ Error:', err);
      console.error('[updateBookingStatus] Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      return rejectWithValue(err.message);
    }
  }
);

// Cancel booking (teacher or parent). Sets status to cancelled_by_teacher or cancelled_by_parent
export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async ({ bookingId, reason }, { rejectWithValue, dispatch }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      const ref = doc(db, 'bookings', bookingId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('Booking not found');
      const data = snap.data();
      const { teacherId, parentId, date } = data;
      const uid = auth.currentUser.uid;
      if (uid !== teacherId && uid !== parentId) throw new Error('Not authorized to cancel this booking');
      const cancelledStatus = uid === teacherId ? 'cancelled_by_teacher' : 'cancelled_by_parent';
      const updatePayload = { status: cancelledStatus };
      if (reason) updatePayload.cancelReason = reason;
      await updateDoc(ref, updatePayload);

      // Notify other party
      const otherUserId = uid === teacherId ? parentId : teacherId;
      if (otherUserId) {
        let title = 'Varaus peruutettu';
        let message = `Varaus ${date ? new Date(date).toLocaleString('fi-FI') : ''} on peruutettu.`;
        if (reason) message += ` Syynä: ${reason}`;
        dispatch(createNotification({
          userId: otherUserId,
            type: 'booking_cancelled',
            title,
            message,
            navigationTarget: uid === teacherId ? 'ParentBookings' : 'TeacherBookings',
            navigationParams: { bookingId }
        }));
      }
      return { bookingId, status: cancelledStatus, cancelReason: reason || null };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/**
 * 🔁 Create Recurring Booking
 * Creates a master recurring booking record and generates individual bookings for future dates
 * 
 * @param {string} teacherId - Teacher's ID
 * @param {string} firstDate - ISO date string for the first booking
 * @param {string} notes - Optional notes
 * @param {string} frequency - 'weekly' or 'biweekly'
 * @param {number} numberOfWeeks - How many weeks to generate (default: 8)
 * @param {string} teacherName - Teacher's name for notifications
 */
export const createRecurringBooking = createAsyncThunk(
  'bookings/createRecurringBooking',
  async ({ teacherId, firstDate, notes, frequency = 'weekly', numberOfWeeks = 8, teacherName }, { rejectWithValue, dispatch }) => {
    try {
      console.log('[createRecurringBooking] Starting...', { teacherId, firstDate, frequency, numberOfWeeks });
      
      if (!auth?.currentUser) throw new Error('Not authenticated');
      if (!db) throw new Error('Firebase database not initialized');

      const parentId = auth.currentUser.uid;
      const startDate = new Date(firstDate);
      const dayOfWeek = startDate.getDay(); // 0-6 (Sunday-Saturday)
      const timeSlot = `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;
      
      // Create master recurring booking record
      const recurringRef = await addDoc(collection(db, 'recurringBookings'), {
        teacherId,
        parentId,
        dayOfWeek, // 0-6
        timeSlot, // "17:00"
        frequency, // "weekly" or "biweekly"
        startDate: startDate.toISOString(),
        numberOfWeeks,
        notes: notes || '',
        status: 'pending', // pending, accepted, declined
        priorityStudent: parentId, // This student has priority for this time slot
        exceptions: [], // Dates when student cannot attend
        createdAt: serverTimestamp(),
      });
      
      console.log('[createRecurringBooking] Master record created:', recurringRef.id);
      
      // Generate individual bookings
      const generatedBookings = [];
      const interval = frequency === 'weekly' ? 7 : 14; // days
      
      for (let i = 0; i < numberOfWeeks; i++) {
        const bookingDate = new Date(startDate);
        bookingDate.setDate(bookingDate.getDate() + (i * interval));
        
        // Don't create bookings in the past
        if (bookingDate < new Date()) continue;
        
        const bookingRef = await addDoc(collection(db, 'bookings'), {
          teacherId,
          parentId,
          status: 'pending',
          date: bookingDate.toISOString(),
          notes: notes || '',
          recurringBookingId: recurringRef.id, // Link to master record
          isRecurring: true,
          instanceNumber: i + 1,
          createdAt: serverTimestamp(),
        });
        
        generatedBookings.push({
          id: bookingRef.id,
          date: bookingDate.toISOString(),
          instanceNumber: i + 1,
        });
      }
      
      console.log('[createRecurringBooking] Generated', generatedBookings.length, 'bookings');
      
      // Create notification for teacher
      dispatch(createNotification({
        userId: teacherId,
        type: 'recurring_booking_request',
        title: 'New Recurring Booking Request 🔁',
        message: `You have ${generatedBookings.length} new ${frequency} booking requests starting ${startDate.toLocaleDateString()}`,
        navigationTarget: 'TeacherBookings',
        navigationParams: { recurringBookingId: recurringRef.id }
      }));
      
      // Send push notification
      (async () => {
        try {
          const { sendExpoPushNotification } = await import('../../services/pushService');
          const userDoc = await getDoc(doc(db, 'users', teacherId));
          const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
          
          if (token) {
            await sendExpoPushNotification(
              token,
              '🔁 New Recurring Booking',
              `${generatedBookings.length} ${frequency} bookings requested`,
              { recurringBookingId: recurringRef.id, type: 'recurring_booking_request' }
            );
          }
        } catch (pushErr) {
          console.error('[push] Failed to send recurring booking notification:', pushErr);
        }
      })();
      
      return {
        recurringBookingId: recurringRef.id,
        bookings: generatedBookings,
        frequency,
        numberOfWeeks,
      };
    } catch (err) {
      console.error('[createRecurringBooking] Error:', err);
      return rejectWithValue(err.message);
    }
  }
);

/**
 * 📅 Add Exception Date
 * Student marks a date when they cannot attend a recurring booking
 */
export const addExceptionDate = createAsyncThunk(
  'bookings/addExceptionDate',
  async ({ recurringBookingId, exceptionDate, reason }, { rejectWithValue, dispatch }) => {
    try {
      console.log('[addExceptionDate] Starting...');
      console.log('[addExceptionDate] User:', auth?.currentUser?.uid);
      
      if (!auth?.currentUser) throw new Error('Not authenticated');
      
      const ref = doc(db, 'recurringBookings', recurringBookingId);
      const snap = await getDoc(ref);
      
      console.log('[addExceptionDate] Doc exists:', snap.exists());
      if (!snap.exists()) throw new Error('Recurring booking not found');
      
      const data = snap.data();
      console.log('[addExceptionDate] Doc data:', {
        parentId: data.parentId,
        teacherId: data.teacherId,
        status: data.status,
        hasExceptions: !!data.exceptions
      });
      
      const exceptions = data.exceptions || [];
      
      // Add new exception
      exceptions.push({
        date: exceptionDate,
        reason: reason || '',
        addedAt: new Date().toISOString(),
      });
      
      await updateDoc(ref, { exceptions });
      
      // Find and cancel the specific booking instance
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('recurringBookingId', '==', recurringBookingId)
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      
      const exceptionDateObj = new Date(exceptionDate);
      bookingsSnap.docs.forEach(async (bookingDoc) => {
        const bookingData = bookingDoc.data();
        const bookingDateObj = new Date(bookingData.date);
        
        // Check if dates match (same day)
        if (bookingDateObj.toDateString() === exceptionDateObj.toDateString()) {
          await updateDoc(doc(db, 'bookings', bookingDoc.id), {
            status: 'cancelled_by_parent',
            cancelReason: reason || 'Cannot attend this date',
          });
          
          // Notify teacher
          console.log('[addExceptionDate] Creating notification for teacher:', data.teacherId);
          console.log('[addExceptionDate] Current user (parent):', auth?.currentUser?.uid);
          
          dispatch(createNotification({
            userId: data.teacherId,
            type: 'booking_exception',
            title: 'Student Cannot Attend',
            message: `Student cancelled recurring booking for ${exceptionDateObj.toLocaleDateString()}${reason ? ': ' + reason : ''}`,
            navigationTarget: 'TeacherBookings',
            navigationParams: { bookingId: bookingDoc.id },
            data: {
              exceptionDate: exceptionDate,
              reason: reason,
              recurringBookingId: recurringBookingId
            }
          }));
        }
      });
      
      return { recurringBookingId, exceptions };
    } catch (err) {
      console.error('[addExceptionDate] Error:', err);
      return rejectWithValue(err.message);
    }
  }
);

/**
 * ✅ Approve All Recurring Bookings
 * Teacher approves all pending bookings from a recurring series at once
 */
export const approveAllRecurringBookings = createAsyncThunk(
  'bookings/approveAllRecurringBookings',
  async ({ recurringBookingId }, { rejectWithValue, dispatch }) => {
    try {
      console.log('[approveAllRecurringBookings] Starting with recurringBookingId:', recurringBookingId);
      console.log('[approveAllRecurringBookings] Current user:', auth?.currentUser?.uid);
      
      if (!auth?.currentUser) throw new Error('Not authenticated');
      
      // Get all pending bookings for this recurring series
      console.log('[approveAllRecurringBookings] Querying bookings...');
      const q = query(
        collection(db, 'bookings'),
        where('recurringBookingId', '==', recurringBookingId),
        where('status', '==', 'pending')
      );
      
      let snap;
      try {
        snap = await getDocs(q);
        console.log('[approveAllRecurringBookings] ✅ Query successful, found', snap.docs.length, 'bookings');
      } catch (queryErr) {
        console.error('[approveAllRecurringBookings] ❌ Query failed:', queryErr.code, queryErr.message);
        throw queryErr;
      }
      
      console.log('[approveAllRecurringBookings] Found', snap.docs.length, 'pending bookings');
      
      // Approve each booking
      const approvedBookings = [];
      console.log('[approveAllRecurringBookings] Approving bookings...');
      for (const bookingDoc of snap.docs) {
        const bookingId = bookingDoc.id;
        const bookingData = bookingDoc.data();
        console.log('[approveAllRecurringBookings] Approving booking:', bookingId, 'teacherId:', bookingData.teacherId, 'currentUser:', auth.currentUser.uid);
        
        const meetingUrl = `https://meet.jit.si/PTA-${bookingId}`;
        
        try {
          await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'accepted',
            meetingProvider: 'jitsi',
            meetingUrl,
          });
          console.log('[approveAllRecurringBookings] ✅ Approved booking:', bookingId);
        } catch (updateErr) {
          console.error('[approveAllRecurringBookings] ❌ Failed to approve booking:', bookingId, updateErr);
          throw updateErr;
        }
        
        approvedBookings.push({
          id: bookingId,
          ...bookingData,
          status: 'accepted',
          meetingUrl,
        });
      }
      
      // Get recurring booking details for notification
      console.log('[approveAllRecurringBookings] Getting recurring booking details...');
      let recurringDoc;
      try {
        recurringDoc = await getDoc(doc(db, 'recurringBookings', recurringBookingId));
        console.log('[approveAllRecurringBookings] ✅ RecurringBookings read successful');
      } catch (recurringErr) {
        console.error('[approveAllRecurringBookings] ❌ RecurringBookings read failed:', recurringErr.code, recurringErr.message);
        throw recurringErr;
      }
      
      if (!recurringDoc.exists()) {
        throw new Error('Recurring booking not found');
      }
      const recurringData = recurringDoc.data();
      console.log('[approveAllRecurringBookings] Recurring data:', recurringData);
      
      // Notify parent
      if (recurringData?.parentId) {
        dispatch(createNotification({
          userId: recurringData.parentId,
          type: 'recurring_approved',
          title: 'All Bookings Approved! 🎉',
          message: `Your ${recurringData.frequency} bookings (${approvedBookings.length} sessions) have been approved!`,
          navigationTarget: 'ParentBookings',
        }));
        
        // Send push notification
        (async () => {
          try {
            const { sendExpoPushNotification } = await import('../../services/pushService');
            const userDoc = await getDoc(doc(db, 'users', recurringData.parentId));
            const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
            
            if (token) {
              await sendExpoPushNotification(
                token,
                '✅ Bookings Approved!',
                `${approvedBookings.length} ${recurringData.frequency} sessions confirmed`,
                { type: 'recurring_approved' }
              );
            }
          } catch (pushErr) {
            console.error('[push] Failed to send approval notification:', pushErr);
          }
        })();
      }
      
      return { recurringBookingId, approvedBookings };
    } catch (err) {
      console.error('[approveAllRecurringBookings] Error:', err);
      return rejectWithValue(err.message);
    }
  }
);

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearBookings: (state) => {
      console.log('🧹 [bookingsSlice] Clearing all bookings data');
      state.myBookings = [];
      state.recurringBookings = [];
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.myBookings.push(action.payload);
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchParentBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParentBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.myBookings = action.payload;
      })
      .addCase(fetchParentBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTeacherBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeacherBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.myBookings = action.payload;
      })
      .addCase(fetchTeacherBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateBookingStatus.fulfilled, (state, action) => {
        const { bookingId, status } = action.payload;
        const idx = state.myBookings.findIndex(b => b.id === bookingId);
        if (idx !== -1) state.myBookings[idx].status = status;
      });
    builder.addCase(cancelBooking.fulfilled, (state, action) => {
      const { bookingId, status, cancelReason } = action.payload;
      const idx = state.myBookings.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        state.myBookings[idx].status = status;
        if (cancelReason) state.myBookings[idx].cancelReason = cancelReason;
      }
    });
    // Recurring bookings reducers
    builder
      .addCase(createRecurringBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRecurringBooking.fulfilled, (state, action) => {
        state.loading = false;
        // Add generated bookings to myBookings
        // Note: bookings array only has { id, date, instanceNumber }, need to enrich if displaying
      })
      .addCase(createRecurringBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(approveAllRecurringBookings.fulfilled, (state, action) => {
        const { approvedBookings } = action.payload;
        // Update all approved bookings in state
        approvedBookings.forEach(approved => {
          const idx = state.myBookings.findIndex(b => b.id === approved.id);
          if (idx !== -1) {
            state.myBookings[idx] = { ...state.myBookings[idx], ...approved };
          }
        });
      });
  }
});

export const selectBookings = (state) => state.bookings.myBookings;
export const selectBookingsLoading = (state) => state.bookings.loading;
export const selectBookingsError = (state) => state.bookings.error;

export default bookingsSlice.reducer;
