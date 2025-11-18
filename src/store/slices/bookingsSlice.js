import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';
import { createNotification } from './notificationsSlice';

const initialState = {
  myBookings: [],
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
  async ({ bookingId, status, parentId, teacherName, date }, { rejectWithValue, dispatch }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      const ref = doc(db, 'bookings', bookingId);
      // When accepting, attach a meeting link (Jitsi) if not present
      const update = { status };
      if (status === 'accepted') {
        // Simple deterministic room name based on bookingId; can be hardened later
        const meetingUrl = `https://meet.jit.si/PTA-${bookingId}`;
        update.meetingProvider = 'jitsi';
        update.meetingUrl = meetingUrl;
      }
      await updateDoc(ref, update);
      
      // Create notification for parent when status changes
      if (parentId) {
        let notificationData = {
          userId: parentId,
          navigationTarget: 'ParentBookings',
          navigationParams: { bookingId }
        };

        if (status === 'accepted') {
          const meetingUrl = `https://meet.jit.si/PTA-${bookingId}`;
          notificationData.type = 'booking_accepted';
          notificationData.title = 'Varaus hyväksytty! 🎉';
          notificationData.message = `${teacherName || 'Opettaja'} hyväksyi varauksesi ${date ? new Date(date).toLocaleString('fi-FI') : ''}\n\n📹 Video-linkki:\n${meetingUrl}\n\nLiity Dashboard → Upcoming Lessons kautta`;
        } else if (status === 'declined') {
          notificationData.type = 'booking_declined';
          notificationData.title = 'Varaus hylätty';
          notificationData.message = `${teacherName || 'Opettaja'} hylkäsi varauksesi ${date ? new Date(date).toLocaleString('fi-FI') : ''}`;
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

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {},
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
  }
});

export const selectBookings = (state) => state.bookings.myBookings;
export const selectBookingsLoading = (state) => state.bookings.loading;
export const selectBookingsError = (state) => state.bookings.error;

export default bookingsSlice.reducer;
