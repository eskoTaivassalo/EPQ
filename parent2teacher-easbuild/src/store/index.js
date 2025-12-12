import { configureStore } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Slices
import authSlice from './slices/authSlice';
import securitySlice from './slices/securitySlice';
import appDataSlice from './slices/appDataSlice';
import bookingsSlice from './slices/bookingsSlice';
import notificationsSlice from './slices/notificationsSlice';
import pushNotificationsSlice from './slices/pushNotificationsSlice';
import locationSlice from './slices/locationSlice';
import toastSlice from './slices/toastSlice';
import availabilitySlice from './slices/availabilitySlice';

// Middleware
import authMiddleware from './middleware/authMiddleware';
import errorLoggingMiddleware from './middleware/errorLoggingMiddleware';

/**
 * 🏪 Redux Store Configuration
 * 
 * Keskitetty store joka korvaa Context-arkkitehtuurin:
 * - AuthSlice: Käyttäjän autentikointi ja sessio
 * - SecuritySlice: Turvallisuustoiminnot ja validointi  
 * - AppDataSlice: Sovelluksen liiketoimintalogiikka
 */

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'location'], // Persist auth and location
  blacklist: ['security', 'appData'] // Ei säilytetä security ja appData
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  security: securitySlice,
  appData: appDataSlice,
  bookings: bookingsSlice,
  notifications: notificationsSlice,
  pushNotifications: pushNotificationsSlice,
  location: locationSlice,
  toast: toastSlice,
  availability: availabilitySlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat([
      authMiddleware,
      errorLoggingMiddleware,
      // Lisätään logger vain kehitystilassa
      process.env.NODE_ENV === 'development' && require('redux-logger').createLogger({
        collapsed: true,
        duration: true,
        timestamp: true,
      }),
    ].filter(Boolean)),
  devTools: process.env.NODE_ENV === 'development',
});

// Persistor
export const persistor = persistStore(store);

// Helper functions for accessing store state and dispatch
export const getStoreState = () => store.getState();
export const getStoreDispatch = () => store.dispatch;

export default store;