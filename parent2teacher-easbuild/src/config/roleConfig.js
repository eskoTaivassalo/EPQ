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

export const ROLE_TYPES = {
  SERVICE_PROVIDER: 'service_provider',
  CLIENT: 'client',
  COACH: 'coach',
  ATHLETE: 'athlete',
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
    nameLocalized: 'Opettaja',
    namePlural: 'Teachers',
    namePluralLocalized: 'Opettajat',
    category: ROLE_CATEGORIES.PROVIDER,
    tags: ['education', 'tutoring', 'teaching'],
    
    // Legacy name for backward compatibility
    legacyName: 'teacher',
    
    // Firestore collection name
    collectionName: 'teachers', // Will migrate to 'service_providers' later
    
    // UI Theme
    colors: {
      primary: '#FF6B35',
      secondary: '#F7931E',
      accent: '#FF8C42',
      background: '#FFF5F0',
      card: '#FFFFFF',
      text: '#2C3E50',
      textSecondary: '#7F8C8D',
      success: '#27AE60',
      warning: '#F39C12',
      error: '#E74C3C',
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
        screen: 'TeacherDashboard', // Legacy screen name
      },
      availability: {
        name: 'Availability',
        icon: 'calendar',
        screen: 'TeacherAvailability',
      },
      bookings: {
        name: 'Bookings',
        icon: 'time',
        screen: 'TeacherBookings',
      },
      clients: {
        name: 'Clients',
        icon: 'people',
        screen: 'TeacherClients',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Messages',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'TeacherMyProfile',
      },
    },
    
    // Dashboard widgets/stats
    dashboardStats: [
      { key: 'activeBookings', label: 'Active Bookings', icon: 'calendar' },
      { key: 'totalClients', label: 'Total Clients', icon: 'people' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
      { key: 'upcomingSessions', label: 'Upcoming Sessions', icon: 'time' },
    ],
    
    // Signup form fields
    signupFields: [
      { key: 'displayName', type: 'text', label: 'Full Name', required: true },
      { key: 'email', type: 'email', label: 'Email', required: true },
      { key: 'password', type: 'password', label: 'Password', required: true },
      { key: 'phoneNumber', type: 'phone', label: 'Phone', required: true },
      { key: 'subjects', type: 'tags', label: 'Subjects/Services', required: true },
      { key: 'experience', type: 'number', label: 'Years of Experience', required: false },
      { key: 'hourlyRate', type: 'number', label: 'Hourly Rate (€)', required: false },
      { key: 'description', type: 'textarea', label: 'About You', required: false },
    ],
  },
  
  [ROLE_TYPES.CLIENT]: {
    id: ROLE_TYPES.CLIENT,
    name: 'Parent',
    nameLocalized: 'Vanhempi',
    namePlural: 'Parents',
    namePluralLocalized: 'Vanhemmat',
    category: ROLE_CATEGORIES.CUSTOMER,
    tags: ['education', 'parenting', 'student'],
    
    // Legacy name for backward compatibility
    legacyName: 'parent',
    
    // Firestore collection name
    collectionName: 'parents', // Will migrate to 'clients' later
    
    // UI Theme
    colors: {
      primary: '#3498DB',
      secondary: '#2980B9',
      accent: '#5DADE2',
      background: '#F0F8FF',
      card: '#FFFFFF',
      text: '#2C3E50',
      textSecondary: '#7F8C8D',
      success: '#27AE60',
      warning: '#F39C12',
      error: '#E74C3C',
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
        screen: 'ParentDashboard', // Legacy screen name
      },
      findProviders: {
        name: 'Find Services',
        icon: 'search',
        screen: 'FindTeachers',
      },
      bookings: {
        name: 'My Bookings',
        icon: 'calendar',
        screen: 'ParentBookings',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Messages',
      },
      favorites: {
        name: 'Favorites',
        icon: 'heart',
        screen: 'Favorites',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'ParentMyProfile',
      },
    },
    
    // Dashboard widgets/stats
    dashboardStats: [
      { key: 'upcomingBookings', label: 'Upcoming Bookings', icon: 'calendar' },
      { key: 'totalBookings', label: 'Total Bookings', icon: 'time' },
      { key: 'favoriteProviders', label: 'Favorite Providers', icon: 'heart' },
      { key: 'unreadMessages', label: 'Unread Messages', icon: 'mail' },
    ],
    
    // Signup form fields
    signupFields: [
      { key: 'displayName', type: 'text', label: 'Full Name', required: true },
      { key: 'email', type: 'email', label: 'Email', required: true },
      { key: 'password', type: 'password', label: 'Password', required: true },
      { key: 'phoneNumber', type: 'phone', label: 'Phone', required: false },
      { key: 'needs', type: 'tags', label: 'Services Needed', required: false },
      { key: 'preferences', type: 'textarea', label: 'Preferences', required: false },
    ],
  },

  [ROLE_TYPES.COACH]: {
    id: ROLE_TYPES.COACH,
    name: 'Coach',
    nameLocalized: 'Valmentaja',
    namePlural: 'Coaches',
    namePluralLocalized: 'Valmentajat',
    category: ROLE_CATEGORIES.PROVIDER,
    tags: ['sports', 'fitness', 'coaching', 'training'],
    
    legacyName: 'teacher',
    collectionName: 'teachers',
    
    colors: {
      primary: '#2ECC71',
      secondary: '#27AE60',
      accent: '#58D68D',
      background: '#F0FFF4',
      card: '#FFFFFF',
      text: '#2C3E50',
      textSecondary: '#7F8C8D',
      success: '#27AE60',
      warning: '#F39C12',
      error: '#E74C3C',
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
        screen: 'TeacherDashboard',
      },
      availability: {
        name: 'Availability',
        icon: 'calendar',
        screen: 'TeacherAvailability',
      },
      bookings: {
        name: 'Sessions',
        icon: 'time',
        screen: 'TeacherBookings',
      },
      clients: {
        name: 'Athletes',
        icon: 'people',
        screen: 'TeacherClients',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Messages',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'TeacherMyProfile',
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
    category: ROLE_CATEGORIES.CUSTOMER,
    tags: ['sports', 'fitness', 'training'],
    
    legacyName: 'parent',
    collectionName: 'parents',
    
    colors: {
      primary: '#E67E22',
      secondary: '#D35400',
      accent: '#F39C12',
      background: '#FFF8F0',
      card: '#FFFFFF',
      text: '#2C3E50',
      textSecondary: '#7F8C8D',
      success: '#27AE60',
      warning: '#F39C12',
      error: '#E74C3C',
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
        screen: 'ParentDashboard',
      },
      findProviders: {
        name: 'Find Coaches',
        icon: 'search',
        screen: 'FindTeachers',
      },
      bookings: {
        name: 'My Sessions',
        icon: 'calendar',
        screen: 'ParentBookings',
      },
      messages: {
        name: 'Messages',
        icon: 'chatbubbles',
        screen: 'Messages',
      },
      favorites: {
        name: 'Favorites',
        icon: 'heart',
        screen: 'Favorites',
      },
      profile: {
        name: 'Profile',
        icon: 'person',
        screen: 'ParentMyProfile',
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
 */
export const getRoleConfig = (role) => {
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
