/**
 * Role Configuration System
 * 
 * Centralized configuration for all user roles in the application.
 * Makes it easy to add new roles and maintain consistency across the app.
 * 
 * MVP Roles:
 * - service_provider (teacher/tutor/consultant)
 * - client (parent/student/customer)
 * 
 * Future roles could include: admin, moderator, institution, etc.
 */

import { colors, roleAccents } from '../styles/commonStyles';

export const ROLE_TYPES = {
  SERVICE_PROVIDER: 'service_provider',
  CLIENT: 'client',
  COACH: 'coach',
  ATHLETE: 'athlete',
  THERAPIST: 'therapist',
  THERAPY_CLIENT: 'therapy_client',
  ADMIN: 'admin',
  // Legacy support
  TEACHER: 'teacher',
  PARENT: 'parent',
};

// Role categories for easier grouping
export const ROLE_CATEGORIES = {
  PROVIDER: 'provider', // Service providers (teachers, coaches, consultants, etc.)
  CUSTOMER: 'customer', // Customers/clients (parents, athletes, students, etc.)
};

// Map legacy roles to new roles
export const LEGACY_ROLE_MAP = {
  teacher: ROLE_TYPES.SERVICE_PROVIDER,
  parent: ROLE_TYPES.CLIENT,
};

/**
 * Get the canonical role name (handles legacy roles)
 */
export const getCanonicalRole = (role) => {
  return LEGACY_ROLE_MAP[role] || role;
};

/**
 * Check if role is service provider
 */
export const isServiceProvider = (role) => {
  const canonical = getCanonicalRole(role);
  return canonical === ROLE_TYPES.SERVICE_PROVIDER;
};

/**
 * Check if role is client
 */
export const isClient = (role) => {
  const canonical = getCanonicalRole(role);
  return canonical === ROLE_TYPES.CLIENT;
};

/**
 * Role Configuration
 * Each role defines its UI appearance, available features, and behavior
 */
export const ROLE_CONFIG = {
  [ROLE_TYPES.SERVICE_PROVIDER]: {
    id: ROLE_TYPES.SERVICE_PROVIDER,
    name: 'Teacher',
    nameLocalized: 'Teacher',
    namePlural: 'Teachers',
    namePluralLocalized: 'Teachers',
    description: 'Provide teaching and tutoring services to students',
    category: ROLE_CATEGORIES.PROVIDER,
    tags: ['education', 'tutoring', 'teaching'],
    
    // Legacy name for backward compatibility
    legacyName: 'teacher',
    
    // Firestore collection name
    collectionName: 'teachers', // Will migrate to 'service_providers' later
    
    // UI Theme - yhtenäiset värit + rooli-spesifinen accent
    colors: {
      primary: roleAccents.teacher,  // Rooli-spesifinen accent-väri
      secondary: roleAccents.teacher,
      accent: roleAccents.teacher,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      border: colors.border,
    },
    
    // Icon
    icon: 'briefcase',
    iconOutline: 'briefcase-outline',
    
    // Features available to this role
    features: {
      canProvideServices: true,
      canSetAvailability: true,
      canReceiveBookings: true,
      canSendMessages: true,
      canReceiveMessages: true,
      canManageProfile: true,
      canViewAnalytics: true,
      canSetPricing: true,
      canManageCalendar: true,
    },
    
    // Navigation items for this role
    navigation: {
      dashboard: {
        name: 'Dashboard',
        icon: 'home',
        screen: 'Dashboard',
      },
      calendar: {
        name: 'My Calendar',
        icon: 'calendar',
        screen: 'Calendar',
      },
      availability: {
        name: 'Create Time Slots',
        icon: 'time',
        screen: 'Availability',
      },
      manageSlots: {
        name: 'Manage Slots',
        icon: 'settings',
        screen: 'ManageSlots',
      },
      bookings: {
        name: 'Bookings',
        icon: 'list',
        screen: 'Bookings',
      },
      clients: {
        name: 'Students',
        icon: 'people',
        screen: 'Clients',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Conversations',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'Profile',
      },
    },
    
    // Dashboard widgets/stats
    dashboardStats: [
      { key: 'activeBookings', label: 'Active Bookings', icon: 'calendar' },
      { key: 'totalClients', label: 'Total Students', icon: 'people' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
      { key: 'upcomingSessions', label: 'Upcoming Sessions', icon: 'time' },
    ],
    
    // Signup form fields
    signupFields: [
      { key: 'phoneNumber', type: 'phone', label: 'Phone Number', required: true },
      
      // Basic Teaching Info
      { key: 'subjects', type: 'tags', label: 'Subjects You Teach', required: true },
      { key: 'gradeRanges', type: 'tags', label: 'Grade Levels Qualified For', required: true },
      { key: 'hourlyRate', type: 'number', label: 'Hourly Rate (€)', required: true },
      
      // Qualifications
      { key: 'certifications', type: 'textarea', label: 'Certifications & Licenses (e.g., Texas Secondary Certification, IB Authorization)', required: false },
      { key: 'specializations', type: 'tags', label: 'Specializations', required: false },
      { key: 'yearsOfExperience', type: 'number', label: 'Years of Experience', required: false },
      { key: 'degrees', type: 'textarea', label: 'Degrees (list degree name and field)', required: false },
      { key: 'education', type: 'textarea', label: 'Educational Background', required: false },
      
      // Professional Details
      { key: 'academicInterests', type: 'tags', label: 'Academic/Teaching Interests', required: false },
      { key: 'teachingApproach', type: 'tags', label: 'Teaching Approach & Philosophy', required: false },
      { key: 'publications', type: 'textarea', label: 'Publications / Research Areas (optional)', required: false },
      
      // Methods & Communication
      { key: 'teachingMethods', type: 'tags', label: 'Teaching Methods (Online/In-Person/Hybrid)', required: false },
      { key: 'languages', type: 'tags', label: 'Languages You Teach In', required: false },
      
      // About
      { key: 'description', type: 'textarea', label: 'About You', required: true },
    ],
  },
  
  [ROLE_TYPES.CLIENT]: {
    id: ROLE_TYPES.CLIENT,
    name: 'Parent/Student',
    nameLocalized: 'Parent/Student',
    namePlural: 'Parents/Students',
    namePluralLocalized: 'Parents/Students',
    description: 'Find and book sessions with teachers and tutors',
    category: ROLE_CATEGORIES.CUSTOMER,
    tags: ['education', 'parenting', 'student'],
    
    // Label for the service providers this client seeks
    serviceProviderLabel: 'Teachers',
    serviceProviderLabelSingular: 'Teacher',
    
    // Legacy name for backward compatibility
    legacyName: 'parent',
    
    // Firestore collection name
    collectionName: 'parents', // Will migrate to 'clients' later
    
    // UI Theme - yhtenäiset värit + rooli-spesifinen accent
    colors: {
      primary: roleAccents.parent,
      secondary: roleAccents.parent,
      accent: roleAccents.parent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      border: colors.border,
    },
    
    // Icon
    icon: 'person',
    iconOutline: 'person-outline',
    
    // Features available to this role
    features: {
      canProvideServices: false,
      canSetAvailability: false,
      canReceiveBookings: false,
      canSendMessages: true,
      canReceiveMessages: true,
      canManageProfile: true,
      canViewAnalytics: false,
      canSetPricing: false,
      canManageCalendar: false,
      canBookServices: true,
      canSearchProviders: true,
      canWriteReviews: true,
    },
    
    // Navigation items for this role
    navigation: {
      dashboard: {
        name: 'Dashboard',
        icon: 'home',
        screen: 'Dashboard',
      },
      findProviders: {
        name: 'Find Teachers',
        icon: 'search',
        screen: 'FindProviders',
      },
      bookings: {
        name: 'My Bookings',
        icon: 'calendar',
        screen: 'Bookings',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Conversations',
      },
      favorites: {
        name: 'Favorite Teachers',
        icon: 'heart',
        screen: 'FavoriteProviders',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'Profile',
      },
    },
    
    // Signup form fields
    dashboardStats: [
      { key: 'upcomingBookings', label: 'Upcoming Bookings', icon: 'calendar' },
      { key: 'totalBookings', label: 'Total Bookings', icon: 'time' },
      { key: 'favoriteProviders', label: 'Favorite Teachers', icon: 'heart' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
    ],
    
    // Signup form fields
    signupFields: [
      { key: 'phoneNumber', type: 'phone', label: 'Phone Number', required: false },
      { key: 'childrenAges', type: 'text', label: 'Children Ages', required: false, placeholder: 'e.g. 8, 10, 12' },
      { key: 'subjectsNeeded', type: 'tags', label: 'Subjects Needed', required: false },
      { key: 'goals', type: 'textarea', label: 'Learning Goals', required: false },
      { key: 'notes', type: 'textarea', label: 'Additional Notes', required: false },
    ],
  },

  [ROLE_TYPES.THERAPIST]: {
    id: ROLE_TYPES.THERAPIST,
    name: 'Therapist',
    nameLocalized: 'Terapeutti',
    namePlural: 'Therapists',
    namePluralLocalized: 'Terapeutit',
    description: 'Provide therapy and counseling services',
    category: ROLE_CATEGORIES.PROVIDER,
    tags: ['therapy', 'mental health', 'counseling'],
    
    legacyName: 'therapist',
    collectionName: 'therapists',
    
    colors: {
      primary: '#E74C3C',
      secondary: '#C0392B',
      accent: '#EC7063',
      background: '#FFF5F5',
      card: '#FFFFFF',
      text: '#2C3E50',
      textSecondary: '#7F8C8D',
      success: '#27AE60',
      warning: '#F39C12',
      error: '#E74C3C',
    },
    
    icon: 'heart',
    iconOutline: 'heart-outline',
    
    features: {
      canProvideServices: true,
      canSetAvailability: true,
      canReceiveBookings: true,
      canSendMessages: true,
      canReceiveMessages: true,
      canManageProfile: true,
      canViewAnalytics: true,
      canSetPricing: true,
      canManageCalendar: true,
    },
    
    navigation: {
      dashboard: {
        name: 'Dashboard',
        icon: 'home',
        screen: 'Dashboard',
      },
      calendar: {
        name: 'My Calendar',
        icon: 'calendar',
        screen: 'Calendar',
      },
      availability: {
        name: 'Create Time Slots',
        icon: 'time',
        screen: 'Availability',
      },
      manageSlots: {
        name: 'Manage Slots',
        icon: 'settings',
        screen: 'ManageSlots',
      },
      bookings: {
        name: 'Bookings',
        icon: 'list',
        screen: 'Bookings',
      },
      clients: {
        name: 'Clients',
        icon: 'people',
        screen: 'Clients',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Conversations',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'Profile',
      },
    },
    
    dashboardStats: [
      { key: 'activeBookings', label: 'Active Sessions', icon: 'calendar' },
      { key: 'totalClients', label: 'Total Clients', icon: 'people' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
      { key: 'upcomingSessions', label: 'Upcoming Sessions', icon: 'time' },
    ],
    
    signupFields: [
      { key: 'phoneNumber', type: 'phone', label: 'Phone Number', required: true },
      { key: 'specializations', type: 'tags', label: 'Specializations', required: true },
      { key: 'hourlyRate', type: 'number', label: 'Hourly Rate (€)', required: true },
      { key: 'description', type: 'textarea', label: 'About You', required: true },
      { key: 'qualifications', type: 'textarea', label: 'Qualifications & Certifications', required: true },
    ],
  },

  [ROLE_TYPES.THERAPY_CLIENT]: {
    id: ROLE_TYPES.THERAPY_CLIENT,
    name: 'Therapy Client',
    nameLocalized: 'Therapy Client',
    namePlural: 'Therapy Clients',
    namePluralLocalized: 'Therapy Clients',
    description: 'Find and book therapy sessions',
    category: ROLE_CATEGORIES.CUSTOMER,
    tags: ['therapy', 'mental health', 'support'],
    
    serviceProviderLabel: 'Therapists',
    serviceProviderLabelSingular: 'Therapist',
    
    legacyName: 'teacher',
    collectionName: 'teachers',
    
    colors: {
      primary: roleAccents.therapist,
      secondary: colors.primaryDark,
      accent: roleAccents.therapist,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      border: colors.border,
    },
    
    icon: 'person',
    iconOutline: 'person-outline',
    
    features: {
      canProvideServices: false,
      canSetAvailability: false,
      canReceiveBookings: false,
      canSendMessages: true,
      canReceiveMessages: true,
      canManageProfile: true,
      canViewAnalytics: false,
      canSetPricing: false,
      canManageCalendar: false,
      canBookServices: true,
      canSearchProviders: true,
      canWriteReviews: true,
    },
    
    navigation: {
      dashboard: {
        name: 'Dashboard',
        icon: 'home',
        screen: 'Dashboard',
      },
      findProviders: {
        name: 'Find Therapists',
        icon: 'search',
        screen: 'FindProviders',
      },
      bookings: {
        name: 'My Sessions',
        icon: 'calendar',
        screen: 'Bookings',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Conversations',
      },
      favorites: {
        name: 'Favorite Therapists',
        icon: 'heart',
        screen: 'FavoriteProviders',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'Profile',
      },
    },
    
    dashboardStats: [
      { key: 'upcomingBookings', label: 'Upcoming Sessions', icon: 'calendar' },
      { key: 'totalBookings', label: 'Total Sessions', icon: 'time' },
      { key: 'favoriteProviders', label: 'Favorite Therapists', icon: 'heart' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
    ],
    
    signupFields: [
      { key: 'phoneNumber', type: 'phone', label: 'Phone Number', required: false },
      { key: 'therapyNeeds', type: 'tags', label: 'What brings you here?', required: false },
      { key: 'preferredLanguages', type: 'tags', label: 'Preferred Languages', required: false },
      { key: 'additionalInfo', type: 'textarea', label: 'Anything else we should know?', required: false },
    ],
  },

  [ROLE_TYPES.ADMIN]: {
    id: ROLE_TYPES.ADMIN,
    name: 'Administrator',
    nameLocalized: 'Ylläpitäjä',
    namePlural: 'Administrators',
    namePluralLocalized: 'Ylläpitäjät',
    description: 'Manage and moderate the platform',
    category: 'admin',
    tags: ['admin', 'management', 'moderation'],
    
    legacyName: 'admin',
    collectionName: 'admins',
    
    colors: {
      primary: roleAccents.admin,
      secondary: colors.primaryDark,
      accent: roleAccents.admin,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      border: colors.border,
    },
    
    icon: 'shield-checkmark',
    iconOutline: 'shield-checkmark-outline',
    
    features: {
      canProvideServices: false,
      canSetAvailability: false,
      canReceiveBookings: false,
      canSendMessages: true,
      canReceiveMessages: true,
      canManageProfile: true,
      canViewAnalytics: true,
      canSetPricing: false,
      canManageCalendar: false,
      canBookServices: false,
      canSearchProviders: true,
      canWriteReviews: false,
      // Admin-specific features
      canManageUsers: true,
      canViewAllBookings: true,
      canViewSystemStats: true,
      canModerateContent: true,
      canAccessReports: true,
    },
    
    navigation: {
      dashboard: {
        name: 'Admin Dashboard',
        icon: 'speedometer',
        screen: 'AdminDashboard',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Conversations',
      },
      users: {
        name: 'User Management',
        icon: 'people',
        screen: 'UserManagement',
      },
      bookings: {
        name: 'All Bookings',
        icon: 'calendar',
        screen: 'AdminBookings',
      },
      statistics: {
        name: 'Statistics',
        icon: 'stats-chart',
        screen: 'AdminStatistics',
      },
      reports: {
        name: 'Reports',
        icon: 'document-text',
        screen: 'AdminReports',
      },
      settings: {
        name: 'System Settings',
        icon: 'settings',
        screen: 'AdminSettings',
      },
    },
    
    dashboardStats: [
      { key: 'totalUsers', label: 'Total Users', icon: 'people' },
      { key: 'activeBookings', label: 'Active Bookings', icon: 'calendar' },
      { key: 'totalRevenue', label: 'Total Revenue', icon: 'cash' },
      { key: 'pendingReports', label: 'Pending Reports', icon: 'alert-circle' },
    ],
    
    serviceProviderLabel: 'Teachers',
    customerLabel: 'Parents',
  },

  [ROLE_TYPES.COACH]: {
    id: ROLE_TYPES.COACH,
    name: 'Coach',
    nameLocalized: 'Valmentaja',
    namePlural: 'Coaches',
    namePluralLocalized: 'Valmentajat',
    description: 'Provide coaching and training services',
    category: ROLE_CATEGORIES.PROVIDER,
    tags: ['sports', 'fitness', 'coaching', 'training'],
    
    legacyName: 'teacher',
    collectionName: 'teachers',
    
    colors: {
      primary: roleAccents.coach,
      secondary: colors.primaryDark,
      accent: roleAccents.coach,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      border: colors.border,
    },
    
    icon: 'fitness',
    iconOutline: 'fitness-outline',
    
    features: {
      canProvideServices: true,
      canSetAvailability: true,
      canReceiveBookings: true,
      canSendMessages: true,
      canReceiveMessages: true,
      canManageProfile: true,
      canViewAnalytics: true,
      canSetPricing: true,
      canManageCalendar: true,
    },
    
    navigation: {
      dashboard: {
        name: 'Dashboard',
        icon: 'home',
        screen: 'Dashboard',
      },
      calendar: {
        name: 'My Calendar',
        icon: 'calendar',
        screen: 'Calendar',
      },
      availability: {
        name: 'Availability',
        icon: 'time',
        screen: 'Availability',
      },
      bookings: {
        name: 'Sessions',
        icon: 'list',
        screen: 'Bookings',
      },
      clients: {
        name: 'Athletes',
        icon: 'people',
        screen: 'Clients',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Conversations',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'Profile',
      },
    },
    
    dashboardStats: [
      { key: 'activeBookings', label: 'Active Sessions', icon: 'calendar' },
      { key: 'totalClients', label: 'Total Athletes', icon: 'people' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
      { key: 'upcomingSessions', label: 'Upcoming Sessions', icon: 'time' },
    ],
    
    signupFields: [
      { key: 'displayName', type: 'text', label: 'Full Name', required: true },
      { key: 'email', type: 'email', label: 'Email', required: true },
      { key: 'password', type: 'password', label: 'Password', required: true },
      { key: 'phoneNumber', type: 'phone', label: 'Phone', required: true },
      { key: 'subjects', type: 'tags', label: 'Sports/Specialties', required: true },
      { key: 'experience', type: 'number', label: 'Years of Experience', required: false },
      { key: 'hourlyRate', type: 'number', label: 'Hourly Rate (€)', required: false },
      { key: 'description', type: 'textarea', label: 'About You', required: false },
    ],
  },

  [ROLE_TYPES.ATHLETE]: {
    id: ROLE_TYPES.ATHLETE,
    name: 'Athlete',
    nameLocalized: 'Urheilija',
    namePlural: 'Athletes',
    namePluralLocalized: 'Urheilijat',
    description: 'Find and book coaching sessions',
    category: ROLE_CATEGORIES.CUSTOMER,
    tags: ['sports', 'fitness', 'training'],
    
    legacyName: 'parent',
    collectionName: 'parents',
    
    colors: {
      primary: roleAccents.athlete,
      secondary: colors.primaryDark,
      accent: roleAccents.athlete,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      border: colors.border,
    },
    
    icon: 'barbell',
    iconOutline: 'barbell-outline',
    
    features: {
      canProvideServices: false,
      canSetAvailability: false,
      canReceiveBookings: false,
      canSendMessages: true,
      canReceiveMessages: true,
      canManageProfile: true,
      canViewAnalytics: false,
      canSetPricing: false,
      canManageCalendar: false,
      canBookServices: true,
      canSearchProviders: true,
      canWriteReviews: true,
    },
    
    navigation: {
      dashboard: {
        name: 'Dashboard',
        icon: 'home',
        screen: 'Dashboard',
      },
      findProviders: {
        name: 'Find Coaches',
        icon: 'search',
        screen: 'FindProviders',
      },
      bookings: {
        name: 'My Sessions',
        icon: 'calendar',
        screen: 'Bookings',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Conversations',
      },
      favorites: {
        name: 'Favorite Coaches',
        icon: 'heart',
        screen: 'FavoriteProviders',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'Profile',
      },
    },
    
    dashboardStats: [
      { key: 'upcomingBookings', label: 'Upcoming Sessions', icon: 'calendar' },
      { key: 'totalBookings', label: 'Total Sessions', icon: 'time' },
      { key: 'favoriteProviders', label: 'Favorite Coaches', icon: 'heart' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
    ],
    
    signupFields: [
      { key: 'displayName', type: 'text', label: 'Full Name', required: true },
      { key: 'email', type: 'email', label: 'Email', required: true },
      { key: 'password', type: 'password', label: 'Password', required: true },
      { key: 'phoneNumber', type: 'phone', label: 'Phone', required: false },
      { key: 'needs', type: 'tags', label: 'Sports Interested In', required: false },
      { key: 'preferences', type: 'textarea', label: 'Goals & Preferences', required: false },
    ],
  },
};

/**
 * Get role configuration
 * Handles legacy role names (teacher -> service_provider, parent -> client)
 */
export const getRoleConfig = (role) => {
  // Handle legacy role names
  const canonical = getCanonicalRole(role);
  return ROLE_CONFIG[canonical] || ROLE_CONFIG[ROLE_TYPES.CLIENT];
};

/**
 * Get all available roles
 */
export const getAvailableRoles = () => {
  return Object.values(ROLE_TYPES).filter(role => 
    role !== ROLE_TYPES.TEACHER && role !== ROLE_TYPES.PARENT
  );
};

/**
 * Get roles by category
 */
export const getRolesByCategory = (category) => {
  return Object.values(ROLE_CONFIG).filter(config => config.category === category);
};

/**
 * Get provider roles (teachers, coaches, consultants, etc.)
 */
export const getProviderRoles = () => {
  return getRolesByCategory(ROLE_CATEGORIES.PROVIDER);
};

/**
 * Get customer roles (parents, athletes, students, etc.)
 */
export const getCustomerRoles = () => {
  return getRolesByCategory(ROLE_CATEGORIES.CUSTOMER);
};

/**
 * Get role display name
 */
export const getRoleName = (role, localized = true) => {
  const config = getRoleConfig(role);
  return localized ? config.nameLocalized : config.name;
};

/**
 * Get role colors
 */
export const getRoleColors = (role) => {
  const config = getRoleConfig(role);
  return config.colors;
};

/**
 * Get role navigation items
 */
export const getRoleNavigation = (role) => {
  const config = getRoleConfig(role);
  return config.navigation;
};

/**
 * Check if role has feature
 */
export const hasFeature = (role, featureName) => {
  const config = getRoleConfig(role);
  return config.features[featureName] || false;
};

/**
 * Get Firestore collection name for role
 */
export const getRoleCollection = (role) => {
  const config = getRoleConfig(role);
  return config.collectionName;
};

export default ROLE_CONFIG;
