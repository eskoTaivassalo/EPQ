// Feedback service: Firestore feedback collection helpers
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import { getRoleCollectionInfo, getUserMainProfile } from './userDatabaseService';

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
  
  // Create notification for receiver
  try {
    console.log('🔔 Creating notification for feedback recipient:', toUserId);
    
    // Get receiver's profile to determine their name
    const receiverProfile = await getUserMainProfile(toUserId);
    const receiverName = receiverProfile?.displayName || receiverProfile?.name || 'User';
    
    // Get sender's profile for the notification
    const senderProfile = await getUserMainProfile(fromUserId);
    const senderName = senderProfile?.displayName || senderProfile?.name || 'Teacher';
    
    // Create notification document
    const notificationRef = doc(
      db,
      'serviceTypes',
      serviceType,
      collectionName,
      toUserId,
      'notifications',
      `notif_feedback_${res.id}`
    );
    
    const notificationData = {
      type: 'feedback_received',
      title: '💬 New Feedback',
      message: `${senderName} gave you feedback${subject ? ' on ' + subject : ''}`,
      userId: toUserId,
      feedbackId: res.id,
      fromUserId,
      subject,
      read: false,
      navigationTarget: 'Feedback',
      navigationParams: { feedbackId: res.id },
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(userDocRef, 'notifications'), notificationData);
    console.log('✅ Feedback notification created');
    
    // Send push notification if available
    if (auth.currentUser?.uid !== toUserId) {
      try {
        const { sendExpoPushNotification } = await import('./pushService');
        const userDoc = await getDoc(doc(db, 'users', toUserId));
        const token = userDoc.exists() ? userDoc.data()?.push?.expo?.token : null;
        
        if (token) {
          await sendExpoPushNotification(
            token,
            '💬 New Feedback',
            `${senderName}: ${feedbackText.substring(0, 100)}${feedbackText.length > 100 ? '...' : ''}`,
            { type: 'feedback_received', feedbackId: res.id }
          );
          console.log('📲 Push notification sent');
        }
      } catch (pushErr) {
        console.warn('Failed to send push notification:', pushErr);
      }
    }
  } catch (notifErr) {
    console.error('Failed to create feedback notification:', notifErr);
    // Don't fail the whole operation if notification fails
  }
  
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

/**
 * deleteFeedback - delete a feedback from user's profile
 * @param {string} userId - The user who received the feedback
 * @param {string} userRole - The role of the user who received the feedback
 * @param {string} feedbackId - The ID of the feedback to delete
 * @returns {Promise<void>}
 */
export async function deleteFeedback(userId, userRole, feedbackId) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !userRole || !feedbackId) throw new Error('Missing required parameters');
  
  const { deleteDoc } = await import('firebase/firestore');
  
  // Get user's collection info
  const userInfo = getRoleCollectionInfo(userRole);
  if (!userInfo) {
    throw new Error(`Unknown role: ${userRole}`);
  }
  
  const { serviceType, collection: collectionName } = userInfo;
  
  // Build path to feedback document
  const feedbackDocRef = doc(
    db, 
    'serviceTypes', 
    serviceType, 
    collectionName, 
    userId, 
    'feedback', 
    feedbackId
  );
  
  console.log('🗑️ Deleting feedback:', feedbackId, 'from user:', userId);
  
  await deleteDoc(feedbackDocRef);
  console.log('✅ Feedback deleted successfully');
}

/**
 * markFeedbackAsRead - mark feedback as read (adds a field to track read status)
 * @param {string} userId - The user who received the feedback
 * @param {string} userRole - The role of the user who received the feedback
 * @param {string} feedbackId - The ID of the feedback to mark as read
 * @returns {Promise<void>}
 */
export async function markFeedbackAsRead(userId, userRole, feedbackId) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !userRole || !feedbackId) throw new Error('Missing required parameters');
  
  const { updateDoc } = await import('firebase/firestore');
  
  // Get user's collection info
  const userInfo = getRoleCollectionInfo(userRole);
  if (!userInfo) {
    throw new Error(`Unknown role: ${userRole}`);
  }
  
  const { serviceType, collection: collectionName } = userInfo;
  
  // Build path to feedback document
  const feedbackDocRef = doc(
    db, 
    'serviceTypes', 
    serviceType, 
    collectionName, 
    userId, 
    'feedback', 
    feedbackId
  );
  
  console.log('👁️ Marking feedback as read:', feedbackId);
  
  await updateDoc(feedbackDocRef, {
    isRead: true,
    readAt: serverTimestamp()
  });
  
  console.log('✅ Feedback marked as read');
}
