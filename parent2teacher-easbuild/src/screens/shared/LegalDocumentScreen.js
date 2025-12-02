import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';

const PRIVACY_POLICY = `# Privacy Policy - Parents2Teachers App

**Last Updated:** November 18, 2025

## Important: No Cookies Used

**This is a mobile application, not a website.** We do not use HTTP cookies or tracking cookies. Instead, we store data locally on your device and in secure cloud services.

## Information We Collect

### 1. Account Information
• Email address
• Full name
• Phone number (optional)
• Profile picture (optional)
• User type (Teacher or Parent)

### 2. Profile Information

**For Teachers:**
• Professional specialization
• Qualifications and education
• Teaching experience
• Subjects taught
• Languages spoken
• Availability schedule
• Hourly rate

**For Parents:**
• Children's information (names, ages, needs)
• Preferred subjects of interest
• Availability preferences

### 3. Usage Data
• Bookings and appointments
• Messages between users
• Reviews and ratings
• Favorite teachers list

## How We Store Your Data

### Local Storage (On Your Device)
We use AsyncStorage to store:
• Authentication tokens
• User preferences
• App settings
• Temporary cache data

### Cloud Storage (Firebase)
We use Google Firebase to store:
• User profiles
• Messages
• Bookings
• Reviews and ratings

**Firebase Security:**
• Data is encrypted in transit (HTTPS/SSL)
• Data is encrypted at rest
• Access is controlled by security rules
• Only authenticated users can access their own data

## How We Use Your Information

We use your information to:
• Create and manage your account
• Connect teachers with parents
• Facilitate bookings and appointments
• Enable messaging between users
• Process payments (if applicable)
• Send notifications about bookings and messages
• Improve our services

## Data Sharing

**We do NOT sell your data.**

We share your information only:
• Within the app: Your profile is visible to other users
• With Firebase: Our cloud service provider
• If required by law: We may disclose information if legally required

## Your Rights (GDPR Compliance)

You have the right to:
• **Access** your data: Request a copy of all your data
• **Rectify** your data: Update incorrect information
• **Delete** your data: Request account deletion
• **Export** your data: Download your information
• **Restrict** processing: Limit how we use your data
• **Object** to processing: Opt out of certain data uses

To exercise these rights, contact us at: support@parents2teachers.com

## Data Retention

• Active accounts: Data is retained as long as your account is active
• Deleted accounts: Data is permanently deleted within 30 days
• Backups: Backup data is deleted within 90 days

## Children's Privacy

Our service is designed for parents and teachers (18+ years old). We do not knowingly collect personal information from children under 13 without parental consent.

## Push Notifications

We send push notifications for:
• New booking requests
• Booking reminders
• New messages
• System updates

You can disable notifications in your device settings.

## Location Services

We may request location permissions to:
• Show nearby teachers
• Calculate distances
• Provide location-based services

Location sharing is optional and can be disabled in settings.

## Security Measures

We implement security measures including:
• Encrypted data transmission (SSL/TLS)
• Firebase Authentication
• Secure password hashing
• Regular security audits
• Limited access controls

## Third-Party Services

We use the following third-party services:
• Firebase (Google) - Authentication, database, storage
• Expo - Mobile app framework
• Google Sign-In - Optional authentication method

## Contact Us

For privacy questions or data requests:
• Email: support@parents2teachers.com
• In-app: Settings > Privacy & Data
• GDPR requests: gdpr@parents2teachers.com

## Summary

✓ What we collect: Your profile, bookings, messages
✓ Where we store it: Your device + Firebase cloud
✓ No cookies: This is a mobile app, not a website
✓ Your rights: Access, export, delete your data anytime
✓ We don't sell data: Your privacy is protected
✓ Security: Encrypted and access-controlled

Parents2Teachers © 2025 | All rights reserved`;

const TERMS_CONDITIONS = `# Terms and Conditions - Parents2Teachers App

**Last Updated:** November 18, 2025

## 1. Acceptance of Terms

By accessing and using the Parents2Teachers mobile application, you accept and agree to be bound by these Terms and Conditions.

## 2. Description of Service

Parents2Teachers is a platform connecting teachers and tutors with parents seeking educational services for their children.

## 3. User Accounts

### Registration
• You must be at least 18 years old to create an account
• You must provide accurate and complete information
• You are responsible for maintaining account security
• One person may not maintain multiple accounts

### Account Types
• Teachers: Provide educational services
• Parents: Seek educational services for children

## 4. User Responsibilities

### Teachers Must:
• Have appropriate qualifications and credentials
• Provide accurate information about experience and education
• Maintain professional conduct at all times
• Honor all confirmed bookings
• Report any safety concerns immediately

### Parents Must:
• Provide accurate information about children's needs
• Honor all confirmed bookings
• Treat teachers with respect
• Report any safety concerns immediately

## 5. Bookings and Payments

### Bookings
• Bookings are subject to teacher availability
• Both parties must honor confirmed bookings
• Cancellations must follow the cancellation policy
• No-shows may result in account suspension

### Cancellation Policy
• 24+ hours notice: Full refund (if applicable)
• Less than 24 hours: No refund
• No-show: No refund + potential account penalty

## 6. Data and Privacy

### Data Storage
• Your data is stored locally on your device (AsyncStorage)
• Your data is stored in Firebase cloud services (Google)
• We do not use cookies (this is a mobile app)
• Full details in our Privacy Policy

### Your Rights
• Access your data anytime
• Export your data in JSON format
• Delete your account and all data
• Opt out of marketing communications

## 7. Prohibited Conduct

Users may NOT:
• Impersonate others
• Share account credentials
• Collect user data for external purposes
• Use the app for illegal activities
• Harass, threaten, or abuse other users
• Circumvent app security measures
• Create fake reviews or ratings

## 8. Safety and Background Checks

### Teacher Verification
• Teachers are responsible for providing accurate credentials
• We reserve the right to verify qualifications
• Background checks may be required in the future

### Safety
• All interactions should occur through the app initially
• Report suspicious behavior immediately
• Parents should verify teacher credentials
• Initial meetings should occur in public places or online

## 9. Disclaimers

### Service "As Is"
• The app is provided "as is" without warranties
• We don't guarantee uninterrupted service
• We don't guarantee specific results

### User Interactions
• We are not responsible for interactions between users
• We don't guarantee teacher qualifications
• Users are responsible for their own safety

## 10. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW:
• We are not liable for indirect, incidental, or consequential damages
• Our liability is limited to the fees you paid (if any)
• We are not responsible for user conduct or safety

## 11. Account Termination

### By You
• You may delete your account anytime through Settings
• Data will be deleted within 30 days

### By Us
We may suspend or terminate accounts for:
• Violation of these terms
• Fraudulent activity
• Illegal conduct
• Abuse or harassment
• Multiple no-shows
• False information

## 12. Modifications to Terms

• We may modify these terms at any time
• Changes will be posted with "Last Updated" date
• Continued use after changes constitutes acceptance

## 13. Contact Information

For questions about these terms:
• Email: support@parents2teachers.com
• In-app: Settings > Help & Support
• Legal: legal@parents2teachers.com

## 14. Special Terms for Teachers

### Independent Contractors
• Teachers are independent contractors, not employees
• Teachers are responsible for their own taxes
• Teachers set their own rates and schedules

### Professional Conduct
• Maintain appropriate professional boundaries
• Follow all applicable laws and regulations
• Report safety concerns immediately

## 15. Special Terms for Parents

### Child Safety
• Parents are responsible for child safety
• Verify teacher credentials independently
• Supervise interactions as appropriate
• Report concerns immediately

## Summary

✓ Must be 18+ to use
✓ Be honest in your profile
✓ Honor your bookings
✓ Respect other users
✓ Report safety concerns
✓ We store data locally + Firebase
✓ No cookies (mobile app)
✓ Can delete account anytime

By using Parents2Teachers, you agree to these Terms and Conditions.

Parents2Teachers © 2025 | All rights reserved`;

export default function LegalDocumentScreen({ route, navigation }) {
  const { type } = route.params || { type: 'privacy' };
  const isPrivacy = type === 'privacy';
  
  const content = isPrivacy ? PRIVACY_POLICY : TERMS_CONDITIONS;
  const title = isPrivacy ? 'Privacy Policy' : 'Terms & Conditions';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.content}>{content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  content: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.text,
  },
});
