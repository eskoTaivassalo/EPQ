import { addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * sendMessage - teacher -> parent or parent -> teacher contextual message.
 * @param {Object} params
 * @param {string} params.teacherId
 * @param {string} params.parentId
 * @param {string} params.senderType  'teacher' | 'parent'
 * @param {string} params.text
 * @param {string} params.serviceType - default 'education'
 */
export async function sendMessage({ teacherId, parentId, senderType, text, serviceType = 'education' }) {
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
  
  // Save message under sender's document: serviceTypes/{serviceType}/{teachers|parents}/{senderId}/messages
  const senderId = senderType === 'teacher' ? teacherId : parentId;
  const senderCollection = senderType === 'teacher' ? 'teachers' : 'parents';
  const ref = collection(db, 'serviceTypes', serviceType, senderCollection, senderId, 'messages');
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
      await addDoc(collection(db, 'users', recipientId, 'notifications'), {
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
 * Uses collectionGroup to query messages from both teacher's and parent's message collections
 */
export async function listMessagesForConversation(teacherId, parentId, limit = 50, serviceType = 'education') {
  if (!db) throw new Error('Firestore not initialized');
  
  // Use collectionGroup to search all 'messages' subcollections
  const { collectionGroup } = await import('firebase/firestore');
  const messagesRef = collectionGroup(db, 'messages');
  
  const q = query(
    messagesRef,
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
 * Uses collectionGroup to listen to messages from both users' collections
 */
export function subscribeToConversation(teacherId, parentId, onChange, serviceType = 'education') {
  if (!db) throw new Error('Firestore not initialized');
  
  const { collectionGroup } = require('firebase/firestore');
  const messagesRef = collectionGroup(db, 'messages');
  
  const q = query(
    messagesRef,
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
 * subscribeToSupportConversation - realtime updates for support messages between two users
 * Uses collectionGroup to listen to messages from both users' collections
 * @param {string} userId1 - First user ID (can be sender or recipient)
 * @param {string} userId2 - Second user ID (can be sender or recipient)
 * @param {function} onChange - Callback with messages array
 * @param {string} serviceType - default 'education'
 */
export function subscribeToSupportConversation(userId1, userId2, onChange, serviceType = 'education') {
  if (!db) throw new Error('Firestore not initialized');
  
  const { collectionGroup } = require('firebase/firestore');
  const messagesRef = collectionGroup(db, 'messages');
  
  // Query messages where:
  // (senderId = userId1 AND recipientId = userId2) OR (senderId = userId2 AND recipientId = userId1)
  // AND type = 'support'
  
  const q1 = query(
    messagesRef,
    where('senderId', '==', userId1),
    where('recipientId', '==', userId2),
    where('type', '==', 'support'),
    orderBy('createdAt', 'asc')
  );
  
  const q2 = query(
    messagesRef,
    where('senderId', '==', userId2),
    where('recipientId', '==', userId1),
    where('type', '==', 'support'),
    orderBy('createdAt', 'asc')
  );
  
  let messages1 = [];
  let messages2 = [];
  
  const unsub1 = onSnapshot(q1, (snap) => {
    messages1 = [];
    snap.forEach(d => messages1.push({ id: d.id, ...d.data() }));
    mergeAndNotify();
  });
  
  const unsub2 = onSnapshot(q2, (snap) => {
    messages2 = [];
    snap.forEach(d => messages2.push({ id: d.id, ...d.data() }));
    mergeAndNotify();
  });
  
  function mergeAndNotify() {
    const now = Date.now();
    const merged = [...messages1, ...messages2].sort((a, b) => {
      // Handle pending timestamps (null from serverTimestamp before it resolves)
      // Put pending messages at the end (most recent)
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : now + 1000;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : now + 1000;
      
      // If both are pending or both have timestamps, compare normally
      if (timeA === timeB) {
        // Fallback to ID comparison for stable sort
        return (a.id || '').localeCompare(b.id || '');
      }
      
      return timeA - timeB;
    });
    onChange(merged);
  }
  
  // Return unsubscribe function that cleans up both listeners
  return () => {
    unsub1();
    unsub2();
  };
}

/**
 * listConversationsForUser - derive conversations by grouping messages by the counterpart id.
 * Returns items: { counterpartId: string, counterpartRole: 'teacher'|'parent'|'support', lastMessage, lastAt, type, category, subject }
 * Supports both regular teacher<->parent messages and support messages (type='support')
 * Uses collectionGroup to query across all message subcollections
 * @param {string} userId - User ID
 * @param {string} role - User role ('teacher' or 'parent')
 * @param {boolean} includeSupport - Whether to include support messages (default: false)
 * @param {string} serviceType - default 'education'
 */
export async function listConversationsForUser(userId, role, includeSupport = false, serviceType = 'education') {
  if (!db) throw new Error('Firestore not initialized');
  
  const { collectionGroup } = await import('firebase/firestore');
  const messagesRef = collectionGroup(db, 'messages');
  
  // Query 1: Regular messages (teacher<->parent)
  const q1 = role === 'teacher'
    ? query(messagesRef, where('teacherId', '==', userId), orderBy('createdAt', 'desc'))
    : query(messagesRef, where('parentId', '==', userId), orderBy('createdAt', 'desc'));
  
  // Only query support messages if includeSupport is true
  const queries = [getDocs(q1)];
  
  if (includeSupport) {
    // Query 2: Support messages where user is recipient
    const q2 = query(messagesRef, where('recipientId', '==', userId), orderBy('createdAt', 'desc'));
    // Query 3: Support messages where user is sender
    const q3 = query(messagesRef, where('senderId', '==', userId), orderBy('createdAt', 'desc'));
    queries.push(getDocs(q2), getDocs(q3));
  }
  
  const results = await Promise.all(queries);
  const [snap1, snap2, snap3] = results;
  
  const map = new Map();
  
  // Process regular messages
  snap1.forEach(docSnap => {
    const m = { id: docSnap.id, ...docSnap.data() };
    if (m.type === 'support') return; // Skip support messages in regular query
    const counterpartId = role === 'teacher' ? m.parentId : m.teacherId;
    if (!counterpartId) return;
    if (!map.has(counterpartId)) {
      map.set(counterpartId, { 
        counterpartId, 
        counterpartRole: role === 'teacher' ? 'parent' : 'teacher', 
        lastMessage: m.text || m.content, 
        lastAt: m.createdAt || m.timestamp,
        type: 'regular'
      });
    }
  });
  
  // Process support messages only if includeSupport is true
  if (includeSupport && snap2) {
    // Process support messages (as recipient)
    snap2.forEach(docSnap => {
      const m = { id: docSnap.id, ...docSnap.data() };
      if (m.type !== 'support') return;
      const counterpartId = m.senderId;
      if (!counterpartId) return;
      const conversationKey = `support-${counterpartId}`;
      if (!map.has(conversationKey)) {
        map.set(conversationKey, { 
          counterpartId, 
          counterpartRole: m.senderRole || 'guest',
          counterpartName: m.senderName,
          counterpartEmail: m.senderEmail,
          lastMessage: m.text || m.subject || m.content, 
          lastAt: m.createdAt || m.timestamp,
          type: 'support',
          category: m.category,
          subject: m.subject,
          isRead: m.read
        });
      }
    });
  }
  
  if (includeSupport && snap3) {
    // Process support messages (as sender)
    snap3.forEach(docSnap => {
      const m = { id: docSnap.id, ...docSnap.data() };
      if (m.type !== 'support') return;
      const counterpartId = m.recipientId;
      if (!counterpartId) return;
      const conversationKey = `support-${counterpartId}`;
      if (!map.has(conversationKey)) {
        map.set(conversationKey, { 
          counterpartId, 
          counterpartRole: m.recipientRole || 'admin',
          counterpartName: m.recipientEmail?.split('@')[0] || 'Admin',
          lastMessage: m.text || m.subject || m.content, 
          lastAt: m.createdAt || m.timestamp,
          type: 'support',
          category: m.category,
          subject: m.subject,
          isRead: m.read
        });
      }
    });
  }
  
  return Array.from(map.values()).sort((a, b) => {
    const timeA = a.lastAt?.toMillis ? a.lastAt.toMillis() : 0;
    const timeB = b.lastAt?.toMillis ? b.lastAt.toMillis() : 0;
    return timeB - timeA;
  });
}

/**
 * sendSupportMessage - send support/contact message to all admins
 * @param {Object} params
 * @param {string} params.userId - Sender's user ID
 * @param {string} params.senderName - Sender's name
 * @param {string} params.senderEmail - Sender's email
 * @param {string} params.senderRole - Sender's role ('teacher' | 'parent')
 * @param {string} params.category - Message category (General, Technical, Billing, etc.)
 * @param {string} params.subject - Message subject
 * @param {string} params.text - Message content
 */
export async function sendSupportMessage({ userId, senderName, senderEmail, senderRole, category, subject, text }) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !text?.trim()) throw new Error('userId and text required');

  // Get all admins
  const { collection: fsCollection, getDocs: fsGetDocs } = await import('firebase/firestore');
  const adminsRef = fsCollection(db, 'admins');
  const adminsSnap = await fsGetDocs(adminsRef);
  
  if (adminsSnap.empty) {
    throw new Error('No admins found in system');
  }

  const adminEmails = [];
  adminsSnap.forEach(doc => {
    const adminData = doc.data();
    if (adminData.role === 'admin' && adminData.isActive !== false) {
      adminEmails.push(adminData.email);
    }
  });

  if (adminEmails.length === 0) {
    throw new Error('No active admins found');
  }

  // Find admin user documents (need UIDs for messages)
  const adminUserIds = [];
  for (const email of adminEmails) {
    // Check teachers collection
    const teachersRef = fsCollection(db, 'teachers');
    const teachersQuery = query(teachersRef, where('email', '==', email));
    const teachersSnap = await fsGetDocs(teachersQuery);
    
    if (!teachersSnap.empty) {
      teachersSnap.forEach(doc => adminUserIds.push({ uid: doc.id, email }));
      continue;
    }

    // Check parents collection
    const parentsRef = fsCollection(db, 'parents');
    const parentsQuery = query(parentsRef, where('email', '==', email));
    const parentsSnap = await fsGetDocs(parentsQuery);
    
    if (!parentsSnap.empty) {
      parentsSnap.forEach(doc => adminUserIds.push({ uid: doc.id, email }));
    }
  }

  if (adminUserIds.length === 0) {
    throw new Error('Admin user accounts not found');
  }

  // Create message for each admin
  const messageText = `📩 Support Request [${category}]\n📧 From: ${senderName} (${senderEmail})\n📝 Subject: ${subject}\n\n${text.trim()}`;
  
  const messages = [];
  for (const admin of adminUserIds) {
    const messagePayload = {
      senderId: userId,
      senderName,
      senderEmail,
      senderRole,
      recipientId: admin.uid,
      recipientEmail: admin.email,
      recipientRole: 'admin',
      category,
      subject,
      text: messageText,
      type: 'support',
      read: false,
      createdAt: serverTimestamp(),
    };

    // Store support message under sender's document (like regular messages)
    const senderCollection = senderRole === 'teacher' ? 'teachers' : 'parents';
    const messagesRef = fsCollection(db, 'serviceTypes', 'education', senderCollection, userId, 'messages');
    const messageDoc = await addDoc(messagesRef, messagePayload);
    messages.push({ id: messageDoc.id, ...messagePayload });

    // Check if admin is active (lastActive within last 5 minutes)
    const { doc: fsDoc, getDoc: fsGetDoc } = await import('firebase/firestore');
    const adminCollection = senderRole === 'teacher' ? 'teachers' : 'parents';
    const adminDocRef = fsDoc(db, adminCollection, admin.uid);
    const adminDocSnap = await fsGetDoc(adminDocRef);
    
    let isAdminActive = false;
    if (adminDocSnap.exists()) {
      const adminData = adminDocSnap.data();
      const lastActive = adminData.lastActive?.toMillis ? adminData.lastActive.toMillis() : null;
      if (lastActive) {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        isAdminActive = lastActive > fiveMinutesAgo;
      }
    }

    // Send push notification only if admin is NOT active
    if (!isAdminActive) {
      try {
        const { sendExpoPushNotification } = await import('./pushService');
        const token = adminDocSnap.exists() ? adminDocSnap.data()?.pushToken : null;
        
        if (token) {
          await sendExpoPushNotification(
            token,
            `📩 Support: ${category}`,
            `${senderName}: ${subject}`,
            { 
              type: 'support_message',
              messageId: messageDoc.id,
              senderId: userId,
              category
            }
          );
          console.log(`✅ Push notification sent to admin: ${admin.email}`);
        }
      } catch (pushError) {
        console.warn(`⚠️ Failed to send push to admin ${admin.email}:`, pushError);
      }
    } else {
      console.log(`ℹ️ Admin ${admin.email} is active, skipping push notification`);
    }
  }

  return messages;
}

