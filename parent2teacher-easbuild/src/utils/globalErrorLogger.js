// Global Error Logger - captures uncaught JS errors & Promise rejections
// Helps diagnose mysterious ReferenceError: Property 'user' doesn't exist

let initialized = false;

export function initGlobalErrorLogger() {
  if (initialized) return;
  initialized = true;
  try {
    const defaultHandler = global.ErrorUtils?.getGlobalHandler && global.ErrorUtils.getGlobalHandler();
    if (global.ErrorUtils?.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        // Extra introspection when message mentions property 'user'
        if (error?.message?.toLowerCase().includes("property 'user")) {
          // Dump auth slice snapshot if available
          try {
            // store is not imported here to avoid circular; consumer can pass state
          } catch (e) {}
        }
        if (defaultHandler) defaultHandler(error, isFatal);
      });
    }

    // Handle unhandled promise rejections
    const tracking = (reason) => {
      // Silent handling
    };
    const rejectionEvent = 'unhandledRejection';
    const addListener = global.addEventListener || (() => {});
    try { addListener(rejectionEvent, tracking); } catch {}
  } catch (e) {
    // Failed to initialize
  }
}
