import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as Location from 'expo-location';
import { ensurePermissionAndCoords } from '../../services/locationService';

export const initDeviceLocation = createAsyncThunk(
  'location/initDeviceLocation',
  async (_, { rejectWithValue }) => {
    try {
      const { perm, coords } = await ensurePermissionAndCoords();
      if (!perm?.granted || !coords) {
        return { permission: perm?.status || 'denied', coords: null, city: null, source: null };
      }
      // Reverse geocode to get city
      let city = null;
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (results && results.length > 0) {
          const r = results[0];
          city = r.city || r.subregion || r.region || r.name || null;
        }
      } catch (e) {
        // Keep city null if reverse geocode fails
      }
      return { permission: 'granted', coords, city, source: 'device' };
    } catch (e) {
      return rejectWithValue(e?.message || 'location_init_failed');
    }
  }
);

export const setManualCity = createAsyncThunk(
  'location/setManualCity',
  async (city, { rejectWithValue }) => {
    try {
      const results = await Location.geocodeAsync(city);
      let coords = null;
      if (results && results.length > 0) {
        coords = {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
          accuracy: null,
          timestamp: Date.now(),
        };
      }
      return { permission: 'denied', coords, city, source: 'manual' };
    } catch (e) {
      return rejectWithValue(e?.message || 'geocode_failed');
    }
  }
);

const initialState = {
  permission: 'unknown', // 'granted' | 'denied' | 'error' | 'unknown'
  coords: null, // { latitude, longitude, accuracy?, timestamp? }
  city: null,
  source: null, // 'device' | 'manual' | null
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    clearLocation(state) {
      state.permission = 'unknown';
      state.coords = null;
      state.city = null;
      state.source = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initDeviceLocation.fulfilled, (state, action) => {
        state.permission = action.payload.permission || 'unknown';
        state.coords = action.payload.coords || null;
        state.city = action.payload.city || null;
        state.source = action.payload.source || null;
        state.error = null;
      })
      .addCase(initDeviceLocation.rejected, (state, action) => {
        state.permission = 'error';
        state.error = action.payload || 'location_init_failed';
      })
      .addCase(setManualCity.fulfilled, (state, action) => {
        state.permission = action.payload.permission;
        state.coords = action.payload.coords;
        state.city = action.payload.city;
        state.source = action.payload.source;
        state.error = null;
      })
      .addCase(setManualCity.rejected, (state, action) => {
        state.error = action.payload || 'geocode_failed';
      });
  }
});

export const { clearLocation } = locationSlice.actions;

export const selectLocation = (state) => state.location || initialState;
export const selectUserCoords = (state) => state.location?.coords || null;
export const selectUserCity = (state) => state.location?.city || null;
export const selectLocationPermission = (state) => state.location?.permission || 'unknown';

export default locationSlice.reducer;
