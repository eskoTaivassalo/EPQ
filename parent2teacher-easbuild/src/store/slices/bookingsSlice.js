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
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import { createNotification } from './notificationsSlice';
import { toLocalISOString } from '../../utils/dateUtils';

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
      if (!auth?.currentUser) {
        throw new Error('Not authenticated');
      }
      if (!db) {
        throw new Error('Firebase database not initialized');
      }

      // Write payload for Firestore (can include serverTimestamp)
      const payloadToDB = {
        teacherId,
        parentId: auth.currentUser.uid,
        // Firestore rules require 'pending' on create
        status: 'pending',
        date: typeof date === 'string' ? date : toLocalISOString(new Date(date)),
        notes: notes || '',
        createdAt: serverTimestamp(),
      };
      
      const ref = await addDoc(collection(db, 'bookings'), payloadToDB);

      // Read back (or compute) a serializable createdAt for Redux state
      let createdAtISO = new Date().toISOString();
      try {
        const snap = await getDoc(ref);
        const data = snap.data();
        if (data?.createdAt?.toDate) {
          createdAtISO = data.createdAt.toDate().toISOString();
        }
      } catch (err) {
        // Failed to read back document
      }

      // Create notification for teacher
      dispatch(createNotification({
        userId: teacherId,
        type: 'booking_request',
        title: 'Uusi ajanvaraus',
        message: `Sinulle on tehty uusi ajanvaraus ${new Date(date).toLocaleString('fi-FI')}`,
        navigationTarget: 'TeacherBookings',
        navigationParams: { bookingId: ref.id }
      }));

      return { id: ref.id, ...payloadToDB, createdAt: createdAtISO };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchParentBookings = createAsyncThunk(
  'bookings/fetchParentBookings',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Prefer Firebase auth, but fall back to Redux user if needed
      let uid = auth?.currentUser?.uid;
      if (!uid) {
        const state = getState?.();
        uid = state?.auth?.user?.uid;
      }

      // Small retry window to allow auth hydration
      if (!uid) {
        await new Promise(resolve => setTimeout(resolve, 150));
        uid = auth?.currentUser?.uid || getState?.()?.auth?.user?.uid;
      }

      if (!uid) {
        return rejectWithValue('Not authenticated');
      }
      
      const q = query(collection(db, 'bookings'), where('parentId', '==', uid));
      const snap = await getDocs(q);
      
      const bookings = snap.docs.map(d => {
        const data = d.data();
        const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;
        
        // Validate date field
        let validDate = data.date;
        if (validDate) {
          try {
            const testDate = new Date(validDate);
            if (isNaN(testDate.getTime())) {
              validDate = null;
            }
          } catch (e) {
            validDate = null;
          }
        }
        
        return { id: d.id, ...data, createdAt, date: validDate };
      }).filter(b => b.date); // Only include bookings with valid dates
      
      return bookings;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchTeacherBookings = createAsyncThunk(
  'bookings/fetchTeacherBookings',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Prefer Firebase auth, but fall back to Redux user if needed
      let uid = auth?.currentUser?.uid;
      if (!uid) {
        const state = getState?.();
        uid = state?.auth?.user?.uid;
      }

      if (!uid) {
        await new Promise(resolve => setTimeout(resolve, 150));
        uid = auth?.currentUser?.uid || getState?.()?.auth?.user?.uid;
      }

      if (!uid) {
        return rejectWithValue('Not authenticated');
      }
      
      const q = query(collection(db, 'bookings'), where('teacherId', '==', uid));
      const snap = await getDocs(q);
      const docs = Array.isArray(snap?.docs) ? snap.docs : [];
      const bookings = docs.map(d => {
        const data = d.data();
        const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;
        
        // Validate date field
        let validDate = data.date;
        if (validDate) {
          try {
            const testDate = new Date(validDate);
            if (isNaN(testDate.getTime())) {
              validDate = null;
            }
          } catch (e) {
            validDate = null;
          }
        }
        
        return { id: d.id, ...data, createdAt, date: validDate };
      }).filter(b => b.date); // Only include bookings with valid dates
      return bookings;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'bookings/updateBookingStatus',
  async ({ bookingId, status, parentId, teacherName, date, declineReason, suggestedDate, suggestedDateFormatted, cancelledBy }, { rejectWithValue, dispatch }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      const ref = doc(db, 'bookings', bookingId);
      
      // Check if this is a recurring booking BEFORE updating
      const bookingSnap = await getDoc(ref);
      if (!bookingSnap.exists()) {
        throw new Error('Booking not found');
      }
      const bookingData = bookingSnap.data();
      const isRecurringBooking = bookingData?.isRecurring && bookingData?.recurringBookingId;
      
      // When accepting, create a Jitsi Meet link (free, no API needed)
      const update = { status };
      if (status === 'accepted') {
        // Generate unique room name from bookingId for privacy
        const roomName = `Session-${bookingId}`;
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
      
      // When cancelling, save who cancelled
      if (status === 'cancelled' && cancelledBy) {
        update.cancelledBy = cancelledBy;
      }
      
      await updateDoc(ref, update);
      
      // Update corresponding availability slot status
      if (bookingData.slotId) {
        try {
          if (status === 'accepted') {
            await updateDoc(doc(db, 'availabilitySlots', bookingData.slotId), {
              status: 'booked',
              updatedAt: serverTimestamp(),
            });
          } else if (status === 'declined' || status === 'cancelled') {
            // Free up the slot when booking is declined or cancelled
            await updateDoc(doc(db, 'availabilitySlots', bookingData.slotId), {
              status: 'available',
              parentId: null,
              bookingId: null,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (slotErr) {
          // Failed to update slot - continue anyway
        }
      }
      
      // Create notification for parent when status changes
      if (parentId) {
        // For recurring bookings, create a grouped notification
        if (isRecurringBooking && status === 'accepted' && bookingData.recurringBookingId) {
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
          } catch (queryErr) {
            // Error querying recurring bookings
          }
          
          // Create a single grouped notification (Redux will handle duplicates)
          try {
            dispatch(createNotification({
              userId: parentId, // IMPORTANT: This goes to PARENT, not teacher
              type: 'recurring_booking_accepted',
              title: `${acceptedCount} Recurring Session${acceptedCount > 1 ? 's' : ''} Approved! 🎉`,
              message: `${teacherName || 'Teacher'} has approved ${acceptedCount} of your recurring booking sessions. Check your bookings for meeting links.`,
              navigationTarget: 'ParentBookings'
            }));
          } catch (notifErr) {
            // Error creating recurring notification
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
                }
              } catch (pushErr) {
                // Failed to send push
              }
            })();
          }
          
          return { bookingId, status, update };
        }
        
        // For non-recurring or declined bookings, use individual notifications
        // Use parentId from booking data if not provided in params
        const targetParentId = parentId || bookingData.parentId;
        
        if (!targetParentId) {
          return { bookingId, status };
        }
        
        let notificationData = {
          userId: targetParentId,
          navigationTarget: 'Bookings',
          navigationParams: { bookingId }
        };

        if (status === 'accepted') {
          notificationData.type = 'booking_accepted';
          notificationData.title = 'Booking Confirmed! 🎉';
          notificationData.message = `${teacherName || 'Teacher'} accepted your booking${date ? ' for ' + new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}\n\n📹 Video meeting link available in Dashboard → Upcoming Sessions`;
          
          // Send push notification to parent (but not if it's the same user testing)
          (async () => {
            try {
              // Don't send push to yourself when testing with same device
              if (auth.currentUser.uid === targetParentId) {
                return;
              }
              
              const { sendExpoPushNotification } = await import('../../services/pushService');
              const userDoc = await getDoc(doc(db, 'users', targetParentId));
              const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
              
              if (token) {
                await sendExpoPushNotification(
                  token,
                  '✅ Booking confirmed!',
                  `${teacherName || 'Teacher'} accepted your booking${date ? ' for ' + new Date(date).toLocaleDateString() : ''}`,
                  { bookingId, type: 'booking_accepted', meetingUrl: update.meetingUrl }
                );
              }
            } catch (pushErr) {
              // Failed to send push
            }
          })();
        } else if (status === 'declined') {
          notificationData.type = 'booking_declined';
          notificationData.title = suggestedDate ? 'Varauksesi hylätty - Uusi aika ehdotettu' : 'Varauksesi hylätty';
          
          let message = `${teacherName || 'Opettaja'} ei voinut hyväksyä varaustasi${date ? ' ajalle ' + new Date(date).toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}`;
          
          if (declineReason) {
            message += `\n\nSyy: ${declineReason}`;
          }
          
          if (suggestedDate) {
            message += `\n\n📅 Opettaja ehdottaa uutta aikaa:\n${suggestedDateFormatted || new Date(suggestedDate).toLocaleString('fi-FI')}\n\nNapauta tästä hyväksyäksesi tai hylätäksesi uuden ajan.`;
          } else {
            message += `\n\nVoit varata uuden ajan opettajan kalenterista.`;
          }
          
          notificationData.message = message;
          // Include teacherId in navigationParams so parent can rebook easily
          notificationData.navigationParams.teacherId = bookingData.teacherId;
          
          // Send push notification to parent (but not if testing with same user)
          (async () => {
            try {
              if (auth.currentUser.uid === targetParentId) {
                return;
              }
              
              const { sendExpoPushNotification } = await import('../../services/pushService');
              const userDoc = await getDoc(doc(db, 'users', parentId));
              const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
              
              if (token) {
                const pushMessage = declineReason 
                  ? `Syy: ${declineReason}`
                  : (suggestedDate ? `Uusi aika ehdotettu: ${new Date(suggestedDate).toLocaleDateString('fi-FI')}` : 'Varaus hylätty');
                
                await sendExpoPushNotification(
                  token,
                  notificationData.title,
                  pushMessage,
                  { bookingId, type: 'booking_declined', suggestedDate, declineReason }
                );
              }
            } catch (pushErr) {
              // Failed to send decline notification
            }
          })();
        }

        if (notificationData.type) {
          dispatch(createNotification(notificationData));
        }
      }
      
      return { bookingId, status };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Cancel booking (teacher or parent). Sets status to cancelled_by_teacher or cancelled_by_parent
export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async ({ bookingId, reason }, { rejectWithValue, dispatch }) => {
    try {
      if (!auth?.currentUser) {
        throw new Error('Not authenticated');
      }
      
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

      // Free up the availability slot if it exists
      if (data.slotId) {
        try {
          await updateDoc(doc(db, 'availabilitySlots', data.slotId), {
            status: 'available',
            parentId: null,
            bookingId: null,
            updatedAt: serverTimestamp(),
          });
        } catch (slotErr) {
          // Failed to free slot - continue anyway
        }
      }

      // Notify other party
      const otherUserId = uid === teacherId ? parentId : teacherId;
      
      if (otherUserId) {
        let title = 'Session Cancelled';
        let message = `Session ${date ? new Date(date).toLocaleString('en-US') : ''} has been cancelled.`;
        if (reason) message += ` Reason: ${reason}`;
        
        try {
          // If teacher cancelled, notify parent with rebooking option
          if (uid === teacherId) {
            const parentMessage = message + ` Would you like to book a new time?`;
            await dispatch(createNotification({
              userId: otherUserId,
              type: 'booking_cancelled',
              title,
              message: parentMessage,
              navigationTarget: 'FindProviders',
              navigationParams: { teacherId }
            })).unwrap();
            
            // Send push notification to parent
            (async () => {
              try {
                if (auth.currentUser.uid === otherUserId) {
                  return;
                }
                
                const { sendExpoPushNotification } = await import('../../services/pushService');
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
                
                if (token) {
                  await sendExpoPushNotification(
                    token,
                    '❌ Booking Cancelled',
                    `Your booking for ${date ? new Date(date).toLocaleDateString() : ''} has been cancelled. ${reason ? 'Reason: ' + reason : ''}`,
                    { bookingId, type: 'booking_cancelled', teacherId }
                  );
                }
              } catch (pushErr) {
                // Failed to send push notification
              }
            })();
          } else {
            // Student/parent cancelled - notify teacher
            await dispatch(createNotification({
              userId: otherUserId,
              type: 'booking_cancelled',
              title,
              message,
              navigationTarget: 'Bookings',
              navigationParams: { bookingId }
            })).unwrap();
            
            // Send push notification to teacher
            (async () => {
              try {
                if (auth.currentUser.uid === otherUserId) {
                  return;
                }
                
                const { sendExpoPushNotification } = await import('../../services/pushService');
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
                
                if (token) {
                  await sendExpoPushNotification(
                    token,
                    '❌ Student Cancelled',
                    `Booking for ${date ? new Date(date).toLocaleDateString() : ''} was cancelled. ${reason ? 'Reason: ' + reason : ''}`,
                    { bookingId, type: 'booking_cancelled' }
                  );
                }
              } catch (pushErr) {
                // Failed to send push notification
              }
            })();
          }
        } catch (notifErr) {
          // Don't fail the whole cancellation if notification fails
        }
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
      
      // Generate individual bookings
      const generatedBookings = [];
      const skippedBookings = [];
      const interval = frequency === 'weekly' ? 7 : 14; // days
      
      // Get teacher's available slots to verify each booking date
      const availableSlotsQuery = query(
        collection(db, 'availabilitySlots'),
        where('teacherId', '==', teacherId),
        where('status', '==', 'available')
      );
      const availableSlotsSnap = await getDocs(availableSlotsQuery);
      const availableSlots = availableSlotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      for (let i = 0; i < numberOfWeeks; i++) {
        const bookingDate = new Date(startDate);
        bookingDate.setDate(bookingDate.getDate() + (i * interval));
        
        // Don't create bookings in the past
        if (bookingDate < new Date()) {
          skippedBookings.push({ date: bookingDate.toISOString(), reason: 'past date' });
          continue;
        }
        
        // Check if teacher has an available slot for this specific date and time
        const bookingDateISO = bookingDate.toISOString();
        const matchingSlot = availableSlots.find(slot => {
          const slotStart = new Date(slot.start);
          // Match same day and approximately same time (within 30 minutes)
          const timeDiff = Math.abs(slotStart.getTime() - bookingDate.getTime());
          return timeDiff < 30 * 60 * 1000 && slot.status === 'available';
        });
        
        if (!matchingSlot) {
          skippedBookings.push({ date: bookingDateISO, reason: 'no available slot' });
          continue;
        }
        
        // Create booking and update slot status atomically
        const bookingRef = await addDoc(collection(db, 'bookings'), {
          teacherId,
          parentId,
          status: 'pending',
          date: bookingDate.toISOString(),
          start: matchingSlot.start,
          end: matchingSlot.end,
          slotId: matchingSlot.id,
          notes: notes || '',
          recurringBookingId: recurringRef.id, // Link to master record
          isRecurring: true,
          instanceNumber: i + 1,
          createdAt: serverTimestamp(),
        });
        
        // Update the slot to mark it as booked (pending approval)
        const slotRef = doc(db, 'availabilitySlots', matchingSlot.id);
        await updateDoc(slotRef, {
          status: 'pending', // Mark as pending (not available for others)
          parentId: parentId,
          bookingId: bookingRef.id,
          updatedAt: serverTimestamp(),
        });
        
        // Remove from available slots array so subsequent iterations don't try to book the same slot
        const slotIndex = availableSlots.findIndex(s => s.id === matchingSlot.id);
        if (slotIndex > -1) {
          availableSlots.splice(slotIndex, 1);
        }
        
        generatedBookings.push({
          id: bookingRef.id,
          date: bookingDate.toISOString(),
          instanceNumber: i + 1,
        });
      }
      
      // Throw error if no bookings were created (all were skipped)
      if (generatedBookings.length === 0) {
        throw new Error('No available time slots found for the requested dates. Please check teacher\'s availability.');
      }
      
      // Create notification for teacher
      const notificationMessage = skippedBookings.length > 0
        ? `You have ${generatedBookings.length} new ${frequency} booking requests (${skippedBookings.length} dates skipped due to unavailability)`
        : `You have ${generatedBookings.length} new ${frequency} booking requests starting ${startDate.toLocaleDateString()}`;
      
      dispatch(createNotification({
        userId: teacherId,
        type: 'recurring_booking_request',
        title: 'New Recurring Booking Request 🔁',
        message: notificationMessage,
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
          // Failed to send push notification
        }
      })();
      
      return {
        recurringBookingId: recurringRef.id,
        bookings: generatedBookings,
        skippedBookings,
        frequency,
        numberOfWeeks,
      };
    } catch (err) {
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
      if (!auth?.currentUser) throw new Error('Not authenticated');
      
      const ref = doc(db, 'recurringBookings', recurringBookingId);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) throw new Error('Recurring booking not found');
      
      const data = snap.data();
      
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
      if (!auth?.currentUser) throw new Error('Not authenticated');
      
      // Get all pending bookings for this recurring series
      const q = query(
        collection(db, 'bookings'),
        where('recurringBookingId', '==', recurringBookingId),
        where('status', '==', 'pending')
      );
      
      let snap;
      try {
        snap = await getDocs(q);
      } catch (queryErr) {
        throw queryErr;
      }
      
      // Approve each booking
      const approvedBookings = [];
      for (const bookingDoc of snap.docs) {
        const bookingId = bookingDoc.id;
        const bookingData = bookingDoc.data();
        
        const meetingUrl = `https://meet.jit.si/PTA-${bookingId}`;
        
        try {
          // Update booking status
          await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'accepted',
            meetingProvider: 'jitsi',
            meetingUrl,
          });
          
          // Update corresponding availability slot to 'booked' status
          if (bookingData.slotId) {
            try {
              await updateDoc(doc(db, 'availabilitySlots', bookingData.slotId), {
                status: 'booked',
                updatedAt: serverTimestamp(),
              });
            } catch (slotErr) {
              // Continue anyway - booking is more important than slot status
            }
          }
        } catch (updateErr) {
          throw updateErr;
        }
        
        // Convert Firestore Timestamps to ISO strings for Redux serialization
        const serializedData = { ...bookingData };
        if (serializedData.createdAt?.toDate) {
          serializedData.createdAt = serializedData.createdAt.toDate().toISOString();
        }
        if (serializedData.updatedAt?.toDate) {
          serializedData.updatedAt = serializedData.updatedAt.toDate().toISOString();
        }
        
        approvedBookings.push({
          id: bookingId,
          ...serializedData,
          status: 'accepted',
          meetingUrl,
        });
      }
      
      // Get recurring booking details for notification
      let recurringDoc;
      try {
        recurringDoc = await getDoc(doc(db, 'recurringBookings', recurringBookingId));
      } catch (recurringErr) {
        throw recurringErr;
      }
      
      if (!recurringDoc.exists()) {
        throw new Error('Recurring booking not found');
      }
      const recurringData = recurringDoc.data();
      
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
            // Failed to send push notification
          }
        })();
      }
      
      return { recurringBookingId, approvedBookings };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearBookings: (state) => {
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

// Real-time listener for bookings (replaces polling)
let bookingsUnsubscribe = null;

export const startBookingsListener = (userId, isProvider, dispatch) => {
  // Stop any existing listener
  if (bookingsUnsubscribe) {
    bookingsUnsubscribe();
  }

  try {
    // Query based on user role
    const q = isProvider 
      ? query(collection(db, 'bookings'), where('teacherId', '==', userId))
      : query(collection(db, 'bookings'), where('parentId', '==', userId));

    bookingsUnsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(d => {
        const data = d.data();
        const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null;
        
        // Validate date field
        let validDate = data.date;
        if (validDate) {
          try {
            const testDate = new Date(validDate);
            if (isNaN(testDate.getTime())) {
              validDate = null;
            }
          } catch (e) {
            validDate = null;
          }
        }
        
        return { id: d.id, ...data, createdAt, date: validDate };
      }).filter(b => b.date); // Only include bookings with valid dates
      
      // Update Redux state directly
      dispatch({
        type: isProvider ? 'bookings/fetchTeacherBookings/fulfilled' : 'bookings/fetchParentBookings/fulfilled',
        payload: bookings
      });
    }, (error) => {
      // Listener error
    });

    return bookingsUnsubscribe;
  } catch (error) {
    return null;
  }
};

export const stopBookingsListener = () => {
  if (bookingsUnsubscribe) {
    bookingsUnsubscribe();
    bookingsUnsubscribe = null;
  }
};

export default bookingsSlice.reducer;
