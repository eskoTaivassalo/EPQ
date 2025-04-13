import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context
const LocationContext = createContext();

// Custom hook to use location context
export const useLocation = () => {
  return useContext(LocationContext);
};

export const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'

  // Get user's current location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return Promise.reject('Geolocation not supported');
    }
    
    setLoading(true);
    setError(null);
    
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          
          setCurrentLocation(location);
          setLoading(false);
          setLocationPermission('granted');
          resolve(location);
        },
        (err) => {
          console.error('Error getting location:', err);
          setError(`Failed to get location: ${err.message}`);
          setLoading(false);
          setLocationPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt');
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }, []);

  // Search for locations by query (would typically use a service like Google Maps API)
  // Here's a placeholder implementation
  const searchLocation = useCallback(async (query) => {
    if (!query || query.trim() === '') {
      setSearchResults([]);
      return [];
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // This would be replaced with actual API call to a location service
      // For example: Google Maps Places API, MapBox, etc.
      
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock results for demonstration
      const results = [
        { 
          id: 'loc1', 
          name: `${query} Town Center`, 
          address: `123 Main St, ${query}, Country`,
          coordinates: { lat: 40.7128, lng: -74.0060 } 
        },
        { 
          id: 'loc2', 
          name: `${query} Community Hall`, 
          address: `456 Park Ave, ${query}, Country`,
          coordinates: { lat: 40.7218, lng: -74.0130 } 
        },
        { 
          id: 'loc3', 
          name: `${query} Conference Center`, 
          address: `789 Broadway, ${query}, Country`,
          coordinates: { lat: 40.7308, lng: -74.0020 } 
        }
      ];
      
      setSearchResults(results);
      setLoading(false);
      return results;
    } catch (err) {
      console.error('Error searching locations:', err);
      setError(`Failed to search locations: ${err.message}`);
      setLoading(false);
      return [];
    }
  }, []);

  // Format location object for display
  const formatLocation = useCallback((location) => {
    if (!location) return 'Location not specified';
    
    if (typeof location === 'string') return location;
    
    if (location.name) {
      return location.address ? `${location.name}, ${location.address}` : location.name;
    }
    
    if (location.lat && location.lng) {
      return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    }
    
    return 'Invalid location format';
  }, []);

  // Calculate distance between two locations (haversine formula)
  const calculateDistance = useCallback((location1, location2) => {
    if (!location1 || !location2 || 
        !location1.lat || !location1.lng || 
        !location2.lat || !location2.lng) {
      return null;
    }
    
    const R = 6371; // Earth's radius in km
    const dLat = (location2.lat - location1.lat) * Math.PI / 180;
    const dLon = (location2.lng - location1.lng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(location1.lat * Math.PI / 180) * Math.cos(location2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  }, []);

  // Check if location services are available
  const checkLocationServices = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationPermission('denied');
        resolve(false);
        return;
      }
      
      // Try to get position to check permission
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          setLocationPermission(permissionStatus.state);
          resolve(permissionStatus.state === 'granted');
          
          // Set up a listener for permission changes
          permissionStatus.onchange = () => {
            setLocationPermission(permissionStatus.state);
          };
        })
        .catch(() => {
          // If permissions API is not available, we'll have to check by trying
          setLocationPermission('prompt');
          resolve(true);
        });
    });
  }, []);

  const clearLocation = () => {
    setCurrentLocation(null);
  };

  const value = {
    currentLocation,
    searchResults,
    loading,
    error,
    locationPermission,
    getUserLocation,
    searchLocation,
    formatLocation,
    calculateDistance,
    checkLocationServices,
    clearLocation
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationProvider;