/**
 * React Hook - Render Tracking
 * Seuraa komponentin renderöinti suorituskykyä ja mount/unmount syklejä
 */

import { useRef, useEffect } from 'react';
import performanceTracker from './performanceTracker';

export const useRenderTracking = (componentName, deps = []) => {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const renderTime = Date.now();
    const timeSinceMountMs = renderTime - mountTimeRef.current;

    performanceTracker.logRender(componentName, {
      renderCount: renderCountRef.current,
      timeSinceMount: timeSinceMountMs,
      dependencyCount: deps.length,
    });

    return () => {
      // Unmount tracking
    };
  }, deps);

  return renderCountRef.current;
};

/**
 * Performance measuring wrapper
 * Mittaa renderöinnin kestoa
 */
export const usePerformanceMeasure = (componentName, operation) => {
  const startRef = useRef(null);

  useEffect(() => {
    startRef.current = `${componentName}_${operation}_start`;
    performanceTracker.mark(startRef.current);

    return () => {
      const endMark = `${componentName}_${operation}_end`;
      performanceTracker.mark(endMark);
      performanceTracker.measure(
        `${componentName}_${operation}_duration`,
        startRef.current,
        endMark
      );
    };
  }, [componentName, operation]);
};
