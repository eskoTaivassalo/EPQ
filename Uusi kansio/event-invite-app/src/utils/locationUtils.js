/**
 * Location utility functions for handling location data across the application
 */

// Default map center (could be configured based on app's primary region)
export const DEFAULT_MAP_CENTER = { lat: 60.1699, lng: 24.9384 }; // Helsinki, Finland
export const DEFAULT_ZOOM = 13;

/**
 * Format a location object into a readable string
 * @param {Object} location - Location object with various properties 
 * @returns {string} Formatted location string
 */
export const formatLocation = (location) => {
  if (!location) return 'Location not specified';
  
  if (typeof location === 'string') return location;
  
  if (location.name) {
    if (location.address) {
      return `${location.name}, ${location.address}`;
    }
    return location.name;
  }
  
  if (location.address) {
    return location.address;
  }
  
  if (location.lat && location.lng) {
    return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
  }
  
  return 'Location information incomplete';
};

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @param {boolean} inKm - If true, returns distance in kilometers, otherwise in miles
 * @returns {number} Distance in km or miles
 */
export const calculateDistance = (coord1, coord2, inKm = true) => {
  if (!coord1 || !coord2 || 
      !coord1.lat || !coord1.lng || 
      !coord2.lat || !coord2.lng) {
    return null;
  }
  
  const R = inKm ? 6371 : 3959; // Earth's radius in km or miles
  const dLat = degToRad(coord2.lat - coord1.lat);
  const dLng = degToRad(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(degToRad(coord1.lat)) * Math.cos(degToRad(coord2.lat)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Value in degrees
 * @returns {number} Value in radians
 */
export const degToRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance in a human-readable format
 * @param {number} distance - Distance in kilometers or miles
 * @param {boolean} inKm - If true, input and output are in kilometers, otherwise miles
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance, inKm = true) => {
  if (distance === null || distance === undefined) return '';
  
  if (distance < 0.1) {
    const meters = Math.round(distance * 1000);
    return `${meters} ${inKm ? 'm' : 'yards'}`;
  }
  
  if (distance < 10) {
    return `${distance.toFixed(1)} ${inKm ? 'km' : 'mi'}`;
  }
  
  return `${Math.round(distance)} ${inKm ? 'km' : 'mi'}`;
};

/**
 * Get a human-readable location name from coordinates
 * @param {Object} coords - Coordinates {lat, lng}
 * @returns {Promise<string>} Human-readable location name
 */
export const getLocationNameFromCoords = async (coords) => {
  if (!coords || !coords.lat || !coords.lng) {
    return 'Unknown location';
  }
  
  try {
    // This is a placeholder - in a real app, you would use a geocoding API
    // such as Google Maps Geocoding API, Mapbox, or OpenStreetMap Nominatim
    
    // Example of how you might call the API:
    // const response = await fetch(
    //   `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=YOUR_API_KEY`
    // );
    // const data = await response.json();
    // if (data.results && data.results[0]) {
    //   return data.results[0].formatted_address;
    // }
    
    // For now, return formatted coordinates
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  } catch (err) {
    console.error('Error getting location name:', err);
    return 'Location lookup failed';
  }
};

/**
 * Check if browser supports geolocation
 * @returns {boolean} True if geolocation is supported
 */
export const isGeolocationSupported = () => {
  return 'geolocation' in navigator;
};

/**
 * Validate location data
 * @param {Object} location - Location object to validate
 * @returns {boolean} True if location data is valid
 */
export const isValidLocation = (location) => {
  if (!location) return false;
  
  // If it's just a string, it should have some content
  if (typeof location === 'string') {
    return location.trim().length > 0;
  }
  
  // If it has coordinates, they should be valid numbers
  if (location.lat !== undefined && location.lng !== undefined) {
    const validLat = isFinite(location.lat) && Math.abs(location.lat) <= 90;
    const validLng = isFinite(location.lng) && Math.abs(location.lng) <= 180;
    return validLat && validLng;
  }
  
  // If it has a name or address, it should have some content
  if (location.name || location.address) {
    return (location.name && location.name.trim().length > 0) || 
           (location.address && location.address.trim().length > 0);
  }
  
  return false;
};

/**
 * Extract location data from a location search API result
 * (This is a generic function - actual implementation depends on the API used)
 * @param {Object} result - Result from location search API
 * @returns {Object} Normalized location object
 */
export const extractLocationFromSearchResult = (result) => {
  // This function would need to be adapted to the specific API you're using
  // This is just an example structure
  if (!result) return null;
  
  return {
    name: result.name || result.poi?.name,
    address: result.formatted_address || result.address?.freeformAddress,
    lat: result.geometry?.location?.lat || result.position?.lat,
    lng: result.geometry?.location?.lng || result.position?.lon,
    placeId: result.place_id || result.id
  };
};

/**
 * Generate static map image URL (e.g., for Google Maps)
 * @param {Object} location - Location with lat/lng
 * @param {Object} options - Map options like zoom, size
 * @returns {string} URL for static map image
 */
export const getStaticMapUrl = (location, options = {}) => {
  if (!location || !location.lat || !location.lng) {
    return null;
  }
  
  const zoom = options.zoom || DEFAULT_ZOOM;
  const size = options.size || '400x200';
  const apiKey = options.apiKey || 'YOUR_API_KEY'; // Replace with actual API key
  
  // This is for Google Maps Static API - adjust as needed for your API
  return `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=${zoom}&size=${size}&markers=color:red%7C${location.lat},${location.lng}&key=${apiKey}`;
};

/**
 * Sort locations by distance from a reference point
 * @param {Array} locations - Array of location objects with lat/lng
 * @param {Object} referencePoint - Reference location {lat, lng}
 * @returns {Array} Sorted locations with distance property added
 */
export const sortLocationsByDistance = (locations, referencePoint) => {
  if (!locations || !locations.length || !referencePoint) {
    return locations;
  }
  
  return locations
    .map(loc => {
      // Add distance property to each location
      const distance = calculateDistance(
        { lat: loc.lat, lng: loc.lng },
        { lat: referencePoint.lat, lng: referencePoint.lng }
      );
      return { ...loc, distance };
    })
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
};