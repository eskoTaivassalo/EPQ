// Feedback service: Firestore feedback collection helpers
import { addDoc, collection, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getRoleCollectionInfo } from './userDatabaseService';

/**
 * addFeedback - create feedback from one user to another, optionally linked to booking/lesson
 * Feedback is saved to the receiver's profile under serviceTypes structure
 * @param {Object} params
 * @param {string} params.fromUserId
 * @param {string} params.toUserId
 * @param {string} params.roleFrom 'teacher'|'parent'
 * @param {string} params.roleTo 'teacher'|'parent'
 * @param {string} [params.bookingId]
 * @param {string} [params.lessonId]
 * @param {string} [params.feedbackText]
 * @param {string} [params.subject] Subject/topic of feedback
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
  subject = null,
  rating = null,
  categories = []
}) {
  if (!db) throw new Error('Firestore not initialized');
  if (!fromUserId || !toUserId || !roleFrom || !roleTo) throw new Error('Missing required fields');
  
  console.log('💬 Adding feedback:', { fromUserId, toUserId, roleFrom, roleTo, subject });
  
  // Get receiver's collection info to save feedback to their profile
  const receiverInfo = getRoleCollectionInfo(roleTo);
  if (!receiverInfo) {
    throw new Error(`Unknown role: ${roleTo}`);
  }
  
  const { serviceType, collection: collectionName } = receiverInfo;
  
  // Build path: serviceTypes/{serviceType}/{collectionName}/{userId}/feedback
  const userDocRef = doc(db, 'serviceTypes', serviceType, collectionName, toUserId);
  const feedbackCollectionRef = collection(userDocRef, 'feedback');
  
  const payload = {
    fromUserId,
    toUserId,
    roleFrom,
    roleTo,
    bookingId,
    lessonId,
    feedbackText,
    subject,
    rating,
    categories,
    createdAt: serverTimestamp()
  };
  
  console.log('💬 Saving feedback to path:', `serviceTypes/${serviceType}/${collectionName}/${toUserId}/feedback`);
  console.log('💬 Feedback payload:', payload);
  
  const res = await addDoc(feedbackCollectionRef, payload);
  console.log('💬 Feedback saved with ID:', res.id);
  
  return { id: res.id, ...payload };
}

/**
 * listFeedbackForUser - get feedback received by a user from their profile
 * @param {string} userId
 * @param {string} userRole - 'teacher' | 'parent' | etc.
 * @returns {Promise<Array>}
 */
export async function listFeedbackForUser(userId, userRole) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !userRole) throw new Error('Missing userId or userRole');
  
  const { query, getDocs, orderBy } = await import('firebase/firestore');
  
  // Get user's collection info
  const userInfo = getRoleCollectionInfo(userRole);
  if (!userInfo) {
    throw new Error(`Unknown role: ${userRole}`);
  }
  
  const { serviceType, collection: collectionName } = userInfo;
  
  // Build path: serviceTypes/{serviceType}/{collectionName}/{userId}/feedback
  const userDocRef = doc(db, 'serviceTypes', serviceType, collectionName, userId);
  const feedbackCollectionRef = collection(userDocRef, 'feedback');
  
  console.log('💬 Fetching feedback from:', `serviceTypes/${serviceType}/${collectionName}/${userId}/feedback`);
  
  const q = query(feedbackCollectionRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const feedbacks = [];
  snap.forEach(docSnap => {
    feedbacks.push({ id: docSnap.id, ...docSnap.data() });
  });
  
  console.log('💬 Found', feedbacks.length, 'feedback items');
  return feedbacks;
}

/**
 * listFeedbackGivenByUser - get feedback sent by a user
 * Uses collectionGroup to query all feedback subcollections
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function listFeedbackGivenByUser(userId) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId) throw new Error('Missing userId');
  
  const { query, where, getDocs, orderBy, collectionGroup } = await import('firebase/firestore');
  
  // Query all feedback subcollections across all user profiles
  const feedbackGroupRef = collectionGroup(db, 'feedback');
  const q = query(
    feedbackGroupRef, 
    where('fromUserId', '==', userId), 
    orderBy('createdAt', 'desc')
  );
  
  console.log('💬 Fetching feedback given by user:', userId);
  
  const snap = await getDocs(q);
  const feedbacks = [];
  snap.forEach(docSnap => {
    feedbacks.push({ id: docSnap.id, ...docSnap.data() });
  });
  
  console.log('💬 Found', feedbacks.length, 'feedback items given by user');
  return feedbacks;
}
