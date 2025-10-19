import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import SecurityService from '../services/securityService';
import AuthService from '../services/authService';

/**
 * Security Testing Screen - Testaa SecurityService toiminnallisuudet
 */
const SecurityTestScreen = () => {
  const [testResults, setTestResults] = useState([]);
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('TestPass123!');
  const [username, setUsername] = useState('TestUser');
  const [phone, setPhone] = useState('0401234567');
  const [description, setDescription] = useState('This is a test description');

  const addResult = (test, result, success) => {
    setTestResults(prev => [...prev, { test, result, success, timestamp: new Date().toLocaleTimeString() }]);
  };

  const runAllTests = async () => {
    setTestResults([]);
    
    // Test 1: Email validation
    try {
      const emailValid = AuthService.validateEmail(email);
      addResult('Email Validation', `Email ${email} is ${emailValid ? 'valid' : 'invalid'}`, emailValid);
    } catch (error) {
      addResult('Email Validation', `Error: ${error.message}`, false);
    }

    // Test 2: Password validation
    try {
      const passwordResult = AuthService.validatePassword(password);
      addResult('Password Validation', `${passwordResult.message}`, passwordResult.isValid);
    } catch (error) {
      addResult('Password Validation', `Error: ${error.message}`, false);
    }

    // Test 3: Password strength
    try {
      const strength = AuthService.getPasswordStrength(password);
      addResult('Password Strength', `Strength score: ${strength}/100`, strength > 50);
    } catch (error) {
      addResult('Password Strength', `Error: ${error.message}`, false);
    }

    // Test 4: Username validation
    try {
      const usernameResult = SecurityService.validateUsername(username);
      addResult('Username Validation', `${usernameResult.message || 'Valid'}`, usernameResult.isValid);
    } catch (error) {
      addResult('Username Validation', `Error: ${error.message}`, false);
    }

    // Test 5: Phone validation
    try {
      const phoneResult = SecurityService.validatePhoneNumber(phone);
      addResult('Phone Validation', `${phoneResult.message || 'Valid'}`, phoneResult.isValid);
    } catch (error) {
      addResult('Phone Validation', `Error: ${error.message}`, false);
    }

    // Test 6: Description validation
    try {
      const descResult = SecurityService.validateDescription(description);
      addResult('Description Validation', `${descResult.message || 'Valid'}`, descResult.isValid);
    } catch (error) {
      addResult('Description Validation', `Error: ${error.message}`, false);
    }

    // Test 7: XSS sanitization
    try {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = SecurityService.sanitizeInput(maliciousInput);
      const isSafe = !sanitized.includes('<script>');
      addResult('XSS Sanitization', `Input sanitized: ${sanitized}`, isSafe);
    } catch (error) {
      addResult('XSS Sanitization', `Error: ${error.message}`, false);
    }

    // Test 8: Injection prevention
    try {
      const sqlInjection = "'; DROP TABLE users; --";
      const isSafe = SecurityService.isSafeFromInjection(sqlInjection);
      addResult('Injection Prevention', `SQL injection ${isSafe ? 'blocked' : 'NOT BLOCKED'}`, !isSafe);
    } catch (error) {
      addResult('Injection Prevention', `Error: ${error.message}`, false);
    }

    // Test 9: Rate limiting
    try {
      const rateLimit1 = SecurityService.checkRateLimit('test-user', 3, 60000);
      const rateLimit2 = SecurityService.checkRateLimit('test-user', 3, 60000);
      const rateLimit3 = SecurityService.checkRateLimit('test-user', 3, 60000);
      const rateLimit4 = SecurityService.checkRateLimit('test-user', 3, 60000); // Should be blocked
      
      addResult('Rate Limiting', `4th request blocked: ${!rateLimit4.allowed}`, !rateLimit4.allowed);
    } catch (error) {
      addResult('Rate Limiting', `Error: ${error.message}`, false);
    }
  };

  const testWeakPasswords = () => {
    const weakPasswords = ['password', '123456', 'abc', 'P@ss'];
    const results = weakPasswords.map(pwd => {
      const result = AuthService.validatePassword(pwd);
      return `${pwd}: ${result.isValid ? '✅' : '❌'} (${result.message})`;
    });
    
    Alert.alert('Weak Password Tests', results.join('\n\n'));
  };

  const testAccountExpiration = async () => {
    try {
      // Test account creation tracking
      const testUserId = 'test-user-12345';
      AuthService.markAccountCreationTime(testUserId);
      
      // Test account status
      const status = AuthService.getAccountStatus(testUserId);
      
      // Test unverified accounts list
      const unverifiedAccounts = AuthService.getUnverifiedAccounts();
      
      // Test cleanup (dry run)
      const cleanupResult = await AuthService.cleanupExpiredAccounts();
      
      const results = [
        `Account created and tracked: ${testUserId}`,
        `Status: ${status.status}`,
        `Time left: ${status.timeLeftHours || 0} hours`,
        `Unverified accounts: ${Object.keys(unverifiedAccounts).length}`,
        `Cleanup checked: ${cleanupResult.checked || 0} accounts`,
        `Expired found: ${cleanupResult.expired || 0} accounts`
      ];
      
      Alert.alert('Account Expiration Tests', results.join('\n\n'));
      
    } catch (error) {
      Alert.alert('Account Expiration Test Error', error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔐 Security Service Testing</Text>
      
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>Test Inputs:</Text>
        
        <View style={styles.inputGroup}>
          <Text>Email:</Text>
          <TextInput 
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="test@example.com"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text>Password:</Text>
          <TextInput 
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="TestPass123!"
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text>Username:</Text>
          <TextInput 
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="TestUser"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text>Phone:</Text>
          <TextInput 
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="0401234567"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text>Description:</Text>
          <TextInput 
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Test description"
            multiline
          />
        </View>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity style={styles.button} onPress={runAllTests}>
          <Text style={styles.buttonText}>🧪 Run All Security Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testWeakPasswords}>
          <Text style={styles.buttonText}>🔓 Test Weak Passwords</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testAccountExpiration}>
          <Text style={styles.buttonText}>⏰ Test Account Expiration</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsSection}>
        <Text style={styles.sectionTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <View key={index} style={[styles.resultItem, result.success ? styles.success : styles.failure]}>
            <Text style={styles.resultTitle}>{result.success ? '✅' : '❌'} {result.test}</Text>
            <Text style={styles.resultText}>{result.result}</Text>
            <Text style={styles.resultTime}>{result.timestamp}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  inputSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 15
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: '#fff'
  },
  buttonSection: {
    marginBottom: 20
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold'
  },
  resultsSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8
  },
  resultItem: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 4
  },
  success: {
    backgroundColor: '#d4edda',
    borderLeftColor: '#28a745'
  },
  failure: {
    backgroundColor: '#f8d7da',
    borderLeftColor: '#dc3545'
  },
  resultTitle: {
    fontWeight: 'bold',
    fontSize: 14
  },
  resultText: {
    fontSize: 12,
    marginTop: 2,
    color: '#666'
  },
  resultTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  }
});

export default SecurityTestScreen;