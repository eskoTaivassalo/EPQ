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
