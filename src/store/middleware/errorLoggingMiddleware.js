/**
 * 🚨 Error Logging Middleware - Keskitetty virheenhallinta
 * 
 * Huolehtii:
 * - Kaikkien Redux virheiden loggaamisesta
 * - Error reporting palvelulle (esim. Sentry)
 * - User-friendly error viestien näyttämisestä
 * - Performance metriikoiden keräämisestä
 */

const errorLoggingMiddleware = (store) => (next) => (action) => {
  const startTime = Date.now();
  
  try {
    // Execute the action
    const result = next(action);
    
    // Log rejected actions (errors)
    if (action.type.endsWith('/rejected')) {
      const error = {
        action: action.type,
        payload: action.payload,
        timestamp: new Date().toISOString(),
        userId: store.getState().auth?.user?.uid || 'anonymous',
        error: action.payload || action.error,
        meta: action.meta
      };
      
      console.error('🚨 Error Middleware: Action failed', error);
      
      // In production, send to error reporting service
      if (process.env.NODE_ENV === 'production') {
        // Example: Sentry.captureException(new Error(action.payload));
        // Example: Analytics.track('Redux Action Failed', error);
      }
      
      // Show user-friendly error message for critical actions
      if (isCriticalAction(action.type)) {
        // Could dispatch a notification action here
        console.log('💡 Error Middleware: Critical action failed, should show user notification');
      }
    }
    
    // Log performance for async actions
    if (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected')) {
      const duration = Date.now() - startTime;
      const actionName = action.type.replace(/\/(fulfilled|rejected)$/, '');
      
      console.log(`⏱️ Performance: ${actionName} took ${duration}ms`);
      
      // Track slow actions
      if (duration > 1000) {
        console.warn(`🐌 Slow action detected: ${actionName} took ${duration}ms`);
      }
    }
    
    return result;
    
  } catch (error) {
    // Catch any synchronous errors in middleware chain
    console.error('🚨 Error Middleware: Synchronous error in action:', action.type, error);
    
    // In production, report this error
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }
    
    throw error; // Re-throw to not break the app
  }
};

// Helper function to determine critical actions
const isCriticalAction = (actionType) => {
  const criticalActions = [
    'auth/loginUser/rejected',
    'auth/registerUser/rejected',
    'appData/createTeacherProfile/rejected',
    'appData/createParentProfile/rejected'
  ];
  
  return criticalActions.includes(actionType);
};

// Helper function to sanitize sensitive data for logging
const sanitizeForLogging = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

export default errorLoggingMiddleware;