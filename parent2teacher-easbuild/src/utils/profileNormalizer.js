/**
 * 🔧 Profile Normalizer Utility
 * 
 * Flattens nested Firestore profile structures into a single merged object.
 * Handles various nesting levels: root + profile + profile.profile
 * 
 * Usage:
 *   const normalized = normalizeProfile(firestoreDoc.data());
 */

/**
 * Normalize profile data from Firestore document
 * Merges root-level fields with nested profile object(s)
 * 
 * @param {Object} raw - Raw Firestore document data
 * @param {string} role - Optional role for logging ('teacher', 'parent')
 * @returns {Object} Flattened profile object with all fields at root level
 */
export const normalizeProfile = (raw, role = 'user') => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  // Extract nested profile objects
  const nested = raw.profile || {};
  const doubleNested = nested.profile || {};

  // Merge all levels (later values override earlier)
  const merged = { ...raw, ...nested, ...doubleNested };

  return merged;
};

/**
 * Convert string or array to array
 * Handles comma-separated strings and ensures consistent array output
 * 
 * @param {*} value - Value to convert (string, array, or other)
 * @returns {Array} Normalized array
 */
export const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Normalize parent-specific fields
 * Handles special mappings and array conversions
 * 
 * @param {Object} merged - Pre-merged profile data
 * @returns {Object} Parent profile with normalized arrays and mapped fields
 */
export const normalizeParentProfile = (merged) => {
  return {
    ...merged,
    childrenGrades: toArray(merged.childrenGrades),
    subjectsNeeded: toArray(merged.subjectsNeeded).length 
      ? toArray(merged.subjectsNeeded) 
      : toArray(merged.lookingFor),
    lookingFor: toArray(merged.lookingFor),
    preferredTeachingStyle: toArray(merged.preferredTeachingStyle),
    learningPreferences: toArray(merged.learningPreferences),
    specialNeeds: toArray(merged.specialNeeds).length 
      ? toArray(merged.specialNeeds) 
      : (merged.specificNeeds ? [merged.specificNeeds] : []),
    availability: toArray(merged.availability),
    languages: toArray(merged.languages),
    location: toArray(merged.location),
    phone: merged.phone || merged.phoneNumber || '',
  };
};

/**
 * Normalize teacher-specific fields
 * Handles special mappings and array conversions
 * 
 * @param {Object} merged - Pre-merged profile data
 * @returns {Object} Teacher profile with normalized arrays
 */
export const normalizeTeacherProfile = (merged) => {
  return {
    ...merged,
    subjects: toArray(merged.subjects),
    teachingMethods: toArray(merged.teachingMethods),
    languages: toArray(merged.languages),
    availability: toArray(merged.availability),
    teachingStyles: toArray(merged.teachingStyles),
    location: toArray(merged.location),
    phone: merged.phone || merged.phoneNumber || '',
  };
};

/**
 * Full profile normalization with role-specific handling
 * 
 * @param {Object} raw - Raw Firestore document data
 * @param {string} role - User role ('teacher' or 'parent')
 * @returns {Object} Fully normalized profile
 */
export const normalizeUserProfile = (raw, role) => {
  const merged = normalizeProfile(raw, role);
  
  if (role === 'parent') {
    return normalizeParentProfile(merged);
  } else if (role === 'teacher') {
    return normalizeTeacherProfile(merged);
  }
  
  return merged;
};

export default {
  normalizeProfile,
  normalizeUserProfile,
  normalizeParentProfile,
  normalizeTeacherProfile,
  toArray
};
