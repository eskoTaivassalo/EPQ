// Feedback service: Firestore feedback collection helpers
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * addFeedback - create feedback from one user to another, optionally linked to booking/lesson
 * @param {Object} params
 * @param {string} params.fromUserId
 * @param {string} params.toUserId
 * @param {string} params.roleFrom 'teacher'|'parent'
 * @param {string} params.roleTo 'teacher'|'parent'
 * @param {string} [params.bookingId]
 * @param {string} [params.lessonId]
 * @param {string} [params.feedbackText]
 * @param {number} [params.rating] 1-5
 * @param {Array<string>} [params.categories] e.g. ['aktiivisuus','osaaminen']
 */
export async function addFeedback({
  fromUserId,
  toUserId,
  roleFrom,
  roleTo,
  bookingId = null,
  lessonId = null,
  feedbackText = '',
  rating = null,
  categories = []
}) {
  if (!db) throw new Error('Firestore not initialized');
  if (!fromUserId || !toUserId || !roleFrom || !roleTo) throw new Error('Missing required fields');
  const payload = {
    fromUserId,
    toUserId,
    roleFrom,
    roleTo,
    bookingId,
    lessonId,
    feedbackText,
    rating,
    categories,
    createdAt: serverTimestamp()
  };
  const ref = collection(db, 'feedback');
  const res = await addDoc(ref, payload);
  return { id: res.id, ...payload };
}

/**
 * listFeedbackForUser - get feedback received by a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function listFeedbackForUser(userId) {
  if (!db) throw new Error('Firestore not initialized');
  const { query, where, getDocs, orderBy } = await import('firebase/firestore');
  const ref = collection(db, 'feedback');
  const q = query(ref, where('toUserId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const feedbacks = [];
  snap.forEach(docSnap => {
    feedbacks.push({ id: docSnap.id, ...docSnap.data() });
  });
  return feedbacks;
}

/**
 * listFeedbackGivenByUser - get feedback sent by a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function listFeedbackGivenByUser(userId) {
  if (!db) throw new Error('Firestore not initialized');
  const { query, where, getDocs, orderBy } = await import('firebase/firestore');
  const ref = collection(db, 'feedback');
  const q = query(ref, where('fromUserId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const feedbacks = [];
  snap.forEach(docSnap => {
    feedbacks.push({ id: docSnap.id, ...docSnap.data() });
  });
  return feedbacks;
}
