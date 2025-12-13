/**
 * Deferred Action Dispatcher
 * Dispatch Redux actions asynchronously non-blocking
 * 
 * Käyttö: Näytön kriittiset operaatiot ensin, loput background loopissa
 */

let deferredQueue = [];
let isProcessing = false;

/**
 * Defer an action to be dispatched in background (after screen ready)
 * @param {Function} dispatch - Redux dispatch function
 * @param {Function|Object} action - Action to dispatch
 * @param {Number} delayMs - Delay before dispatch (default: 1000ms)
 */
export const deferAction = (dispatch, action, delayMs = 1000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        dispatch(action);
        resolve(true);
      } catch (error) {
        resolve(false);
      }
    }, delayMs);
  });
};

/**
 * Dispatch multiple actions with staggered timing
 * Useful for loading secondary data without blocking UI
 */
export const deferActionSequence = (dispatch, actions, delayBetweenMs = 500) => {
  return actions.reduce((promise, action, index) => {
    return promise.then(() => {
      return deferAction(dispatch, action, delayBetweenMs);
    });
  }, Promise.resolve());
};

export default { deferAction, deferActionSequence };
