import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Admin Authorization Middleware
 * 
 * SECURITY: Only users in the 'admins' Firestore collection can access admin features.
 * This prevents unauthorized users from creating admin accounts through signup.
 * 
 * To add an admin:
 * 1. Manually add document to 'admins' collection in Firestore
 * 2. Document ID = user's email
 * 3. Document fields: { email: 'admin@example.com', role: 'admin', createdAt: timestamp }
 */

/**
 * Check if a user is an admin
 * @param {string} email - User's email address
 * @returns {Promise<boolean>} - True if user is admin
 */
export const isAdmin = async (email) => {
  if (!email) return false;
  
  try {
    // Check if email exists in admins collection
    const adminDocRef = doc(db, 'admins', email.toLowerCase());
    const adminDoc = await getDoc(adminDocRef);
    
    if (!adminDoc.exists()) {
      return false;
    }
    
    const adminData = adminDoc.data();
    
    // Verify the document has valid admin data
    if (adminData.role === 'admin' && adminData.isActive !== false) {
      console.log('✅ Admin verified:', email);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
};

/**
 * Get admin details
 * @param {string} email - User's email address
 * @returns {Promise<object|null>} - Admin data or null
 */
export const getAdminDetails = async (email) => {
  if (!email) return null;
  
  try {
    const adminDocRef = doc(db, 'admins', email.toLowerCase());
    const adminDoc = await getDoc(adminDocRef);
    
    if (!adminDoc.exists()) {
      return null;
    }
    
    return adminDoc.data();
  } catch (error) {
    console.error('❌ Error fetching admin details:', error);
    return null;
  }
};

/**
 * Verify admin access before performing admin action
 * Throws error if user is not admin
 * @param {string} email - User's email address
 */
export const requireAdmin = async (email) => {
  const adminStatus = await isAdmin(email);
  
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return true;
};

/**
 * Check if current user has admin permission in Redux state
 * @param {object} authState - Redux auth state
 * @returns {boolean}
 */
export const hasAdminPermission = (authState) => {
  return authState?.user?.isAdmin === true || authState?.user?.role === 'admin';
};
