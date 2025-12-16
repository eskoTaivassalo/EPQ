/**
 * 🗺️ CONTEXT ARCHITECTURE PLAN
 * 
 * Suunnitelma Context-arkkitehtuurin jakamiselle:
 * 
 * 1. AuthContext - Pelkkä autentikointi
 * 2. UserContext - Käyttäjädatan hallinta  
 * 3. TeacherContext - Opettajien data ja toiminnot
 * 4. ParentContext - Vanhempien data ja toiminnot
 * 5. SecurityContext - Turvallisuustoiminnot
 * 6. GDPRContext - Tietosuoja ja compliance
 */

// 🔐 AuthContext - CORE AUTHENTICATION
export const AuthContext = {
  responsibilities: [
    'login/logout/register',
    'user state (user, loading, isAuthenticated)',
    'email verification',
    'Firebase auth state management',
    'refreshUser functionality'
  ],
  exports: [
    'user',
    'loading', 
    'isAuthenticated',
    'login',
    'logout',
    'register',
    'refreshUser',
    'sendEmailVerification'
  ]
};

// 👨‍🏫 TeacherContext - TEACHER-SPECIFIC DATA & OPERATIONS
export const TeacherContext = {
  responsibilities: [
    'Teacher profiles CRUD',
    'Teacher search & filtering',
    'Teacher availability management',
    'Subject and skill management',
    'Rating and review handling'
  ],
  exports: [
    'teachers',
    'teachersLoading',
    'getTeachers',
    'createTeacherProfile',
    'updateTeacherProfile',
    'searchTeachers',
    'getTeacherById'
  ]
};

// 👨‍👩‍👧‍👦 ParentContext - PARENT-SPECIFIC DATA & OPERATIONS  
export const ParentContext = {
  responsibilities: [
    'Parent profiles CRUD',
    'Child information management',
    'Booking and scheduling',
    'Communication with teachers',
    'Favorites management'
  ],
  exports: [
    'parents',
    'parentsLoading',
    'getParents',
    'createParentProfile',
    'updateParentProfile',
    'favoriteTeachers',
    'addToFavorites',
    'removeFromFavorites'
  ]
};

// 🛡️ SecurityContext - SECURITY & VALIDATION
export const SecurityContext = {
  responsibilities: [
    'Password validation',
    'Input sanitization',
    'Rate limiting',
    'Account expiration',
    'Security scoring'
  ],
  exports: [
    'validatePassword',
    'getPasswordStrength',
    'sanitizeInput',
    'checkRateLimit',
    'getAccountStatus',
    'cleanupExpiredAccounts'
  ]
};

// 📋 GDPRContext - DATA PROTECTION & COMPLIANCE
export const GDPRContext = {
  responsibilities: [
    'Data export',
    'Account deletion',
    'Consent management',
    'Privacy settings',
    'Data retention policies'
  ],
  exports: [
    'exportUserData',
    'deleteAccount',
    'getConsentSettings',
    'updateConsentSettings',
    'getPrivacySettings',
    'updatePrivacySettings'
  ]
};

// 📱 App.js PROVIDER STRUCTURE
export const AppProviderStructure = `
<AuthProvider>
  <SecurityProvider>
    <GDPRProvider>
      <TeacherProvider>
        <ParentProvider>
          <AppNavigator />
        </ParentProvider>
      </TeacherProvider>
    </GDPRProvider>
  </SecurityProvider>
</AuthProvider>
`;

// 🎯 COMPONENT USAGE EXAMPLES
export const ComponentUsageExamples = {
  TeacherDashboard: `
    const { user } = useAuth();
    const { teachers, getTeachers } = useTeacher();
    const { validatePassword } = useSecurity();
  `,
  
  ParentDashboard: `
    const { user } = useAuth();
    const { favoriteTeachers, addToFavorites } = useParent();
    const { teachers, searchTeachers } = useTeacher();
  `,
  
  SecurityTestScreen: `
    const { validatePassword, getPasswordStrength } = useSecurity();
    const { cleanupExpiredAccounts } = useSecurity();
  `
};