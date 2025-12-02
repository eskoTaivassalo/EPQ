import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AuthService from '../../services/authService';
import SecurityService from '../../services/securityService';

/**
 * 🛡️ Security Slice - Turvallisuustoiminnot ja validointi
 * 
 * Korvaa SecurityContext:in Redux-pohjaisella ratkaisulla
 * Sisältää turvallisuusvalidoinnit ja account management
 */

// Initial state
const initialState = {
  // Validation results cache
  passwordValidations: {},
  emailValidations: {},
  
  // Rate limiting
  rateLimits: {},
  
  // Account security
  accountStatuses: {},
  securityScores: {},
  
  // Settings
  securitySettings: {
    enforcePasswordPolicy: true,
    enableRateLimit: true,
    maxLoginAttempts: 5,
    accountExpirationDays: 30
  },
  
  // State
  loading: false,
  error: null,
};

// Async Thunks

export const validatePasswordAsync = createAsyncThunk(
  'security/validatePassword',
  async ({ password, cacheKey }, { rejectWithValue }) => {
    try {
      const result = AuthService.validatePassword(password);
      return { result, cacheKey };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const validateEmailAsync = createAsyncThunk(
  'security/validateEmail',
  async ({ email, cacheKey }, { rejectWithValue }) => {
    try {
      const result = AuthService.validateEmail(email);
      return { result, cacheKey };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkRateLimitAsync = createAsyncThunk(
  'security/checkRateLimit',
  async ({ identifier, maxAttempts, timeWindow }, { rejectWithValue }) => {
    try {
      const result = SecurityService.checkRateLimit(identifier, maxAttempts, timeWindow);
      return { result, identifier };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const calculateSecurityScore = createAsyncThunk(
  'security/calculateSecurityScore',
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      let score = 0;
      
      // Password strength (0-30 points)
      if (userData.password) {
        const passwordResult = AuthService.validatePassword(userData.password);
        score += Math.min(30, passwordResult.score || 0);
      }
      
      // Email verification (20 points)
      if (userData.emailVerified) {
        score += 20;
      }
      
      // Profile completeness (0-30 points)
      const profileFields = ['fullName', 'email', 'phone', 'location'];
      const completedFields = profileFields.filter(field => userData[field]).length;
      score += (completedFields / profileFields.length) * 30;
      
      // Account age (0-20 points)
      if (userData.createdAt) {
        const accountAge = Math.floor((Date.now() - new Date(userData.createdAt)) / (1000 * 60 * 60 * 24));
        score += Math.min(20, accountAge);
      }
      
      return { userId, score: Math.round(score) };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const cleanupExpiredAccounts = createAsyncThunk(
  'security/cleanupExpiredAccounts',
  async (_, { getState, rejectWithValue }) => {
    try {
      const result = await AuthService.cleanupExpiredAccounts();
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Security Slice
const securitySlice = createSlice({
  name: 'security',
  initialState,
  reducers: {
    // Synchronous validation actions
    validatePasswordSync: (state, action) => {
      const { password, cacheKey } = action.payload;
      try {
        const result = AuthService.validatePassword(password);
        state.passwordValidations[cacheKey] = {
          result,
          timestamp: Date.now()
        };
      } catch (error) {
        state.error = error.message;
      }
    },
    
    validateEmailSync: (state, action) => {
      const { email, cacheKey } = action.payload;
      try {
        const result = AuthService.validateEmail(email);
        state.emailValidations[cacheKey] = {
          result,
          timestamp: Date.now()
        };
      } catch (error) {
        state.error = error.message;
      }
    },
    
    // Input sanitization
    sanitizeInput: (state, action) => {
      // This would be handled synchronously, returning sanitized input
      // Implementation depends on SecurityService.sanitizeInput
    },
    
    // Rate limiting
    updateRateLimit: (state, action) => {
      const { identifier, attempts, resetTime } = action.payload;
      state.rateLimits[identifier] = {
        attempts,
        resetTime,
        timestamp: Date.now()
      };
    },
    
    // Account status updates
    updateAccountStatus: (state, action) => {
      const { userId, status } = action.payload;
      state.accountStatuses[userId] = {
        ...status,
        timestamp: Date.now()
      };
    },
    
    // Security settings
    updateSecuritySettings: (state, action) => {
      state.securitySettings = {
        ...state.securitySettings,
        ...action.payload
      };
    },
    
    // Clear cached validations (housekeeping)
    clearValidationCache: (state) => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      // Clear old password validations
      Object.keys(state.passwordValidations).forEach(key => {
        if (state.passwordValidations[key].timestamp < oneHourAgo) {
          delete state.passwordValidations[key];
        }
      });
      
      // Clear old email validations
      Object.keys(state.emailValidations).forEach(key => {
        if (state.emailValidations[key].timestamp < oneHourAgo) {
          delete state.emailValidations[key];
        }
      });
    },
    
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Async password validation
    builder
      .addCase(validatePasswordAsync.fulfilled, (state, action) => {
        const { result, cacheKey } = action.payload;
        state.passwordValidations[cacheKey] = {
          result,
          timestamp: Date.now()
        };
      })
      .addCase(validatePasswordAsync.rejected, (state, action) => {
        state.error = action.payload;
      });
      
    // Async email validation
    builder
      .addCase(validateEmailAsync.fulfilled, (state, action) => {
        const { result, cacheKey } = action.payload;
        state.emailValidations[cacheKey] = {
          result,
          timestamp: Date.now()
        };
      })
      .addCase(validateEmailAsync.rejected, (state, action) => {
        state.error = action.payload;
      });
      
    // Rate limit check
    builder
      .addCase(checkRateLimitAsync.fulfilled, (state, action) => {
        const { result, identifier } = action.payload;
        state.rateLimits[identifier] = {
          ...result,
          timestamp: Date.now()
        };
      })
      .addCase(checkRateLimitAsync.rejected, (state, action) => {
        state.error = action.payload;
      });
      
    // Security score calculation
    builder
      .addCase(calculateSecurityScore.pending, (state) => {
        state.loading = true;
      })
      .addCase(calculateSecurityScore.fulfilled, (state, action) => {
        const { userId, score } = action.payload;
        state.loading = false;
        state.securityScores[userId] = {
          score,
          timestamp: Date.now()
        };
      })
      .addCase(calculateSecurityScore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
      
    // Account cleanup
    builder
      .addCase(cleanupExpiredAccounts.pending, (state) => {
        state.loading = true;
      })
      .addCase(cleanupExpiredAccounts.fulfilled, (state, action) => {
        state.loading = false;
        // Could update some cleanup statistics here
      })
      .addCase(cleanupExpiredAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  validatePasswordSync,
  validateEmailSync,
  sanitizeInput,
  updateRateLimit,
  updateAccountStatus,
  updateSecuritySettings,
  clearValidationCache,
  clearError,
} = securitySlice.actions;

// Selectors
export const selectSecurity = (state) => state.security || {};
export const selectPasswordValidation = (cacheKey) => (state) => 
  state.security?.passwordValidations?.[cacheKey];
export const selectEmailValidation = (cacheKey) => (state) => 
  state.security?.emailValidations?.[cacheKey];
export const selectRateLimit = (identifier) => (state) => 
  state.security?.rateLimits?.[identifier];
export const selectAccountStatus = (userId) => (state) => 
  state.security?.accountStatuses?.[userId];
export const selectSecurityScore = (userId) => (state) => 
  state.security?.securityScores?.[userId];
export const selectSecuritySettings = (state) => state.security?.securitySettings || {};
export const selectSecurityLoading = (state) => state.security?.loading || false;
export const selectSecurityError = (state) => state.security?.error || null;

export default securitySlice.reducer;