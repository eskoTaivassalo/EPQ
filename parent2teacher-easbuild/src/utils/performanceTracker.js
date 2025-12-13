/**
 * Performance Tracker - DevOps logging untuk siirtymien tutkimiseen
 * Mittaa aika navigoinnin eri vaiheissa ja Redux state muutoksissa
 */

class PerformanceTracker {
  constructor() {
    this.markers = {};
    this.measurements = {};
  }

  // Markoi aika-piste
  mark(name) {
    const time = Date.now();
    this.markers[name] = time;
  }

  // Mittaa kahden markerin välinen aika
  measure(name, startMark, endMark) {
    if (!this.markers[startMark] || !this.markers[endMark]) {
      return null;
    }
    
    const duration = this.markers[endMark] - this.markers[startMark];
    this.measurements[name] = duration;
    
    return duration;
  }

  // Log Redux action
  logAction(action, state) {
    // Silent
  }

  // Log render
  logRender(componentName, props = {}) {
    // Silent
  }

  // Log navigation
  logNavigation(fromScreen, toScreen) {
    this.mark(`nav_${toScreen}_start`);
  }

  // Log data fetch
  logFetch(endpoint, status, duration = null) {
    // Silent
  }

  // Reset markers
  reset() {
    this.markers = {};
    this.measurements = {};
  }

  // Näytä yhteenveto
  summary() {
    // Silent
  }
}

export default new PerformanceTracker();
