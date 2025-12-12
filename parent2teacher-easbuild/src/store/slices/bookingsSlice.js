import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  onSnapshot,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import { createNotification } from './notificationsSlice';
import { toLocalISOString } from '../../utils/dateUtils';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';

/**
 * Helper function to find and update availability slot in hierarchical structure
 * Uses collectionGroup query to locate slot across all user role subcollections
 * @param {string} slotId - Format: "teacherId#startISO"
 * @param {object} updates - Fields to update
 */
async function updateAvailabilitySlot(slotId, updates) {
  if (!slotId) return;
  try {
    // Parse slotId: format is "teacherId#startISO"
    const [teacherId, startISO] = slotId.split('#');
    if (!teacherId || !startISO) {
      console.warn('Invalid slotId format:', slotId);
      return;
    }
    
    // Find slot using collectionGroup query by teacherId and start time
    const slotQuery = query(
      collectionGroup(db, 'availabilitySlots'),
      where('teacherId', '==', teacherId),
      where('start', '==', startISO)
    );
    const slotSnap = await getDocs(slotQuery);
    
    if (!slotSnap.empty) {
      const slotRef = slotSnap.docs[0].ref;
      await updateDoc(slotRef, { ...updates, updatedAt: serverTimestamp() });
    } else {
      console.warn('Slot not found for slotId:', slotId);
    }
  } catch (err) {
    console.warn('Failed to update availability slot:', err);
  }
}

const initialState = {
  myBookings: [],
  recurringBookings: [], // Master recurring booking records
  loading: false,
  error: null,
};

export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async ({ teacherId, date, notes, teacherName, teacherRole, clientRole }, { rejectWithValue, dispatch, getState }) => {
    try {
      if (!auth?.currentUser) {
        throw new Error('Not authenticated');
      }
      if (!db) {
        throw new Error('Firebase database not initialized');
      }

      const parentId = auth.currentUser.uid;
      
      // Get user roles from state if not provided
      const state = getState?.();
      const userRole = clientRole || state?.auth?.user?.role || state?.auth?.user?.userType || 'parent';
      const providerRole = teacherRole || 'teacher';
      const parentName = state?.auth?.user?.name || state?.auth?.user?.displayName || 'Parent';
      
      // Generate unique booking ID
      const bookingId = doc(collection(db, 'temp')).id;
      
      // Get role collection info for both teacher and parent
      const teacherRoleInfo = getRoleCollectionInfo(providerRole);
      const parentRoleInfo = getRoleCollectionInfo(userRole);
      
      // Extract time from date
      const bookingDate = new Date(date);
      const timeSlot = `${bookingDate.getHours()}:${String(bookingDate.getMinutes()).padStart(2, '0')}`;
      
      // Write payload for Firestore (can include serverTimestamp)
      const payloadToDB = {
        bookingId, // Add explicit bookingId field for easier querying
        teacherId,
        parentId,
        teacherName: teacherName || 'Teacher',
        parentName: parentName,
        teacherRole: providerRole, // Add role information for easier path reconstruction
        clientRole: userRole,      // Add role information for easier path reconstruction
        // Firestore rules require 'pending' on create
        status: 'pending',
        date: typeof date === 'string' ? date : toLocalISOString(new Date(date)),
        timeSlot: timeSlot,
        notes: notes || '',
        createdAt: serverTimestamp(),
      };
      
      // Save booking to both users' serviceTypes collections for easy querying
      // Teacher's bookings: serviceTypes/{serviceType}/{collection}/{teacherId}/bookings/{bookingId}
      const teacherBookingRef = doc(
        db, 
        'serviceTypes', 
        teacherRoleInfo.serviceType, 
        teacherRoleInfo.collection, 
        teacherId, 
        'bookings', 
        bookingId
      );
      await setDoc(teacherBookingRef, { ...payloadToDB, role: 'provider' });
      
      // Parent's bookings: serviceTypes/{serviceType}/{collection}/{parentId}/bookings/{bookingId}
      const parentBookingRef = doc(
        db, 
        'serviceTypes', 
        parentRoleInfo.serviceType, 
        parentRoleInfo.collection, 
        parentId, 
        'bookings', 
        bookingId
      );
      await setDoc(parentBookingRef, { ...payloadToDB, role: 'client' });

      // Read back (or compute) a serializable createdAt for Redux state
      let createdAtISO = new Date().toISOString();
      try {
        const snap = await getDoc(teacherBookingRef);
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
        navigationParams: { bookingId: bookingId }
      }));

      return { id: bookingId, ...payloadToDB, createdAt: createdAtISO };
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
      
      // Use collectionGroup to query bookings across all serviceTypes structures
      const q = query(
        collectionGroup(db, 'bookings'),
        where('parentId', '==', uid)
      );
      const snap = await getDocs(q);
      console.log(`📚 Fetched ${snap.docs.length} parent bookings from serviceTypes structure (may include duplicates)`);
      
      // Deduplicate by booking ID (same booking exists under both teacher and parent paths)
      const uniqueBookingsMap = new Map();
      snap.docs.forEach(doc => {
        if (!uniqueBookingsMap.has(doc.id)) {
          uniqueBookingsMap.set(doc.id, doc);
        }
      });
      const uniqueDocs = Array.from(uniqueBookingsMap.values());
      
      const bookings = uniqueDocs.map(d => {
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
      
      // Remove duplicates - same booking ID appears in both teacher's and student's collections
      const uniqueBookings = [];
      const seenIds = new Set();
      
      bookings.forEach(booking => {
        if (!seenIds.has(booking.id)) {
          seenIds.add(booking.id);
          uniqueBookings.push(booking);
        }
      });
      
      return uniqueBookings;
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
      let userRole = null;
      
      if (!uid) {
        const state = getState?.();
        uid = state?.auth?.user?.uid;
        userRole = state?.auth?.user?.role || state?.auth?.user?.userType;
      } else {
        const state = getState?.();
        userRole = state?.auth?.user?.role || state?.auth?.user?.userType;
      }

      if (!uid) {
        await new Promise(resolve => setTimeout(resolve, 150));
        uid = auth?.currentUser?.uid || getState?.()?.auth?.user?.uid;
        const state = getState?.();
        userRole = state?.auth?.user?.role || state?.auth?.user?.userType;
      }

      if (!uid) {
        return rejectWithValue('Not authenticated');
      }
      
      console.log('🔍 fetchTeacherBookings: Searching for bookings where teacherId ==', uid);
      console.log('🔍 User role:', userRole);
      // Use collectionGroup to query all bookings subcollections
      // This finds bookings from: serviceTypes/{serviceType}/{collection}/{userId}/bookings/{bookingId}
      const q = query(
        collectionGroup(db, 'bookings'),
        where('teacherId', '==', uid)
      );
      
      const snap = await getDocs(q);
      const docs = Array.isArray(snap?.docs) ? snap.docs : []
      const uniqueBookingsMap = new Map();
      docs.forEach(doc => {
        if (!uniqueBookingsMap.has(doc.id)) {
          uniqueBookingsMap.set(doc.id, doc);
        }
      });
      const uniqueDocs = Array.from(uniqueBookingsMap.values());
      
      const bookings = uniqueDocs.map(d => {
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
      
      // Remove duplicates - same booking ID appears in both teacher's and student's collections
      const uniqueBookings = [];
      const seenIds = new Set();
      
      bookings.forEach(booking => {
        if (!seenIds.has(booking.id)) {
          seenIds.add(booking.id);
          uniqueBookings.push(booking);
        }
      });
      
      console.log(`📊 After deduplication: ${uniqueBookings.length} unique bookings (removed ${bookings.length - uniqueBookings.length} duplicates)`);
      
      return uniqueBookings;
    } catch (err) {
      console.error('❌ Error fetching teacher bookings:', err);
      return rejectWithValue(err.message);
    }
  }
);

export const updateBookingStatus = createAsyncThunk(
  'bookings/updateBookingStatus',
  async ({ bookingId, status, declineReason, suggestedDate, suggestedDateFormatted, cancelledBy }, { rejectWithValue }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      
      const currentUserId = auth.currentUser.uid;
      
      // Find ALL instances of this booking using collectionGroup query
      // Filter by current user (must be either teacher or parent) for security rules
      const bookingQueryAsTeacher = query(
        collectionGroup(db, 'bookings'),
        where('bookingId', '==', bookingId),
        where('teacherId', '==', currentUserId)
      );
      
      const bookingQueryAsParent = query(
        collectionGroup(db, 'bookings'),
        where('bookingId', '==', bookingId),
        where('parentId', '==', currentUserId)
      );
      
      let bookingSnap;
      try {
        // Try as teacher first
        bookingSnap = await getDocs(bookingQueryAsTeacher);
        if (bookingSnap.empty) {
          // Try as parent
          bookingSnap = await getDocs(bookingQueryAsParent);
        }
      } catch (err) {
        console.error('❌ Error querying bookings:', err);
        throw new Error('Failed to find booking: ' + err.message);
      }
      
      if (bookingSnap.empty) {
        console.error('❌ Booking not found:', bookingId);
        throw new Error('Booking not found');
      }
      
      // Get the first (and should be only) matching document
      const bookingDoc = bookingSnap.docs[0];
      const bookingData = bookingDoc.data();
      const bookingRef = bookingDoc.ref;
      
      console.log('📍 Found booking at path:', bookingRef.path);
      console.log('📋 Current booking data:', { status: bookingData.status, teacherId: bookingData.teacherId, parentId: bookingData.parentId });
      
      const isRecurringBooking = bookingData?.isRecurring && bookingData?.recurringBookingId;
      
      // When accepting, create a Jitsi Meet link (free, no API needed)
      const update = { status };
      if (status === 'accepted') {
        // Generate unique room name from bookingId for privacy
        const roomName = `Session-${bookingId}`;
        const meetingUrl = `https://meet.jit.si/${roomName}`;
        update.meetingProvider = 'jitsi';
        update.meetingUrl = meetingUrl;
        console.log('🎥 Adding meeting URL:', meetingUrl);
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
      
      // Update ALL instances of this booking (both in teacher's and student's collections)
      // We need to update both copies, but security rules only allow reading our own copy
      // Solution: Construct document paths directly using stored role information
      
      console.log(`📝 Updating booking instances for both participants`);
      
      // We already have one document reference from our query
      const docsToUpdate = [bookingRef];
      
      // Construct the other participant's document path
      // Format: serviceTypes/{serviceType}/{collection}/{userId}/bookings/{bookingId}
      try {
        if (bookingData.teacherId === currentUserId) {
          // Current user is teacher, need to update parent's copy
          const parentRole = bookingData.clientRole || 'parent';
          const parentRoleInfo = getRoleCollectionInfo(parentRole);
          const parentBookingRef = doc(
            db,
            'serviceTypes',
            parentRoleInfo.serviceType,
            parentRoleInfo.collection,
            bookingData.parentId,
            'bookings',
            bookingId
          );
          docsToUpdate.push(parentBookingRef);
          console.log('  → Will update parent copy at:', parentBookingRef.path);
        } else {
          // Current user is parent, need to update teacher's copy
          const teacherRole = bookingData.teacherRole || 'teacher';
          const teacherRoleInfo = getRoleCollectionInfo(teacherRole);
          const teacherBookingRef = doc(
            db,
            'serviceTypes',
            teacherRoleInfo.serviceType,
            teacherRoleInfo.collection,
            bookingData.teacherId,
            'bookings',
            bookingId
          );
          docsToUpdate.push(teacherBookingRef);
          console.log('  → Will update teacher copy at:', teacherBookingRef.path);
        }
      } catch (err) {
        console.warn('⚠️ Could not construct other participant path:', err);
        // Continue with just the one document we found
      }
      
      // Update all instances
      const updatePromises = docsToUpdate.map(docRef => {
        console.log('  → Updating:', docRef.path);
        return updateDoc(docRef, update);
      });
      
      await Promise.all(updatePromises);
      
      console.log('✅ All booking instances updated');
      
      // Update corresponding availability slot status
      if (bookingData.slotId) {
        if (status === 'accepted') {
          await updateAvailabilitySlot(bookingData.slotId, { status: 'booked' });
        } else if (status === 'declined' || status === 'cancelled') {
          await updateAvailabilitySlot(bookingData.slotId, { 
            status: 'available', 
            parentId: null, 
            bookingId: null 
          });
        }
      }
      
      // Create notification for parent when status changes
      if (parentId) {
        // For recurring bookings, create a grouped notification
        if (isRecurringBooking && status === 'accepted' && bookingData.recurringBookingId) {
          let acceptedCount = 1; // Default to 1 if query fails
          
          try {
            // Check how many bookings in this series are now accepted
            // Use collectionGroup to search across serviceTypes structure
            const recurringQuery = query(
              collectionGroup(db, 'bookings'),
              where('recurringBookingId', '==', bookingData.recurringBookingId),
              where('teacherId', '==', auth.currentUser.uid),
              where('status', '==', 'accepted')
            );
            const acceptedSnap = await getDocs(recurringQuery);
            acceptedCount = acceptedSnap.docs.length;
          } catch (queryErr) {
            console.error('❌ Error querying recurring bookings:', queryErr);
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
        
        console.log('🎯 Notification target check:');
        console.log('   - targetParentId:', targetParentId);
        console.log('   - parentId param:', parentId);
        console.log('   - bookingData.parentId:', bookingData.parentId);
        console.log('   - auth.currentUser.uid:', auth.currentUser.uid);
        console.log('   - currentUserId:', currentUserId);
        console.log('   - Status:', status);
        
        if (!targetParentId) {
          console.warn('⚠️ No targetParentId found, skipping notification');
          return { bookingId, status };
        }
        
        if (targetParentId === auth.currentUser.uid) {
          console.warn('⚠️ WARNING: targetParentId matches current user! This means notification will go to the ACTOR (teacher) instead of the RECIPIENT (parent)');
          console.warn('   This happens when testing with same account as both teacher and parent');
        }
        
        let notificationData = {
          userId: targetParentId,
          navigationTarget: 'Bookings',
          navigationParams: { bookingId }
        };
        
        console.log('📢 Will create notification for userId:', targetParentId);

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
          console.log('📨 Dispatching createNotification with data:', {
            type: notificationData.type,
            userId: notificationData.userId,
            title: notificationData.title,
            currentUser: auth.currentUser.uid
          });
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
      console.log('🔴 cancelBooking called with:', { bookingId, reason });
      
      if (!auth?.currentUser) {
        throw new Error('Not authenticated');
      }
      
      console.log('🔴 Current user:', auth.currentUser.uid);
      
      // Find booking using collectionGroup - try as teacher first, then as parent
      const bookingQueryAsTeacher = query(
        collectionGroup(db, 'bookings'),
        where('bookingId', '==', bookingId),
        where('teacherId', '==', auth.currentUser.uid)
      );
      
      const bookingQueryAsParent = query(
        collectionGroup(db, 'bookings'),
        where('bookingId', '==', bookingId),
        where('parentId', '==', auth.currentUser.uid)
      );
      
      let querySnapshot;
      try {
        // Try as teacher first
        querySnapshot = await getDocs(bookingQueryAsTeacher);
        console.log('🔴 Query as teacher found:', querySnapshot.size);
        
        if (querySnapshot.empty) {
          // Try as parent
          querySnapshot = await getDocs(bookingQueryAsParent);
          console.log('🔴 Query as parent found:', querySnapshot.size);
        }
      } catch (err) {
        console.error('🔴 Error querying bookings:', err);
        throw new Error('Failed to find booking: ' + err.message);
      }
      
      console.log('🔴 Found bookings:', querySnapshot.size);
      
      if (querySnapshot.empty) {
        throw new Error('Booking not found');
      }
      
      const bookingDoc = querySnapshot.docs[0];
      const data = bookingDoc.data();
      console.log('🔴 Booking data:', data);
      
      const { teacherId, parentId, date, teacherRole, clientRole } = data;
      const uid = auth.currentUser.uid;
      
      if (uid !== teacherId && uid !== parentId) {
        throw new Error('Not authorized to cancel this booking');
      }
      
      const cancelledStatus = uid === teacherId ? 'cancelled_by_teacher' : 'cancelled_by_parent';
      const updatePayload = { status: cancelledStatus };
      if (reason) updatePayload.cancelReason = reason;
      
      console.log('🔴 Update payload:', updatePayload);
      
      // Update both teacher and student copies
      const teacherRoleInfo = getRoleCollectionInfo(teacherRole);
      const clientRoleInfo = getRoleCollectionInfo(clientRole);
      
      console.log('🔴 Teacher role info:', teacherRoleInfo);
      console.log('🔴 Client role info:', clientRoleInfo);
      
      const teacherDocRef = doc(db, 'serviceTypes', teacherRoleInfo.serviceType, teacherRoleInfo.collection, teacherId, 'bookings', bookingId);
      const clientDocRef = doc(db, 'serviceTypes', clientRoleInfo.serviceType, clientRoleInfo.collection, parentId, 'bookings', bookingId);
      
      console.log('🔴 Teacher path:', teacherDocRef.path);
      console.log('🔴 Client path:', clientDocRef.path);
      
      // Update teacher's copy
      try {
        const teacherDocSnap = await getDoc(teacherDocRef);
        if (teacherDocSnap.exists()) {
          await updateDoc(teacherDocRef, updatePayload);
          console.log('🔴 Teacher doc updated');
        } else {
          console.log('🔴 Teacher doc does not exist, skipping');
        }
      } catch (teacherUpdateErr) {
        console.error('🔴 Failed to update teacher doc:', teacherUpdateErr);
        // Don't throw - try to update client doc anyway
      }
      
      // Update client's copy
      try {
        const clientDocSnap = await getDoc(clientDocRef);
        if (clientDocSnap.exists()) {
          await updateDoc(clientDocRef, updatePayload);
          console.log('🔴 Client doc updated');
        } else {
          console.log('🔴 Client doc does not exist, skipping');
        }
      } catch (clientUpdateErr) {
        console.error('🔴 Failed to update client doc:', clientUpdateErr);
        // Don't throw - at least one copy should be updated
      }

      // Free up the availability slot if it exists
      if (data.slotId) {
        await updateAvailabilitySlot(data.slotId, { 
          status: 'available', 
          parentId: null, 
          bookingId: null 
        });
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
  async ({ teacherId, firstDate, notes, frequency = 'weekly', numberOfWeeks = 8, teacherName, teacherRole, clientRole }, { rejectWithValue, dispatch, getState }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      if (!db) throw new Error('Firebase database not initialized');

      const parentId = auth.currentUser.uid;
      const startDate = new Date(firstDate);
      const dayOfWeek = startDate.getDay(); // 0-6 (Sunday-Saturday)
      const timeSlot = `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;
      
      // Get user roles from state if not provided
      const state = getState?.();
      const userRole = clientRole || state?.auth?.user?.role || state?.auth?.user?.userType || 'parent';
      const providerRole = teacherRole || 'teacher';
      const parentName = state?.auth?.user?.name || state?.auth?.user?.displayName || 'Parent';
      
      // Get role collection info for both teacher and parent
      const teacherRoleInfo = getRoleCollectionInfo(providerRole);
      const parentRoleInfo = getRoleCollectionInfo(userRole);
      
      // Create master recurring booking record under parent's document
      // Path: serviceTypes/{serviceType}/{collection}/{parentId}/recurringBookings/{id}
      const recurringRef = await addDoc(
        collection(
          db,
          'serviceTypes',
          parentRoleInfo.serviceType,
          parentRoleInfo.collection,
          parentId,
          'recurringBookings'
        ),
        {
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
        }
      );
      
      // Generate individual bookings
      const generatedBookings = [];
      const skippedBookings = [];
      const interval = frequency === 'weekly' ? 7 : 14; // days
      
      // Get teacher's available slots to verify each booking date
      const availableSlotsQuery = query(
        collectionGroup(db, 'availabilitySlots'),
        where('teacherId', '==', teacherId),
        where('status', '==', 'available')
      );
      const availableSlotsSnap = await getDocs(availableSlotsQuery);
      const availableSlots = availableSlotsSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
      
      console.log('🔍 Recurring booking: Found', availableSlots.length, 'available slots for teacher', teacherId);
      if (availableSlots.length > 0) {
        console.log('📅 First available slot:', {
          start: availableSlots[0].start,
          end: availableSlots[0].end,
          status: availableSlots[0].status
        });
      }
      console.log('📆 Looking for slots starting from:', startDate.toISOString());
      
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
        
        // Generate unique booking ID
        const bookingId = doc(collection(db, 'temp')).id;
        
        // Extract time from booking date
        const bookingTimeSlot = `${bookingDate.getHours()}:${String(bookingDate.getMinutes()).padStart(2, '0')}`;
        
        // Create booking data
        const bookingData = {
          bookingId, // Add explicit bookingId field for easier querying
          teacherId,
          parentId,
          teacherName: teacherName || 'Teacher',
          parentName: parentName,
          teacherRole: providerRole, // Add role information for easier path reconstruction
          clientRole: userRole,      // Add role information for easier path reconstruction
          status: 'pending',
          date: bookingDate.toISOString(),
          timeSlot: bookingTimeSlot,
          start: matchingSlot.start,
          end: matchingSlot.end,
          slotId: matchingSlot.id,
          notes: notes || '',
          recurringBookingId: recurringRef.id, // Link to master record
          isRecurring: true,
          instanceNumber: i + 1,
          createdAt: serverTimestamp(),
        };
        
        // Save booking to both users' serviceTypes collections for easy querying
        // Teacher's bookings: serviceTypes/{serviceType}/{collection}/{teacherId}/bookings/{bookingId}
        const teacherBookingRef = doc(
          db, 
          'serviceTypes', 
          teacherRoleInfo.serviceType, 
          teacherRoleInfo.collection, 
          teacherId, 
          'bookings', 
          bookingId
        );
        await setDoc(teacherBookingRef, { ...bookingData, role: 'provider' });
        
        // Parent's bookings: serviceTypes/{serviceType}/{collection}/{parentId}/bookings/{bookingId}
        const parentBookingRef = doc(
          db, 
          'serviceTypes', 
          parentRoleInfo.serviceType, 
          parentRoleInfo.collection, 
          parentId, 
          'bookings', 
          bookingId
        );
        await setDoc(parentBookingRef, { ...bookingData, role: 'client' });
        
        // Update the slot to mark it as booked (pending approval)
        await updateDoc(matchingSlot.ref, {
          status: 'pending', // Mark as pending (not available for others)
          parentId: parentId,
          bookingId: bookingId,
          updatedAt: serverTimestamp(),
        });
        
        // Remove from available slots array so subsequent iterations don't try to book the same slot
        const slotIndex = availableSlots.findIndex(s => s.id === matchingSlot.id);
        if (slotIndex > -1) {
          availableSlots.splice(slotIndex, 1);
        }
        
        generatedBookings.push({
          id: bookingId,
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
  async ({ recurringBookingId, exceptionDate, reason, parentId, parentRole = 'parent' }, { rejectWithValue, dispatch }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      
      // Get parent's role info to construct correct path
      const parentRoleInfo = getRoleCollectionInfo(parentRole);
      
      const ref = doc(
        db,
        'serviceTypes',
        parentRoleInfo.serviceType,
        parentRoleInfo.collection,
        parentId,
        'recurringBookings',
        recurringBookingId
      );
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
        collectionGroup(db, 'bookings'),
        where('recurringBookingId', '==', recurringBookingId)
      );
      const bookingsSnap = await getDocs(bookingsQuery);
      
      const exceptionDateObj = new Date(exceptionDate);
      bookingsSnap.docs.forEach(async (bookingDoc) => {
        const bookingData = bookingDoc.data();
        const bookingDateObj = new Date(bookingData.date);
        
        // Check if dates match (same day)
        if (bookingDateObj.toDateString() === exceptionDateObj.toDateString()) {
          await updateDoc(bookingDoc.ref, {
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
      // Query returns bookings from both teacher and parent documents
      const q = query(
        collectionGroup(db, 'bookings'),
        where('recurringBookingId', '==', recurringBookingId),
        where('status', '==', 'pending')
      );
      
      let snap;
      try {
        snap = await getDocs(q);
      } catch (queryErr) {
        throw queryErr;
      }
      
      console.log('📋 Found', snap.docs.length, 'booking documents (includes teacher and parent copies)');
      
      // Group bookings by bookingId to avoid duplicates
      // Each booking exists in both teacher's and parent's documents
      const bookingsByIdMap = new Map();
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (!bookingsByIdMap.has(data.bookingId)) {
          bookingsByIdMap.set(data.bookingId, []);
        }
        bookingsByIdMap.get(data.bookingId).push({ doc, data });
      });
      
      console.log('📊 Unique bookings to approve:', bookingsByIdMap.size);
      
      // Approve each booking (update both teacher and parent copies)
      const approvedBookings = [];
      const failedBookings = [];
      const bookings = Array.from(bookingsByIdMap.values());
      
      for (const bookingCopies of bookings) {
        const bookingId = bookingCopies[0].data.bookingId;
        const bookingData = bookingCopies[0].data;
        
        console.log('📝 Approving booking:', bookingId, '(', bookingCopies.length, 'copies)');
        
        const meetingUrl = `https://meet.jit.si/PTA-${bookingId}`;
        
        try {
          // Update ALL copies of this booking (teacher's and parent's)
          for (const { doc: bookingDoc } of bookingCopies) {
            console.log('  ↳ Updating copy at:', bookingDoc.ref.path);
            await updateDoc(bookingDoc.ref, {
              status: 'accepted',
              meetingProvider: 'jitsi',
              meetingUrl,
            });
          }
          
          console.log('✅ All copies updated for booking:', bookingId);
          
          // Update corresponding availability slot to 'booked' status
          if (bookingData.slotId) {
            await updateAvailabilitySlot(bookingData.slotId, { status: 'booked' });
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
            meetingUrl: `https://meet.jit.si/PTA-${bookingId}`,
          });
        } catch (updateErr) {
          console.error('❌ Failed to update booking:', bookingId, 'Error:', updateErr.message);
          failedBookings.push({ bookingId, error: updateErr.message });
          // Don't throw - continue with other bookings
        }
      }
      
      console.log(`✅ Successfully approved ${approvedBookings.length} bookings`);
      if (failedBookings.length > 0) {
        console.warn(`⚠️ Failed to approve ${failedBookings.length} bookings:`, failedBookings);
      }
      
      // Throw error if no bookings were approved
      if (approvedBookings.length === 0) {
        throw new Error('Failed to approve any bookings. Check console for details.');
      }
      
      // Get recurring booking details for notification
      // First, get parent ID from first booking
      if (bookings.length === 0) {
        throw new Error('No bookings found');
      }
      
      const firstBookingData = bookings[0][0].data; // Get data from first copy of first booking
      
      // Get parent role info to construct correct path
      const parentRoleInfo = getRoleCollectionInfo(firstBookingData.clientRole || 'parent');
      
      let recurringDoc;
      try {
        recurringDoc = await getDoc(
          doc(
            db,
            'serviceTypes',
            parentRoleInfo.serviceType,
            parentRoleInfo.collection,
            firstBookingData.parentId,
            'recurringBookings',
            recurringBookingId
          )
        );
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
      
      return { recurringBookingId, approvedBookings, failedBookings };
    } catch (err) {
      console.error('❌ approveAllRecurringBookings error:', err);
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
    // Query based on user role using collectionGroup to search across serviceTypes structure
    const q = isProvider 
      ? query(collectionGroup(db, 'bookings'), where('teacherId', '==', userId))
      : query(collectionGroup(db, 'bookings'), where('parentId', '==', userId));

    bookingsUnsubscribe = onSnapshot(q, 
      (snapshot) => {
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
      
      // Remove duplicates - same booking ID appears in both teacher's and student's collections
      // Keep only unique bookings by ID
      const uniqueBookings = [];
      const seenIds = new Set();
      
      bookings.forEach(booking => {
        if (!seenIds.has(booking.id)) {
          seenIds.add(booking.id);
          uniqueBookings.push(booking);
        }
      });
      
      // Update Redux state directly
      dispatch({
        type: isProvider ? 'bookings/fetchTeacherBookings/fulfilled' : 'bookings/fetchParentBookings/fulfilled',
        payload: uniqueBookings
      });
    }, 
    (error) => {
      // Listener error
      console.error('❌ Real-time listener ERROR:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      if (error.code === 'failed-precondition') {
        console.error('⚠️ FIRESTORE INDEX MISSING! Create index at:', error.message);
      }
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
