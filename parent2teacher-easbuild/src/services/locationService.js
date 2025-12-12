import * as Location from 'expo-location';

export async function requestForegroundPermissions() {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return { granted: status === 'granted', status, canAskAgain };
  } catch (e) {
    console.warn('Location permission request failed:', e);
    return { granted: false, status: 'error', canAskAgain: false };
    }
}

export async function getCurrentCoords(options = {}) {
  // Reasonable default accuracy to avoid slow locks
  const accuracy = options.accuracy ?? Location.Accuracy.Balanced;
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
    };
  } catch (e) {
    console.warn('Failed to get current position:', e);
    return null;
  }
}

export async function ensurePermissionAndCoords() {
  const perm = await requestForegroundPermissions();
  if (!perm.granted) return { perm, coords: null };
  const coords = await getCurrentCoords();
  return { perm, coords };
}

// Alias for getCurrentCoords to match signup screen imports
export async function getCurrentLocation(options = {}) {
  const coords = await getCurrentCoords(options);
  if (coords) {
    return { success: true, coords };
  }
  return { success: false, coords: null };
}

// Reverse geocode coordinates to get city name
export async function reverseGeocode(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude
    });
    
    if (results && results.length > 0) {
      const location = results[0];
      // Return city, or region, or country as fallback
      const city = location.city || location.region || location.country || null;
      return { success: true, city };
    }
    return { success: false, city: null };
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
    return { success: false, city: null };
  }
}
