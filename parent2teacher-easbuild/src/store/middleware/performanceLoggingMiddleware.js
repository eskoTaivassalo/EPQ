/**
 * Performance Logging Middleware - Redux
 * Logaa kaikki Redux actions ja state muutokset performance tracking varten
 */

import performanceTracker from '../../utils/performanceTracker';

const performanceLoggingMiddleware = store => next => action => {
  // Log Redux action
  const actionType = action.type;

  // Performance mark for async thunks
  if (actionType.includes('.pending')) {
    performanceTracker.mark(`redux_${action.type}_start`);
    performanceTracker.logFetch(action.type.split('/')[1], 'start');
  }

  // Call next action
  const result = next(action);

  // Log fulfilled/rejected states
  if (actionType.includes('.fulfilled')) {
    performanceTracker.mark(`redux_${action.type}_end`);
    const operation = action.type.split('/')[1];
    performanceTracker.measure(
      `redux_${operation}_duration`,
      `redux_${action.type.replace('.fulfilled', '.pending')}_start`,
      `redux_${action.type}_end`
    );
    performanceTracker.logFetch(operation, 'success');
  }

  if (actionType.includes('.rejected')) {
    performanceTracker.logFetch(action.type.split('/')[1], 'error');
  }

  return result;
};

export default performanceLoggingMiddleware;
