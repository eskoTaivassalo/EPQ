import { addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * sendMessage - teacher -> parent or parent -> teacher contextual message.
 * @param {Object} params
 * @param {string} params.teacherId
 * @param {string} params.parentId
 * @param {string} params.senderType  'teacher' | 'parent'
 * @param {string} params.text
 */
export async function sendMessage({ teacherId, parentId, senderType, text }) {
  if (!db) throw new Error('Firestore not initialized');
  if (!teacherId || !parentId) throw new Error('teacherId and parentId required');
  if (!text || !text.trim()) throw new Error('Message text required');
  const payload = {
    teacherId,
    parentId,
    senderType,
    text: text.trim(),
    read: false,
    createdAt: serverTimestamp(),
  };
  const ref = collection(db, 'messages');
  const res = await addDoc(ref, payload);

  // Determine recipient
  const recipientType = senderType === 'teacher' ? 'parent' : 'teacher';
  const recipientId = recipientType === 'teacher' ? teacherId : parentId;

  // In-app notification (always)
  try {
    const { createNotification } = await import('../store/slices/notificationsSlice');
    const notificationData = {
      userId: recipientId,
      type: 'message',
      title: 'Uusi viesti',
      message: `${senderType === 'teacher' ? 'Opettaja' : 'Vanhempi'} lähetti sinulle viestin: "${text.trim()}"`,
      navigationTarget: 'ConversationThread',
      navigationParams: { teacherId, parentId }
    };
    // Dispatch notification (if Redux store available)
    if (typeof window !== 'undefined' && window.store) {
      window.store.dispatch(createNotification(notificationData));
    } else {
      // Fallback: create directly to Firestore
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        read: false,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('[message] Failed to create in-app notification:', err);
  }

  // Push notification (only if recipient not active)
  try {
    // TODO: Check recipient activity (lastActive) here if implemented
    // For now, always send push
    const { sendExpoPushNotification } = await import('./pushService');
    const { doc, getDoc } = await import('firebase/firestore');
    const userDoc = await getDoc(doc(db, 'users', recipientId));
    const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
    if (token) {
      await sendExpoPushNotification(
        token,
        'Uusi viesti',
        `${senderType === 'teacher' ? 'Opettaja' : 'Vanhempi'} lähetti sinulle viestin: "${text.trim()}"`,
        { teacherId, parentId, type: 'message' }
      );
    }
  } catch (err) {
    console.warn('[message] Failed to send push notification:', err);
  }

  return { id: res.id, ...payload };
}

/**
 * listMessagesForConversation - returns ordered messages between a teacher and a parent.
 */
export async function listMessagesForConversation(teacherId, parentId, limit = 50) {
  if (!db) throw new Error('Firestore not initialized');
  const ref = collection(db, 'messages');
  const q = query(
    ref,
    where('parentId', '==', parentId),
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  const messages = [];
  snap.forEach(docSnap => {
    messages.push({ id: docSnap.id, ...docSnap.data() });
  });
  return messages.slice(-limit);
}

/**
 * addGrade - record a grade from teacher for a parent/student.
 * @param {Object} params
 * @param {string} params.teacherId
 * @param {string} params.parentId
 * @param {string} params.subject
 * @param {number} params.score
 * @param {number} params.maxScore
 * @param {string} params.notes
 */
export async function addGrade({ teacherId, parentId, subject, score, maxScore, notes }) {
  if (!db) throw new Error('Firestore not initialized');
  if (!teacherId || !parentId) throw new Error('teacherId and parentId required');
  if (!subject) throw new Error('Subject required');
  if (score == null || maxScore == null) throw new Error('Score and maxScore required');
  const payload = {
    teacherId,
    parentId,
    subject: subject.trim(),
    score: Number(score),
    maxScore: Number(maxScore),
    notes: notes?.trim() || '',
    createdAt: serverTimestamp(),
  };
  const ref = collection(db, 'grades');
  const res = await addDoc(ref, payload);
  return { id: res.id, ...payload };
}

/**
 * listGradesForParentTeacher - get grades recorded by this teacher for this parent.
 */
export async function listGradesForParentTeacher(teacherId, parentId) {
  if (!db) throw new Error('Firestore not initialized');
  const ref = collection(db, 'grades');
  const q = query(
    ref,
    where('teacherId', '==', teacherId),
    where('parentId', '==', parentId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const grades = [];
  snap.forEach(docSnap => {
    grades.push({ id: docSnap.id, ...docSnap.data() });
  });
  return grades;
}

/**
 * subscribeToConversation - realtime updates for a conversation between teacherId & parentId
 */
export function subscribeToConversation(teacherId, parentId, onChange) {
  if (!db) throw new Error('Firestore not initialized');
  const ref = collection(db, 'messages');
  const q = query(
    ref,
    where('parentId', '==', parentId),
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const arr = [];
    snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
    onChange(arr);
  });
}

/**
 * listConversationsForUser - derive conversations by grouping messages by the counterpart id.
 * Returns items: { counterpartId: string, counterpartRole: 'teacher'|'parent', lastMessage, lastAt }
 */
export async function listConversationsForUser(userId, role) {
  if (!db) throw new Error('Firestore not initialized');
  const ref = collection(db, 'messages');
  const q = role === 'teacher'
    ? query(ref, where('teacherId', '==', userId), orderBy('createdAt', 'desc'))
    : query(ref, where('parentId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const map = new Map();
  snap.forEach(docSnap => {
    const m = { id: docSnap.id, ...docSnap.data() };
    const counterpartId = role === 'teacher' ? m.parentId : m.teacherId;
    if (!counterpartId) return;
    if (!map.has(counterpartId)) {
      map.set(counterpartId, { counterpartId, counterpartRole: role === 'teacher' ? 'parent' : 'teacher', lastMessage: m.text || m.content, lastAt: m.createdAt || m.timestamp });
    }
  });
  return Array.from(map.values());
}

