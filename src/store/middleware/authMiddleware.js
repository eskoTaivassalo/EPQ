/**
 * 🔐 Auth Middleware - Autentikointiin liittyvä middleware
 * 
 * Huolehtii:
 * - Session seurannasta
 * - Auto-logout inaktiviteetin jälkeen
 * - Auth error handlingista
 * - Login/logout auditoimisesta
 */

const authMiddleware = (store) => (next) => (action) => {
  const state = store.getState();
  
  // Track authentication events
  if (action.type.startsWith('auth/')) {
    console.log(`🔐 Auth Middleware: ${action.type}`, {
      timestamp: new Date().toISOString(),
      isAuthenticated: state.auth?.isAuthenticated,
      userId: state.auth?.user?.uid || 'anonymous'
    });
    
    // Handle successful login
    if (action.type === 'auth/loginUser/fulfilled') {
      console.log('✅ Auth Middleware: User logged in successfully');
      
      // Could dispatch additional actions here:
      // - Load user preferences
      // - Start session timeout
      // - Track login analytics
    }
    
    // Handle logout
    if (action.type === 'auth/logoutUser/fulfilled') {
      console.log('🚪 Auth Middleware: User logged out');
      
      // Clear sensitive data from other slices
      store.dispatch({ type: 'security/clearValidationCache' });
      store.dispatch({ type: 'appData/invalidateCache' });
    }
    
    // Handle auth errors
    if (action.type.endsWith('/rejected') && action.type.startsWith('auth/')) {
      console.error('❌ Auth Middleware: Authentication error:', action.payload);
      
      // Could implement additional error handling:
      // - Show user-friendly error messages
      // - Track failed login attempts
      // - Implement rate limiting
    }
  }
  
  // Check for session timeout (example implementation)
  if (state.auth?.isAuthenticated && state.auth?.lastLogin) {
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    const timeSinceLogin = Date.now() - state.auth.lastLogin;
    
    if (timeSinceLogin > sessionTimeout) {
      console.log('⏰ Auth Middleware: Session expired, logging out');
      store.dispatch({ type: 'auth/logoutUser' });
    }
  }
  
  return next(action);
};

export default authMiddleware;