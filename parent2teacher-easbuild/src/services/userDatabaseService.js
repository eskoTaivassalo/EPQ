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
  
  return roleMap[role] || { serviceType: 'education', collection: 'parents', isProvider: false };
};

/**
 * Create or update main user profile in users/{userId}
 */
export const createOrUpdateUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    const mainProfile = {
      uid: userId,
      email: userData.email,
      displayName: userData.name || userData.fullName,
      emailVerified: userData.emailVerified || false,
      updatedAt: new Date().toISOString(),
    };
    
    if (userSnap.exists()) {
      // Update existing user - add new role to roles array
      const existingData = userSnap.data();
      const existingRoles = existingData.roles || [];
      const newRole = userData.role || userData.userType;
      
      if (!existingRoles.includes(newRole)) {
        existingRoles.push(newRole);
      }
      
      await updateDoc(userRef, {
        ...mainProfile,
        roles: existingRoles,
        // Don't override primaryRole if it already exists
        ...(existingData.primaryRole ? {} : { primaryRole: newRole })
      });
      
      return { ...existingData, ...mainProfile, roles: existingRoles };
    } else {
      // Create new user
      const newUserData = {
        ...mainProfile,
        roles: [userData.role || userData.userType],
        primaryRole: userData.role || userData.userType,
        createdAt: new Date().toISOString(),
      };
      
      if (userData.profileImageUrl) {
        newUserData.profileImageUrl = userData.profileImageUrl;
      }
      
      await setDoc(userRef, newUserData);
      return newUserData;
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
};

/**
 * Create or update role-specific profile
 * Path: users/{userId}/{collectionName}/{userId}
 * Example: users/123/teachers/123
 */
export const createOrUpdateRoleProfile = async (userId, role, profileData) => {
  try {
    console.log('🔧 createOrUpdateRoleProfile called with:', {
      userId,
      role,
      subjects: profileData.subjects,
      allKeys: Object.keys(profileData)
    });
    
    const { serviceType, collection: collectionName } = getRoleCollectionInfo(role);
    
    // Path: serviceTypes/{serviceType}/{collectionName}/{userId}
    // Example: serviceTypes/therapy/therapists/abc123
    const roleProfileRef = doc(db, 'serviceTypes', serviceType, collectionName, userId);
    
    const roleProfile = {
      ...profileData,
      userId,
      role,
      serviceType,
      collectionName,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('💾 Saving role profile with subjects:', roleProfile.subjects);
    console.log('💾 Full roleProfile keys:', Object.keys(roleProfile));
    
    const roleSnap = await getDoc(roleProfileRef);
    
    if (roleSnap.exists()) {
      console.log('📝 Updating existing profile with subjects:', roleProfile.subjects);
      await updateDoc(roleProfileRef, roleProfile);
    } else {
      roleProfile.createdAt = new Date().toISOString();
      console.log('📝 Creating NEW profile with subjects:', roleProfile.subjects);
      console.log('📝 Document path:', `serviceTypes/${serviceType}/${collectionName}/${userId}`);
      console.log('📝 FULL data being saved:', JSON.stringify(roleProfile, null, 2));
      await setDoc(roleProfileRef, roleProfile);
    }
    
    console.log('✅ Profile saved! Verifying...');
    const verifySnap = await getDoc(roleProfileRef);
    if (verifySnap.exists()) {
      const savedData = verifySnap.data();
      console.log('✅ Verified - subjects in Firestore:', savedData.subjects);
      console.log('✅ Verified - all fields:', Object.keys(savedData));
    } else {
      console.error('❌ Document was not saved!');
    }
    
    return roleProfile;
  } catch (error) {
    console.error('Error creating/updating role profile:', error);
    throw error;
  }
};

/**
 * Get user's main profile
 */
export const getUserMainProfile = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    return { id: userSnap.id, ...userSnap.data() };
  } catch (error) {
    console.error('Error getting user main profile:', error);
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
    console.error('Error getting user role profile:', error);
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
    console.error('Error getting complete user profile:', error);
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
    
    // 1. Create/update main user profile
    const mainProfile = await createOrUpdateUserProfile(userId, {
      email: userData.email,
      name: userData.name || userData.fullName,
      fullName: userData.name || userData.fullName,
      emailVerified: userData.emailVerified || false,
      role,
      userType: role,
      profileImageUrl: userData.profileImageUrl,
    });
    
    // 2. Create role-specific profile with all the extra data
    const roleProfile = await createOrUpdateRoleProfile(userId, role, userData);
    
    return {
      ...mainProfile,
      roleProfile,
      userType: role,
    };
  } catch (error) {
    console.error('Error registering user with role:', error);
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
      console.warn(`Role ${role} is not a provider role`);
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
    console.error('Error getting all providers:', error);
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
    console.error('Error getting user by email (legacy):', error);
    throw error;
  }
};

/**
 * Add a new role to an existing user account
 * This is used when a user wants to have multiple roles (e.g., both teacher and therapist)
 */
export const addRoleToUser = async (userId, role, roleProfileData) => {
  try {
    console.log('🔧 addRoleToUser called with:', { userId, role });
    
    // 1. Update main user profile to include the new role
    await createOrUpdateUserProfile(userId, {
      ...roleProfileData,
      role,
      email: roleProfileData.email,
      name: roleProfileData.name || roleProfileData.fullName,
    });
    
    // 2. Create the role-specific profile
    await createOrUpdateRoleProfile(userId, role, roleProfileData);
    
    console.log('✅ Role added successfully to user:', userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error adding role to user:', error);
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
