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

    const messagesRef = fsCollection(db, 'messages');
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

