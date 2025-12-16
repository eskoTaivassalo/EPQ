/**
 * userDatabaseService.js
 * 
 * Service-type based hierarchical database structure for multi-role support
 * 
 * Structure:
 * users/{userId} - Main user profile (all roles)
 * serviceTypes/{serviceType}/{collectionName}/{userId} - Role-specific data
 * 
 * Examples:
 * serviceTypes/education/teachers/123 - Teacher profile
 * serviceTypes/education/parents/123 - Parent profile
 * serviceTypes/therapy/therapists/456 - Therapist profile
 * serviceTypes/therapy/clients/456 - Therapy client profile
 * serviceTypes/coaching/coaches/789 - Coach profile
 * serviceTypes/coaching/athletes/789 - Athlete profile
 * 
 * Benefits:
 * - Service grouping: All therapy-related roles under serviceTypes/therapy
 * - Easy to query: collectionGroup('therapists') finds all therapists across all serviceTypes
 * - Scalable: Each service type has its own hierarchy
 * - Clear separation: Each role has dedicated subcollection under its service type
 */

import { db } from '../config/firebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  collectionGroup,
  query,
  where,
  getDocs 
} from 'firebase/firestore';

/**
 * Get collection name and metadata from role
 * Returns collection info for structure: serviceTypes/{serviceType}/{collection}/{userId}
 */
export const getRoleCollectionInfo = (role) => {
  // Normalize role to lowercase for consistent lookup
  const normalizedRole = role ? role.toLowerCase() : '';
  
  const roleMap = {
    // Education
    'teacher': { serviceType: 'education', collection: 'teachers', isProvider: true },
    'service_provider': { serviceType: 'education', collection: 'teachers', isProvider: true },
    'parent': { serviceType: 'education', collection: 'parents', isProvider: false },
    'client': { serviceType: 'education', collection: 'parents', isProvider: false },
    
    // Therapy
    'therapist': { serviceType: 'therapy', collection: 'therapists', isProvider: true },
    'therapy_client': { serviceType: 'therapy', collection: 'clients', isProvider: false },
    
    // Coaching
    'coach': { serviceType: 'coaching', collection: 'coaches', isProvider: true },
    'athlete': { serviceType: 'coaching', collection: 'athletes', isProvider: false },
  };
  
  return roleMap[normalizedRole] || { serviceType: 'education', collection: 'parents', isProvider: false };
};

/**
 * Create or update main user profile - now stored only in serviceTypes hierarchy
 * No longer uses users collection
 */
export const createOrUpdateUserProfile = async (userId, userData) => {
  // This function is kept for compatibility but doesn't create users collection anymore
  // All data goes to role-specific profile in serviceTypes
  return {
    uid: userId,
    email: userData.email,
    displayName: userData.name || userData.fullName,
    name: userData.name || userData.fullName,
    emailVerified: userData.emailVerified || false,
    role: userData.role || userData.userType,
    userType: userData.role || userData.userType,
  };
};

/**
 * Create or update role-specific profile
 * Path: users/{userId}/{collectionName}/{userId}
 * Example: users/123/teachers/123
 */
export const createOrUpdateRoleProfile = async (userId, role, profileData) => {
  try {
    const { serviceType, collection: collectionName } = getRoleCollectionInfo(role);
    
    // Path: serviceTypes/{serviceType}/{collectionName}/{userId}
    // Example: serviceTypes/therapy/therapists/abc123
    const roleProfileRef = doc(db, 'serviceTypes', serviceType, collectionName, userId);
    
    // 🔒 SECURITY: Remove password and confirmPassword from profile data
    // Firebase Auth handles passwords - they should NEVER be in Firestore
    const { password, confirmPassword, ...safeProfileData } = profileData;
    
    const roleProfile = {
      ...safeProfileData,
      userId,
      uid: userId,
      role,
      userType: role,
      serviceType,
      collectionName,
      email: profileData.email,
      name: profileData.name || profileData.fullName,
      fullName: profileData.name || profileData.fullName,
      displayName: profileData.name || profileData.fullName,
      emailVerified: profileData.emailVerified || false,
      updatedAt: new Date().toISOString(),
    };
    
    const roleSnap = await getDoc(roleProfileRef);
    
    if (roleSnap.exists()) {
      await updateDoc(roleProfileRef, roleProfile);
    } else {
      roleProfile.createdAt = new Date().toISOString();
      await setDoc(roleProfileRef, roleProfile);
    }
    
    return roleProfile;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's main profile from serviceTypes structure
 * Searches both teachers and parents collections
 */
export const getUserMainProfile = async (userId) => {
  try {
    // Try teachers first
    const teacherRef = doc(db, 'serviceTypes', 'education', 'teachers', userId);
    const teacherSnap = await getDoc(teacherRef);
    
    if (teacherSnap.exists()) {
      return { id: teacherSnap.id, ...teacherSnap.data(), primaryRole: 'SERVICE_PROVIDER' };
    }
    
    // Try parents
    const parentRef = doc(db, 'serviceTypes', 'education', 'parents', userId);
    const parentSnap = await getDoc(parentRef);
    
    if (parentSnap.exists()) {
      return { id: parentSnap.id, ...parentSnap.data(), primaryRole: 'CLIENT' };
    }
    
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's role-specific profile
 * Path: serviceTypes/{serviceType}/{collectionName}/{userId}
 */
export const getUserRoleProfile = async (userId, role) => {
  try {
    const { serviceType, collection: collectionName } = getRoleCollectionInfo(role);
    const roleProfileRef = doc(db, 'serviceTypes', serviceType, collectionName, userId);
    const roleSnap = await getDoc(roleProfileRef);
    
    if (!roleSnap.exists()) {
      return null;
    }
    
    return { id: roleSnap.id, ...roleSnap.data() };
  } catch (error) {
    throw error;
  }
};

/**
 * Get complete user profile (main + all roles)
 */
export const getCompleteUserProfile = async (userId) => {
  try {
    const mainProfile = await getUserMainProfile(userId);
    
    if (!mainProfile) {
      return null;
    }
    
    // Get all role profiles
    const roleProfiles = {};
    const roles = mainProfile.roles || [];
    
    for (const role of roles) {
      const roleProfile = await getUserRoleProfile(userId, role);
      if (roleProfile) {
        roleProfiles[role] = roleProfile;
      }
    }
    
    return {
      ...mainProfile,
      roleProfiles
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Register new user with role
 * Creates both main profile and role-specific profile
 */
export const registerUserWithRole = async (userId, userData) => {
  try {
    const role = userData.role || userData.userType;
    
    // Create role-specific profile with ALL user data (no separate users collection)
    const roleProfile = await createOrUpdateRoleProfile(userId, role, userData);
    
    return {
      ...roleProfile,
      userType: role,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Query all providers of a specific type
 * Example: getAllProviders('therapist') returns all therapists
 * Uses collectionGroup to query serviceTypes/{anyServiceType}/therapists/{userId}
 */
export const getAllProviders = async (role) => {
  try {
    const { serviceType, collection: collectionName, isProvider } = getRoleCollectionInfo(role);
    
    if (!isProvider) {
      return [];
    }
    
    // Query collection group - finds all documents in any therapists/teachers/etc subcollection
    // Example: collectionGroup('therapists') finds all serviceTypes/{serviceType}/therapists/{userId}
    const providersQuery = collectionGroup(db, collectionName);
    const snapshot = await getDocs(providersQuery);
    
    const providers = [];
    snapshot.forEach(doc => {
      providers.push({ id: doc.id, ...doc.data() });
    });
    
    return providers;
  } catch (error) {
    throw error;
  }
};

/**
 * Legacy support: Get user by email from old structure
 * Used during migration period
 */
export const getUserByEmailLegacy = async (email, role) => {
  try {
    // Try new structure first
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      return { id: snapshot.docs[0].id, ...userData };
    }
    
    // Fallback to old structure (teachers/ or parents/)
    const legacyCollection = role === 'teacher' ? 'teachers' : 'parents';
    const legacyRef = collection(db, legacyCollection);
    const legacyQ = query(legacyRef, where('email', '==', email));
    const legacySnapshot = await getDocs(legacyQ);
    
    if (!legacySnapshot.empty) {
      return { id: legacySnapshot.docs[0].id, ...legacySnapshot.docs[0].data() };
    }
    
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Add a new role to an existing user account
 * This is used when a user wants to have multiple roles (e.g., both teacher and therapist)
 */
export const addRoleToUser = async (userId, role, roleProfileData) => {
  try {
    // 1. Update main user profile to include the new role
    await createOrUpdateUserProfile(userId, {
      ...roleProfileData,
      role,
      email: roleProfileData.email,
      name: roleProfileData.name || roleProfileData.fullName,
    });
    
    // 2. Create the role-specific profile
    await createOrUpdateRoleProfile(userId, role, roleProfileData);
    
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export default {
  getRoleCollectionInfo,
  createOrUpdateUserProfile,
  createOrUpdateRoleProfile,
  getUserMainProfile,
  getUserRoleProfile,
  getCompleteUserProfile,
  registerUserWithRole,
  getAllProviders,
  getUserByEmailLegacy,
  addRoleToUser,
};
