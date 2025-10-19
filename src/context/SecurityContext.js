import React, { createContext, useContext } from 'react';
import AuthService from '../services/authService';
import SecurityService from '../services/securityService';

/**
 * 🛡️ SecurityContext - Turvallisuustoiminnot ja validointi
 * 
 * Vastaa:
 * - Salasanan validoinnista ja vahvuuden mittaamisesta
 * - Input sanitization ja XSS suojauksesta
 * - Rate limiting ja abuse prevention
 * - Account expiration hallinnasta
 * - Security scoring ja raportoimisesta
 */

const SecurityContext = createContext();

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  
  // 🔐 PASSWORD VALIDATION & STRENGTH
  const validatePassword = (password) => {
    try {
      return AuthService.validatePassword(password);
    } catch (error) {
      console.error('SecurityContext: Password validation error:', error);
      return { isValid: false, message: 'Salasanan validointi epäonnistui' };
    }
  };

  const getPasswordStrength = (password) => {
    try {
      return AuthService.getPasswordStrength(password);
    } catch (error) {
      console.error('SecurityContext: Password strength error:', error);
      return 0;
    }
  };

  // 📧 EMAIL VALIDATION
  const validateEmail = (email) => {
    try {
      return AuthService.validateEmail(email);
    } catch (error) {
      console.error('SecurityContext: Email validation error:', error);
      return false;
    }
  };

  // 🧹 INPUT SANITIZATION & XSS PROTECTION
  const sanitizeInput = (input) => {
    try {
      return SecurityService.sanitizeInput(input);
    } catch (error) {
      console.error('SecurityContext: Input sanitization error:', error);
      return input; // Return original if sanitization fails
    }
  };

  const isSafeFromInjection = (input) => {
    try {
      return SecurityService.isSafeFromInjection(input);
    } catch (error) {
      console.error('SecurityContext: Injection check error:', error);
      return false; // Assume unsafe if check fails
    }
  };

  // ⏱️ RATE LIMITING & ABUSE PREVENTION
  const checkRateLimit = (identifier, maxAttempts, timeWindow) => {
    try {
      return SecurityService.checkRateLimit(identifier, maxAttempts, timeWindow);
    } catch (error) {
      console.error('SecurityContext: Rate limit check error:', error);
      return { allowed: false, remaining: 0, resetTime: Date.now() };
    }
  };

  // 👤 USER INPUT VALIDATION
  const validateUsername = (username) => {
    try {
      return SecurityService.validateUsername(username);
    } catch (error) {
      console.error('SecurityContext: Username validation error:', error);
      return { isValid: false, message: 'Käyttäjänimen validointi epäonnistui' };
    }
  };

  const validatePhoneNumber = (phone) => {
    try {
      return SecurityService.validatePhoneNumber(phone);
    } catch (error) {
      console.error('SecurityContext: Phone validation error:', error);
      return { isValid: false, message: 'Puhelinnumeron validointi epäonnistui' };
    }
  };

  const validateDescription = (description) => {
    try {
      return SecurityService.validateDescription(description);
    } catch (error) {
      console.error('SecurityContext: Description validation error:', error);
      return { isValid: false, message: 'Kuvauksen validointi epäonnistui' };
    }
  };

  // 📅 ACCOUNT EXPIRATION MANAGEMENT
  const markAccountCreationTime = (userId) => {
    try {
      return AuthService.markAccountCreationTime(userId);
    } catch (error) {
      console.error('SecurityContext: Account creation tracking error:', error);
      return null;
    }
  };

  const markAccountVerified = (userId) => {
    try {
      return AuthService.markAccountVerified(userId);
    } catch (error) {
      console.error('SecurityContext: Account verification marking error:', error);
    }
  };

  const getAccountStatus = (userId) => {
    try {
      return AuthService.getAccountStatus(userId);
    } catch (error) {
      console.error('SecurityContext: Account status check error:', error);
      return { status: 'error', verified: false };
    }
  };

  const getUnverifiedAccounts = () => {
    try {
      return AuthService.getUnverifiedAccounts();
    } catch (error) {
      console.error('SecurityContext: Unverified accounts fetch error:', error);
      return {};
    }
  };

  const cleanupExpiredAccounts = async () => {
    try {
      return await AuthService.cleanupExpiredAccounts();
    } catch (error) {
      console.error('SecurityContext: Account cleanup error:', error);
      return { error: error.message };
    }
  };

  const startCleanupTimer = () => {
    try {
      return AuthService.startCleanupTimer();
    } catch (error) {
      console.error('SecurityContext: Cleanup timer start error:', error);
      return null;
    }
  };

  // 📊 SECURITY SCORING & ANALYTICS
  const getSecurityScore = (userData) => {
    try {
      let score = 0;
      
      // Password strength (0-40 points)
      if (userData.password) {
        const passwordStrength = getPasswordStrength(userData.password);
        score += Math.min(40, passwordStrength * 0.4);
      }
      
      // Email verification (20 points)
      if (userData.emailVerified) {
        score += 20;
      }
      
      // Profile completeness (20 points)
      const profileFields = ['fullName', 'email', 'phoneNumber', 'location'];
      const completedFields = profileFields.filter(field => userData[field]?.length > 0);
      score += (completedFields.length / profileFields.length) * 20;
      
      // Account age (20 points max, 1 point per day, max 20 days)
      if (userData.createdAt) {
        const accountAge = Math.floor((Date.now() - new Date(userData.createdAt)) / (1000 * 60 * 60 * 24));
        score += Math.min(20, accountAge);
      }
      
      return Math.round(score);
    } catch (error) {
      console.error('SecurityContext: Security score calculation error:', error);
      return 0;
    }
  };

  // 🎯 COMPREHENSIVE SECURITY VALIDATION
  const validateUserInput = (data) => {
    try {
      const results = {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {}
      };

      // Validate and sanitize each field
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          const sanitized = sanitizeInput(value);
          results.sanitizedData[key] = sanitized;
          
          // Check for potential security issues
          if (!isSafeFromInjection(value)) {
            results.warnings.push(`Potential security issue in field: ${key}`);
          }
          
          if (sanitized !== value) {
            results.warnings.push(`Input sanitized in field: ${key}`);
          }
        } else {
          results.sanitizedData[key] = value;
        }
      }

      return results;
    } catch (error) {
      console.error('SecurityContext: User input validation error:', error);
      return {
        isValid: false,
        errors: ['Validointi epäonnistui'],
        warnings: [],
        sanitizedData: data
      };
    }
  };

  const value = {
    // 🔐 Password Security
    validatePassword,
    getPasswordStrength,
    
    // 📧 Email Validation
    validateEmail,
    
    // 🧹 Input Sanitization
    sanitizeInput,
    isSafeFromInjection,
    
    // ⏱️ Rate Limiting
    checkRateLimit,
    
    // 👤 User Input Validation
    validateUsername,
    validatePhoneNumber,
    validateDescription,
    validateUserInput,
    
    // 📅 Account Management
    markAccountCreationTime,
    markAccountVerified,
    getAccountStatus,
    getUnverifiedAccounts,
    cleanupExpiredAccounts,
    startCleanupTimer,
    
    // 📊 Security Analytics
    getSecurityScore
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export default SecurityContext;