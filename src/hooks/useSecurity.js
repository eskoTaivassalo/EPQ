import { useSelector, useDispatch } from 'react-redux';
import {
  validatePasswordAsync,
  validateEmailAsync,
  calculateSecurityScore,
  cleanupExpiredAccounts,
  validatePasswordSync,
  validateEmailSync,
  updateSecuritySettings,
  clearValidationCache,
  clearError,
  selectSecurity,
  selectPasswordValidation,
  selectEmailValidation,
  selectSecurityScore,
  selectSecuritySettings,
  selectSecurityLoading,
  selectSecurityError,
} from '../store/slices/securitySlice';
import AuthService from '../services/authService';
import SecurityService from '../services/securityService';

/**
 * 🛡️ Security Hook - Korvaa SecurityContext:in
 * 
 * Tarjoaa turvallisuustoiminnot Redux:in kautta
 */

export const useSecurity = () => {
  const dispatch = useDispatch();
  const security = useSelector(selectSecurity);
  const loading = useSelector(selectSecurityLoading);
  const error = useSelector(selectSecurityError);
  const settings = useSelector(selectSecuritySettings);

  // Password validation
  const validatePassword = (password) => {
    // Käytä suoraan AuthService validointia ilman cachea
    try {
      return AuthService.validatePassword(password);
    } catch (error) {
      console.error('Security Hook: Password validation error:', error);
      return { isValid: false, message: 'Salasanan validointi epäonnistui' };
    }
  };

  // Async password validation
  const validatePasswordAsync_ = async (password) => {
    try {
      const cacheKey = `pwd_async_${Date.now()}`;
      const result = await dispatch(validatePasswordAsync({ password, cacheKey })).unwrap();
      return result.result;
    } catch (error) {
      console.error('Security Hook: Async password validation error:', error);
      return { isValid: false, message: 'Salasanan validointi epäonnistui' };
    }
  };

  // Email validation
  const validateEmail = (email) => {
    // Käytä suoraan AuthService validointia ilman cachea
    try {
      return AuthService.validateEmail(email);
    } catch (error) {
      console.error('Security Hook: Email validation error:', error);
      return { isValid: false, message: 'Sähköpostin validointi epäonnistui' };
    }
  };

  // Password strength
  const getPasswordStrength = (password) => {
    try {
      return AuthService.getPasswordStrength(password);
    } catch (error) {
      console.error('Security Hook: Password strength error:', error);
      return { score: 0, feedback: ['Salasanan vahvuuden tarkistus epäonnistui'] };
    }
  };

  // Input sanitization
  const sanitizeInput = (input) => {
    try {
      return SecurityService.sanitizeInput(input);
    } catch (error) {
      console.error('Security Hook: Input sanitization error:', error);
      return input; // Return original if sanitization fails
    }
  };

  // XSS protection
  const isSafeFromInjection = (input) => {
    try {
      return SecurityService.isSafeFromInjection(input);
    } catch (error) {
      console.error('Security Hook: Injection check error:', error);
      return false; // Assume unsafe if check fails
    }
  };

  // Rate limiting
  const checkRateLimit = (identifier, maxAttempts, timeWindow) => {
    try {
      return SecurityService.checkRateLimit(identifier, maxAttempts, timeWindow);
    } catch (error) {
      console.error('Security Hook: Rate limit check error:', error);
      return { allowed: false, remaining: 0, resetTime: Date.now() };
    }
  };

  // User input validation
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
      console.error('Security Hook: User input validation error:', error);
      return {
        isValid: false,
        errors: ['Validointi epäonnistui'],
        warnings: [],
        sanitizedData: data
      };
    }
  };

  // Username validation
  const validateUsername = (username) => {
    try {
      return SecurityService.validateUsername(username);
    } catch (error) {
      console.error('Security Hook: Username validation error:', error);
      return { isValid: false, message: 'Käyttäjänimen validointi epäonnistui' };
    }
  };

  // Phone validation
  const validatePhoneNumber = (phone) => {
    try {
      return SecurityService.validatePhoneNumber(phone);
    } catch (error) {
      console.error('Security Hook: Phone validation error:', error);
      return { isValid: false, message: 'Puhelinnumeron validointi epäonnistui' };
    }
  };

  // Description validation
  const validateDescription = (description) => {
    try {
      return SecurityService.validateDescription(description);
    } catch (error) {
      console.error('Security Hook: Description validation error:', error);
      return { isValid: false, message: 'Kuvauksen validointi epäonnistui' };
    }
  };

  // Security score
  const getSecurityScore = async (userId, userData) => {
    try {
      const result = await dispatch(calculateSecurityScore({ userId, userData })).unwrap();
      return result.score;
    } catch (error) {
      console.error('Security Hook: Security score calculation error:', error);
      return 0;
    }
  };

  // Account management
  const markAccountCreationTime = (userId) => {
    try {
      return AuthService.markAccountCreationTime(userId);
    } catch (error) {
      console.error('Security Hook: Account creation tracking error:', error);
    }
  };

  const markAccountVerified = (userId) => {
    try {
      return AuthService.markAccountVerified(userId);
    } catch (error) {
      console.error('Security Hook: Account verification marking error:', error);
    }
  };

  const getAccountStatus = (userId) => {
    try {
      return AuthService.getAccountStatus(userId);
    } catch (error) {
      console.error('Security Hook: Account status check error:', error);
      return { status: 'error', verified: false };
    }
  };

  const getUnverifiedAccounts = () => {
    try {
      return AuthService.getUnverifiedAccounts();
    } catch (error) {
      console.error('Security Hook: Unverified accounts fetch error:', error);
      return {};
    }
  };

  const cleanupExpiredAccountsAction = async () => {
    try {
      const result = await dispatch(cleanupExpiredAccounts()).unwrap();
      return result;
    } catch (error) {
      console.error('Security Hook: Account cleanup error:', error);
      return { error: error.message };
    }
  };

  const startCleanupTimer = () => {
    try {
      return AuthService.startCleanupTimer();
    } catch (error) {
      console.error('Security Hook: Cleanup timer error:', error);
      return null;
    }
  };

  // Settings management
  const updateSettings = (newSettings) => {
    dispatch(updateSecuritySettings(newSettings));
  };

  // Cache management
  const clearCache = () => {
    dispatch(clearValidationCache());
  };

  // Error management
  const clearSecurityError = () => {
    dispatch(clearError());
  };

  return {
    // State
    loading,
    error,
    settings,
    
    // Password Security
    validatePassword,
    validatePasswordAsync: validatePasswordAsync_,
    getPasswordStrength,
    
    // Email Validation
    validateEmail,
    
    // Input Sanitization
    sanitizeInput,
    isSafeFromInjection,
    
    // Rate Limiting
    checkRateLimit,
    
    // User Input Validation
    validateUsername,
    validatePhoneNumber,
    validateDescription,
    validateUserInput,
    
    // Account Management
    markAccountCreationTime,
    markAccountVerified,
    getAccountStatus,
    getUnverifiedAccounts,
    cleanupExpiredAccounts: cleanupExpiredAccountsAction,
    startCleanupTimer,
    
    // Security Analytics
    getSecurityScore,
    
    // Settings & Cache
    updateSettings,
    clearCache,
    clearError: clearSecurityError,
    
    // Full security object for compatibility
    security
  };
};