import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../layout/LoadingScreen';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!currentUser) {
    // Redirect to login but save the location they tried to access
    return <Navigate to="/login" state={{ from: location.pathname }} />;
  }
  
  return children;
};

export default ProtectedRoute;