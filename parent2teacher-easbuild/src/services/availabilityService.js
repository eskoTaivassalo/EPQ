import { collection, doc, setDoc, getDocs, getDoc, query, where, orderBy, runTransaction, serverTimestamp, addDoc, collectionGroup } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { toISODate, parseTimeHM, addMinutes, eachDay, dayOfWeek } from '../utils/dateUtils';
import { sendExpoPushNotification } from './pushService';
import { getRoleCollectionInfo } from './userDatabaseService';

const BOOKINGS_COL = 'bookings';

/**
 * Get the hierarchical collection path for availability slots
 * Returns collection reference: serviceTypes/{serviceType}/{collectionName}/{userId}/availabilitySlots
 */
function getAvailabilitySlotsCollection(userId, userRole) {
  if (!userId) throw new Error('userId required for slots collection');
  const roleInfo = getRoleCollectionInfo(userRole || 'teacher');
  const { serviceType, collection: collectionName } = roleInfo;
  return collection(db, 'serviceTypes', serviceType, collectionName, userId, 'availabilitySlots');
}

/**
 * Get the hierarchical document path for a specific availability slot
 */
function getAvailabilitySlotDoc(userId, userRole, slotId) {
  if (!userId || !slotId) throw new Error('userId and slotId required');
  const roleInfo = getRoleCollectionInfo(userRole || 'teacher');
  const { serviceType, collection: collectionName } = roleInfo;
  return doc(db, 'serviceTypes', serviceType, collectionName, userId, 'availabilitySlots', slotId);
}

/**
 * Get the hierarchical collection path for bookings
 * Returns collection reference: serviceTypes/{serviceType}/{collectionName}/{userId}/bookings
 */
function getBookingsCollection(userId, userRole) {
  if (!userId) throw new Error('userId required for bookings collection');
  const roleInfo = getRoleCollectionInfo(userRole || 'teacher');
  const { serviceType, collection: collectionName } = roleInfo;
  return collection(db, 'serviceTypes', serviceType, collectionName, userId, 'bookings');
}

/**
 * Get the hierarchical document path for a specific booking
 */
function getBookingDoc(userId, userRole, bookingId) {
  if (!userId || !bookingId) throw new Error('userId and bookingId required');
  const roleInfo = getRoleCollectionInfo(userRole || 'teacher');
  const { serviceType, collection: collectionName } = roleInfo;
  return doc(db, 'serviceTypes', serviceType, collectionName, userId, 'bookings', bookingId);
}

/**
 * Generate availability slots based on a weekly template
 * @param {string} teacherId
 * @param {Object} template { daysOfWeek: [1..7 or 0..6], startTime:'09:00', endTime:'16:00', durationMin:60 }
 * @param {Date} fromDate inclusive
 * @param {Date} toDate inclusive
 * @param {Object} options { locationType, price, userRole }
 */
export async function generateAvailabilitySlots(teacherId, template, fromDate, toDate, options = {}) {
  if (!db) throw new Error('Firestore not initialized');
  if (!teacherId) throw new Error('teacherId required');
  if (auth?.currentUser?.uid && teacherId !== auth.currentUser.uid) {
    throw new Error('Permission check failed: teacherId must equal current user');
  }

  const created = [];
  const skipped = [];
  const { daysOfWeek: dows = [1,2,3,4,5], startTime = '09:00', endTime = '16:00', durationMin = 60, subjects = [] } = template || {};
  const { h: sh, m: sm } = parseTimeHM(startTime);
  const { h: eh, m: em } = parseTimeHM(endTime);
  const userRole = options.userRole || 'teacher'; // Default to teacher for backward compatibility

  // First, check for existing slots to prevent overlaps
  const existingSlotsQuery = query(
    getAvailabilitySlotsCollection(teacherId, userRole),
    where('date', '>=', toISODate(fromDate)),
    where('date', '<=', toISODate(toDate))
  );
  const existingSnap = await getDocs(existingSlotsQuery);
  const existingSlots = existingSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      start: new Date(data.start),
      end: new Date(data.end),
      status: data.status
    };
  });

  console.log(`📋 Found ${existingSlots.length} existing slots in date range`);

  // Iterate days
  await runTransaction(db, async (tx) => {
    eachDay(fromDate, toDate, (day) => {
      const dow = day.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      // Accept both 0..6 or 1..7 specification
      // Note: If user selects Sunday in UI, it comes as 0 (already normalized)
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

        // Check if this exact slot already exists (exact time match)
        const exactMatch = existingSlots.find(s => 
          s.start.getTime() === slotStart.getTime() && 
          s.end.getTime() === slotEnd.getTime()
        );

        if (exactMatch) {
          console.warn(`⚠️ Skipping duplicate slot: ${slotStart.toISOString()} (status: ${exactMatch.status})`);
          skipped.push(slotStart.toISOString());
          cursor = slotEnd;
          continue;
        }

        // Check for ANY overlap with existing slots (including partial overlaps)
        const hasOverlap = existingSlots.some(existing => {
          // Overlap occurs if: new slot starts before existing ends AND new slot ends after existing starts
          const overlaps = slotStart < existing.end && slotEnd > existing.start;
          if (overlaps) {
            console.warn(`⚠️ Overlap: new ${slotStart.toISOString()}-${slotEnd.toISOString()} vs existing ${existing.start.toISOString()}-${existing.end.toISOString()} (${existing.status})`);
          }
          return overlaps;
        });

        if (hasOverlap) {
          skipped.push(slotStart.toISOString());
          cursor = slotEnd;
          continue;
        }

        const slotId = slotKey; // deterministic id to avoid duplicates
        // Use hierarchical path: serviceTypes/{serviceType}/{collectionName}/{userId}/availabilitySlots/{slotId}
        const slotRef = getAvailabilitySlotDoc(teacherId, userRole, slotId);
        const slotData = {
          teacherId,
          date: toISODate(slotStart),
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          durationMin,
          status: 'available',
          locationType: options.locationType || 'online',
          price: options.price || null,
          subjects: Array.isArray(subjects) ? subjects : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        // Remove merge: true to prevent accidental overwrites
        tx.set(slotRef, slotData);
        created.push(slotId);

        // Add to existingSlots array to check against future slots in this generation
        existingSlots.push({
          id: slotId,
          start: slotStart,
          end: slotEnd,
          status: 'available'
        });

        cursor = slotEnd;
      }
    });
  });

  return { 
    createdCount: created.length, 
    skippedCount: skipped.length,
    skippedSlots: skipped
  };
}

/**
 * List teacher's available slots within a date range
 * Uses collectionGroup query to find slots across all role subcollections
 */
export async function listAvailableSlots(teacherId, fromDate, toDate) {
  if (!db) throw new Error('Firestore not initialized');
  const fromISO = toISODate(fromDate);
  const toISO = toISODate(toDate);

  // Use collectionGroup to query all availabilitySlots subcollections
  const q = query(
    collectionGroup(db, 'availabilitySlots'),
    where('teacherId', '==', teacherId),
    where('date', '>=', fromISO),
    where('date', '<=', toISO),
    where('status', '==', 'available'),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  return results;
}

/**
 * Book a slot atomically
 */
export async function bookSlot(slotId, parentId, metadata = {}) {
  if (!db) throw new Error('Firestore not initialized');
  if (!slotId || !parentId) throw new Error('slotId and parentId required');

  // Generate a unique booking ID
  const bookingId = doc(collection(db, 'temp')).id;
  
  let teacherIdForNotify = null;
  let startISO = null;
  let endISO = null;
  let bookedSubject = null;
  let slotRef = null;

  // Parse slotId: format is "teacherId#startISO"
  const [teacherIdFromSlot, startISOFromSlot] = slotId.split('#');
  if (!teacherIdFromSlot || !startISOFromSlot) {
    throw new Error('Invalid slotId format');
  }
  
  // Find the slot using collectionGroup query by teacherId and start time
  const slotQuery = query(
    collectionGroup(db, 'availabilitySlots'),
    where('teacherId', '==', teacherIdFromSlot),
    where('start', '==', startISOFromSlot)
  );
  const slotSnap = await getDocs(slotQuery);
  
  if (slotSnap.empty) {
    throw new Error('Slot not found');
  }
  
  slotRef = slotSnap.docs[0].ref;

  await runTransaction(db, async (tx) => {
    const slotDocSnap = await tx.get(slotRef);
    if (!slotDocSnap.exists()) {
      throw new Error('Slot not found');
    }
    const slot = slotDocSnap.data();
    
    if (slot.status !== 'available') {
      const slotTime = new Date(slot.start).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      throw new Error(`This time slot (${slotTime}) is no longer available. It may have been booked by another user. Please refresh and select a different time.`);
    }
    // Check if slot is in the future
    const slotStart = new Date(slot.start);
    const now = new Date();
    if (slotStart <= now) {
      throw new Error('Cannot book a time slot in the past');
    }
    teacherIdForNotify = slot.teacherId;
    startISO = slot.start;
    endISO = slot.end;
    // Determine booked subject
    if (metadata.subject) {
      bookedSubject = metadata.subject;
    } else if (Array.isArray(slot.subjects) && slot.subjects.length === 1) {
      bookedSubject = slot.subjects[0];
    }
    
    // Get teacher's role from slot data or default to teacher
    const teacherRole = slot.userRole || 'teacher';
    
    // Get client role from metadata or default to parent
    const clientRole = metadata.clientRole || 'parent';
    
    const bookingData = {
      bookingId, // Add explicit bookingId field for easier querying
      slotId,
      teacherId: slot.teacherId,
      parentId,
      teacherRole, // Add role information for easier path reconstruction
      clientRole,  // Add role information for easier path reconstruction
      date: slot.start,
      start: slot.start,
      end: slot.end,
      status: 'booked',
      subject: bookedSubject || null,
      createdAt: serverTimestamp(),
      ...metadata,
    };
    
    // Update slot status
    tx.update(slotRef, {
      status: 'booked',
      parentId,
      updatedAt: serverTimestamp(),
    });
    
    // Teacher's bookings: serviceTypes/{serviceType}/{collection}/{teacherId}/bookings/{bookingId}
    const teacherBookingRef = getBookingDoc(slot.teacherId, teacherRole, bookingId);
    console.log('📝 Saving teacher booking to:', teacherBookingRef.path);
    console.log('📝 Teacher role:', teacherRole, 'Teacher ID:', slot.teacherId);
    tx.set(teacherBookingRef, { ...bookingData, role: 'provider' });
    
    // Parent's bookings: serviceTypes/{serviceType}/{collection}/{parentId}/bookings/{bookingId}
    const parentBookingRef = getBookingDoc(parentId, clientRole, bookingId);
    console.log('📝 Saving parent booking to:', parentBookingRef.path);
    console.log('📝 Client role:', clientRole, 'Parent ID:', parentId);
    tx.set(parentBookingRef, { ...bookingData, role: 'client' });
  });
  
  // Fire-and-forget: create an in-app notification for the teacher
  try {
    if (teacherIdForNotify) {
      const { getUserMainProfile, getRoleCollectionInfo } = await import('./userDatabaseService');
      const profile = await getUserMainProfile(teacherIdForNotify);
      
      if (profile && profile.primaryRole) {
        const { serviceType, collection: collectionName } = getRoleCollectionInfo(profile.primaryRole);
        const startStr = new Date(startISO).toLocaleString();
        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notificationRef = doc(
          db,
          'serviceTypes',
          serviceType,
          collectionName,
          teacherIdForNotify,
          'notifications',
          notificationId
        );
        await setDoc(notificationRef, {
          userId: teacherIdForNotify,
          type: 'booking',
          title: 'New booking',
          message: `A parent booked a session for ${startStr}${bookedSubject ? ` (Subject: ${bookedSubject})` : ''}.`,
          read: false,
          createdAt: serverTimestamp(),
          data: {
            slotId,
            bookingId: bookingId,
            parentId,
            start: startISO,
            end: endISO,
            subject: bookedSubject || null,
            ...metadata,
          },
        });
      }

      // Try sending a push notification via Expo (best-effort)
      try {
        const userDoc = await getDoc(doc(db, 'users', teacherIdForNotify));
        const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
        
        if (token) {
          await sendExpoPushNotification(
            token,
            '📅 New booking',
            `You have a new booking on ${startStr}${bookedSubject ? ` (Subject: ${bookedSubject})` : ''}.`,
            { slotId, bookingId: bookingId, type: 'new_booking', subject: bookedSubject || null }
          );
        }
      } catch (pushErr) {
        // Ignore push notification errors
      }
    }
  } catch (notifyErr) {
    // Non-fatal: booking succeeded even if notification write fails
    console.warn('Notification creation failed', notifyErr);
  }

  return { success: true, bookingId: bookingId };
}

/** Cancel a booking and free the slot */
export async function cancelBooking(bookingId, slotId, requesterId, userId, userRole) {
  if (!db) throw new Error('Firestore not initialized');
  const bookingRef = getBookingDoc(userId, userRole, bookingId);
  
  // Parse slotId: format is "teacherId#startISO"
  const [teacherIdFromSlot, startISOFromSlot] = slotId.split('#');
  if (!teacherIdFromSlot || !startISOFromSlot) {
    throw new Error('Invalid slotId format');
  }
  
  // Find slot using collectionGroup query by teacherId and start time
  const slotQuery = query(
    collectionGroup(db, 'availabilitySlots'),
    where('teacherId', '==', teacherIdFromSlot),
    where('start', '==', startISOFromSlot)
  );
  const slotSnap = await getDocs(slotQuery);
  
  if (slotSnap.empty) {
    throw new Error('Slot not found');
  }
  
  const slotRef = slotSnap.docs[0].ref;

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
  // Query bookings for this teacher using collectionGroup to search across serviceTypes structure
  const q = query(collectionGroup(db, 'bookings'), where('teacherId', '==', teacherId));
  const snap = await getDocs(q);
  const parentIds = new Set();
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.parentId) parentIds.add(data.parentId);
  });
  const results = [];
  for (const pid of parentIds) {
    try {
      // Use hierarchical structure: users/{userId}/students/{userId}
      const ref = doc(db, 'users', pid, 'students', pid);
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
