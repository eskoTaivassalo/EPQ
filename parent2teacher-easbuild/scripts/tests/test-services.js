// Testaa että kaikki uudet palvelut ovat importattavissa
console.log('=== TESTING NEW SERVICES ===');

try {
  // Test AuthService
  const AuthService = require('../../src/services/authService.js').default;
  console.log('✅ AuthService imported successfully');
  console.log('AuthService methods:', Object.getOwnPropertyNames(AuthService));
  
  // Test SecurityService  
  const SecurityService = require('../../src/services/securityService.js').default;
  console.log('✅ SecurityService imported successfully');
  console.log('SecurityService methods:', Object.getOwnPropertyNames(SecurityService));
  
  // Test GDPRService
  const GDPRService = require('./src/services/gdprService.js').default;
  console.log('✅ GDPRService imported successfully');
  console.log('GDPRService methods:', Object.getOwnPropertyNames(GDPRService));
  
  console.log('\n=== SERVICE CONSTANTS ===');
  console.log('GDPR Consent Types:', GDPRService.CONSENT_TYPES);
  
} catch (error) {
  console.error('❌ Service import error:', error.message);
}

console.log('\n=== TESTING COMPLETE ===');