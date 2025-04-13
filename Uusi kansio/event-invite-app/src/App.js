import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingScreen from './components/layout/LoadingScreen';
import './styles/App.css'; // Import global styles
import './styles/Variables.css'; // Import CSS variables
import Events from './pages/Events';

// Import Home directly instead of using lazy loading
import Home from './pages/Home';

const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const EventDetails = lazy(() => import('./components/events/eventdetails/EventDetails'));
const EventList = lazy(() => import('./components/events/eventlist/EventList'));
const MyEvents = lazy(() => import('./components/events/myevents/MyEvents'));
const Invites = lazy(() => import('./pages/Invites'));
const NotFound = lazy(() => import('./pages/notfound'));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Only include Home route to start */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/events" element={<Events />} />
              <Route path="/event/:id" element={<EventDetails />} />
              <Route path="/event-list" element={<EventList />} /> 
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-events" 
                element={
                  <ProtectedRoute>
                    <MyEvents />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/invites" 
                element={
                  <ProtectedRoute>
                    <Invites />
                  </ProtectedRoute>
                } 
              />
           <Route path="/404" element={<NotFound />} />
           <Route path="*" element={<Navigate replace to="/404" />} />
            </Routes>
          </Suspense>
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;