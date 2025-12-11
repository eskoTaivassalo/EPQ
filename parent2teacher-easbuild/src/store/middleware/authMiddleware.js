/**
 * 🔐 Auth Middleware - Autentikointiin liittyvä middleware
 *
 * Vastaa mm. session seurannasta ja auditoimisesta. Estää logout-loopit
 * lisäämällä vartijan (guard) ja käyttämällä oikeaa thunkia uloskirjautumiseen.
 */

import { logoutUser } from '../slices/authSlice';

const authMiddleware = (store) => {
  // Guard to prevent repeated logout dispatch loops
  let isLoggingOut = false;

  return (next) => (action) => {
    const state = store.getState();

    // Track authentication events
    if (action.type.startsWith('auth/')) {
      // Track logout in-flight status
      if (action.type === 'auth/logoutUser/pending') {
        isLoggingOut = true;
      }
      if (action.type === 'auth/logoutUser/fulfilled' || action.type === 'auth/logoutUser/rejected') {
        // Clear sensitive data from other slices on successful logout
        if (action.type === 'auth/logoutUser/fulfilled') {
          store.dispatch({ type: 'security/clearValidationCache' });
          store.dispatch({ type: 'appData/invalidateCache' });
        }
        isLoggingOut = false;
      }

      // Silent handling
    }

    // Proceed with the current action first so state can update
    const result = next(action);

    // Re-read state after reducers ran
    const updatedState = store.getState();

    // Check for session timeout (example implementation)
    // Guard conditions:
    // - Only when authenticated
    // - Not already logging out
    // - Skip checks for auth/* actions to avoid recursion
    if (
      !isLoggingOut &&
      !(action.type && action.type.startsWith('auth/')) &&
      updatedState.auth?.isAuthenticated &&
      updatedState.auth?.lastLogin
    ) {
      const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
      const timeSinceLogin = Date.now() - updatedState.auth.lastLogin;

      if (timeSinceLogin > sessionTimeout) {
        if (__DEV__) console.log('⏰ Session expired');
        isLoggingOut = true;
        // Dispatch the actual thunk to update state properly
        store.dispatch(logoutUser());
      }
    }

    return result;
  };
};

export default authMiddleware;