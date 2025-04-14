/**
 * Location utilities for getting and formatting user location
 */

// Hakee käyttäjän sijainnin koordinaatit
export const getUserCoordinates = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
  
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };
  
  // Muuntaa koordinaatit kaupungin nimeksi käyttäen OpenStreetMap Nominatim API:a
  export const getCityFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
        {
          headers: {
            'Accept-Language': 'fi', // Yritetään hakea suomenkielisiä paikannimiä
            'User-Agent': 'EventInviteApp' // Hyvä käytäntö OpenStreetMap API:a käytettäessä
          }
        }
      );
  
      if (!response.ok) {
        throw new Error('Error fetching location data');
      }
  
      const data = await response.json();
      
      // Yritetään hakea sijainnin nimi eri tasoilta (kaupunki/kunta/alue)
      const city = 
        data.address.city || 
        data.address.town || 
        data.address.village || 
        data.address.municipality || 
        data.address.county ||
        data.address.state ||
        'Tuntematon sijainti';
  
      return city;
    } catch (error) {
      console.error('Error getting city from coordinates:', error);
      return 'Tuntematon sijainti';
    }
  };
  
  // Hakee käyttäjän sijainnin ja palauttaa paikan nimen
  export const getUserLocation = async () => {
    try {
      // Hae koordinaatit
      const coords = await getUserCoordinates();
      
      // Muunna koordinaatit paikannimeksi
      const city = await getCityFromCoordinates(coords.latitude, coords.longitude);
      
      return {
        city,
        coords,
        loading: false,
        error: null
      };
    } catch (error) {
      console.error('Error getting user location:', error);
      return {
        city: 'Sijaintia ei saatavilla',
        coords: null,
        loading: false,
        error: error.message
      };
    }
  };