import { collection, doc, setDoc, getDocs, getDoc, query, where, orderBy, runTransaction, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { toISODate, parseTimeHM, addMinutes, eachDay, dayOfWeek } from '../utils/dateUtils';
import { sendExpoPushNotification } from './pushService';

const SLOTS_COL = 'availabilitySlots';
const BOOKINGS_COL = 'bookings';

/**
 * Generate availability slots based on a weekly template
 * @param {string} teacherId
 * @param {Object} template { daysOfWeek: [1..7 or 0..6], startTime:'09:00', endTime:'16:00', durationMin:60 }
 * @param {Date} fromDate inclusive
 * @param {Date} toDate inclusive
 * @param {Object} options { locationType, price }
 */
export async function generateAvailabilitySlots(teacherId, template, fromDate, toDate, options = {}) {
  if (!db) throw new Error('Firestore not initialized');
  if (!teacherId) throw new Error('teacherId required');
  if (auth?.currentUser?.uid && teacherId !== auth.currentUser.uid) {
    throw new Error('Permission check failed: teacherId must equal current user');
  }

  const created = [];
  const { daysOfWeek: dows = [1,2,3,4,5], startTime = '09:00', endTime = '16:00', durationMin = 60 } = template || {};
  const { h: sh, m: sm } = parseTimeHM(startTime);
  const { h: eh, m: em } = parseTimeHM(endTime);

  // Iterate days
  await runTransaction(db, async (tx) => {
    eachDay(fromDate, toDate, (day) => {
      const dow = day.getDay();
      // Accept both 0..6 or 1..7 specification
      const normalizedDows = dows.map(v => (v === 7 ? 0 : v));
      if (!normalizedDows.includes(dow)) return;

      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sh, sm, 0, 0);
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eh, em, 0, 0);

      let cursor = start;
      while (cursor < end) {
        const slotStart = new Date(cursor);
        const slotEnd = addMinutes(slotStart, durationMin);
        if (slotEnd > end) break; // do not overflow daily end

        const slotKey = `${teacherId}#${slotStart.toISOString()}`; // unique key
        const slotId = slotKey; // deterministic id to avoid duplicates
        const slotRef = doc(db, SLOTS_COL, slotId);
        tx.set(slotRef, {
          teacherId,
          date: toISODate(slotStart),
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          durationMin,
          status: 'available',
          locationType: options.locationType || 'online',
          price: options.price || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        created.push(slotId);

        cursor = slotEnd;
      }
    });
  });

  return { createdCount: created.length };
}

/**
 * List teacher's available slots within a date range
 */
export async function listAvailableSlots(teacherId, fromDate, toDate) {
  if (!db) throw new Error('Firestore not initialized');
  const fromISO = toISODate(fromDate);
  const toISO = toISODate(toDate);

  const q = query(
    collection(db, SLOTS_COL),
    where('teacherId', '==', teacherId),
    where('date', '>=', fromISO),
    where('date', '<=', toISO),
    where('status', '==', 'available'),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Book a slot atomically
 */
export async function bookSlot(slotId, parentId, metadata = {}) {
  if (!db) throw new Error('Firestore not initialized');
  if (!slotId || !parentId) throw new Error('slotId and parentId required');

  const slotRef = doc(db, SLOTS_COL, slotId);
  const bookingRef = doc(collection(db, BOOKINGS_COL));
  let teacherIdForNotify = null;
  let startISO = null;
  let endISO = null;

  await runTransaction(db, async (tx) => {
    const slotSnap = await tx.get(slotRef);
    if (!slotSnap.exists()) throw new Error('Slot not found');
    const slot = slotSnap.data();
    if (slot.status !== 'available') throw new Error('Slot not available');

    // capture for notification after transaction
    teacherIdForNotify = slot.teacherId;
    startISO = slot.start;
    endISO = slot.end;

    tx.update(slotRef, {
      status: 'booked',
      parentId,
      updatedAt: serverTimestamp(),
    });

    tx.set(bookingRef, {
      slotId,
      teacherId: slot.teacherId,
      parentId,
      date: slot.date,
      start: slot.start,
      end: slot.end,
      status: 'booked',
      createdAt: serverTimestamp(),
      ...metadata,
    });
  });

  // Fire-and-forget: create an in-app notification for the teacher
  try {
    if (teacherIdForNotify) {
      const startStr = new Date(startISO).toLocaleString();
      await addDoc(collection(db, 'notifications'), {
        userId: teacherIdForNotify,
        type: 'booking',
        title: 'New booking',
        message: `A parent booked a lesson for ${startStr}.`,
        read: false,
        createdAt: serverTimestamp(),
        data: {
          slotId,
          bookingId: bookingRef.id,
          parentId,
          start: startISO,
          end: endISO,
          ...metadata,
        },
      });

      // Try sending a push notification via Expo (best-effort)
      try {
        const userDoc = await getDoc(doc(db, 'users', teacherIdForNotify));
        const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
        if (token) {
          await sendExpoPushNotification(
            token,
            'New booking',
            `You have a new booking on ${startStr}.`,
            { slotId, bookingId: bookingRef.id }
          );
        }
      } catch (pushErr) {
        console.warn('Push send skipped/failed', pushErr?.message || pushErr);
      }
    }
  } catch (notifyErr) {
    // Non-fatal: booking succeeded even if notification write fails
    console.warn('Notification creation failed', notifyErr);
  }

  return { success: true, bookingId: bookingRef.id };
}

/** Cancel a booking and free the slot */
export async function cancelBooking(bookingId, slotId, requesterId) {
  if (!db) throw new Error('Firestore not initialized');
  const bookingRef = doc(db, BOOKINGS_COL, bookingId);
  const slotRef = doc(db, SLOTS_COL, slotId);

  await runTransaction(db, async (tx) => {
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists()) throw new Error('Booking not found');
    const booking = bookingSnap.data();

    // Only involved parties can cancel in client-side logic
    if (requesterId !== booking.parentId && requesterId !== booking.teacherId) {
      throw new Error('Not authorized to cancel');
    }

    tx.update(slotRef, { status: 'available', parentId: null, updatedAt: serverTimestamp() });
    tx.update(bookingRef, { status: 'canceled', updatedAt: serverTimestamp() });
  });

  return { success: true };
}

export default {
  generateAvailabilitySlots,
  listAvailableSlots,
  bookSlot,
  cancelBooking,
  listStudentsForTeacher,
};

/**
 * List unique parent documents who have at least one booking with the given teacher.
 * Simple MVP: query bookings by teacherId, then fetch distinct parent docs.
 */
export async function listStudentsForTeacher(teacherId) {
  if (!db) throw new Error('Firestore not initialized');
  if (!teacherId) throw new Error('teacherId required');
  // Query bookings for this teacher. We avoid additional filters to reduce index requirements.
  const q = query(collection(db, BOOKINGS_COL), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  const parentIds = new Set();
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.parentId) parentIds.add(data.parentId);
  });
  const results = [];
  for (const pid of parentIds) {
    try {
      const ref = doc(db, 'parents', pid);
      const psnap = await getDoc(ref);
      if (psnap.exists()) {
        results.push({ id: pid, ...psnap.data() });
      }
    } catch (e) {
      console.warn('listStudentsForTeacher: parent fetch failed', pid, e.message || e);
    }
  }
  // Sort by name if available
  results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return results;
}
