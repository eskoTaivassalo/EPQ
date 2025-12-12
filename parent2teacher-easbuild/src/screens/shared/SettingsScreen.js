import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { auth, db } from '../../config/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { ROLE_CONFIG, getCanonicalRole } from '../../config/roleConfig';

export default function SettingsScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user notification preferences from Firestore
  useEffect(() => {
    if (user?.uid) {
      loadNotificationSettings();
    }
  }, [user?.uid]);

  const loadNotificationSettings = async () => {
    try {
      const canonicalRole = getCanonicalRole(user?.role || user?.type || user?.userType);
      const roleConfig = ROLE_CONFIG[canonicalRole];
      const collectionName = roleConfig?.collectionName || 'users';
      
      const userDocRef = doc(db, collectionName, user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const prefs = data.notificationPreferences || {};
        
        setNotificationsEnabled(prefs.enabled ?? true);
        setEmailNotifications(prefs.email ?? true);
        setPushNotifications(prefs.push ?? true);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNotificationSettings = async (settings) => {
    try {
      const canonicalRole = getCanonicalRole(user?.role || user?.type || user?.userType);
      const roleConfig = ROLE_CONFIG[canonicalRole];
      const collectionName = roleConfig?.collectionName || 'users';
      
      const userDocRef = doc(db, collectionName, user.uid);
      
      await setDoc(userDocRef, {
        notificationPreferences: settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Notification settings saved:', settings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    }
  };

  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    const settings = {
      enabled: value,
      email: value ? emailNotifications : false,
      push: value ? pushNotifications : false
    };
    
    // If disabling all, turn off sub-toggles too
    if (!value) {
      setEmailNotifications(false);
      setPushNotifications(false);
    }
    
    saveNotificationSettings(settings);
  };

  const handleEmailNotificationsToggle = (value) => {
    setEmailNotifications(value);
    saveNotificationSettings({
      enabled: notificationsEnabled,
      email: value,
      push: pushNotifications
    });
  };

  const handlePushNotificationsToggle = (value) => {
    setPushNotifications(value);
    saveNotificationSettings({
      enabled: notificationsEnabled,
      email: emailNotifications,
      push: value
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This will permanently delete all your data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    try {
      setRefreshing(true);
      
      const canonicalRole = getCanonicalRole(user?.role || user?.type || user?.userType);
      const roleConfig = ROLE_CONFIG[canonicalRole];
      const collectionName = roleConfig?.collectionName || 'users';
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // 1. Delete user data from Firestore FIRST
      try {
        const userDocRef = doc(db, 'serviceTypes', 'education', collectionName, user.uid);
        await deleteDoc(userDocRef);
        console.log('✅ User document deleted from Firestore');
      } catch (firestoreError) {
        console.error('Firestore deletion error:', firestoreError);
        // Continue anyway - try to delete auth account
      }

      // 2. Try to delete user from Firebase Authentication
      try {
        await deleteUser(currentUser);
        console.log('✅ User deleted from Firebase Authentication');
      } catch (authError) {
        console.error('Auth deletion error:', authError);
        // If auth deletion fails, still log out the user
        console.log('⚠️ Auth deletion failed, logging out anyway');
      }
      
      // 3. Clear Redux state and log out
      await logout();
      
      // Success - user is logged out
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error',
        `Failed to delete account: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      // Ei näytetä alertia pull-to-refresh:ssä, vain kun painetaan nappia
    } catch (error) {
      console.error('Refresh error:', error);
      Alert.alert('Error', 'Failed to refresh profile. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    await handleRefreshProfile();
    if (!refreshing) {
      Alert.alert('Success', 'Profile information refreshed!');
    }
  };

  const showDebugInfo = () => {
    const userInfo = `
Email: ${user?.email || 'N/A'}
UID: ${user?.uid || 'N/A'}
Role: ${user?.role || 'N/A'}
Type: ${user?.type || 'N/A'}
UserType: ${user?.userType || 'N/A'}
Name: ${user?.name || user?.fullName || 'N/A'}
EmailVerified: ${user?.emailVerified ? 'Yes' : 'No'}
    `.trim();
    
    Alert.alert('User Debug Info', userInfo, [
      { text: 'Copy to Console', onPress: () => console.log('User Object:', user) },
      { text: 'OK' }
    ]);
  };

  const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, iconColor = colors.primary }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={[styles.settingIconContainer, { backgroundColor: iconColor === colors.error ? '#FFF5F5' : '#F0F7FF' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, iconColor === colors.error && { color: colors.error }]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={20} color={iconColor === colors.error ? colors.error : colors.textSecondary} />}
    </TouchableOpacity>
  );

  const SettingToggle = ({ icon, title, subtitle, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top', 'bottom']}>
      <WatercolorBackground />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity 
          onPress={handleManualRefresh}
          style={styles.backButton}
          disabled={refreshing}
        >
          <Ionicons 
            name={refreshing ? "hourglass-outline" : "refresh"} 
            size={24} 
            color={refreshing ? colors.textSecondary : colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshProfile}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Pull to refresh"
            titleColor={colors.textSecondary}
          />
        }
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <SettingItem
              icon="person-circle-outline"
              title="Profile"
              subtitle="Edit your personal information"
              onPress={() => navigation.navigate('Profile')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="mail-outline"
              title="Change Email"
              subtitle={user?.email || 'Not set'}
              onPress={() => navigation.navigate('ChangeEmail')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="lock-closed-outline"
              title="Change Password"
              subtitle="Update your password"
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <SettingToggle
              icon="notifications-outline"
              title="All Notifications"
              subtitle="Enable or disable all notifications"
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
            />
            <View style={styles.divider} />
            <SettingToggle
              icon="mail-outline"
              title="Email Notifications"
              subtitle="Receive updates via email"
              value={emailNotifications && notificationsEnabled}
              onValueChange={handleEmailNotificationsToggle}
            />
            <View style={styles.divider} />
            <SettingToggle
              icon="phone-portrait-outline"
              title="Push Notifications"
              subtitle="Receive push notifications"
              value={pushNotifications && notificationsEnabled}
              onValueChange={handlePushNotificationsToggle}
            />
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
          <View style={styles.card}>
            <SettingItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="How we handle your data"
              onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="document-text-outline"
              title="Terms & Conditions"
              subtitle="Read our terms of service"
              onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="information-circle-outline"
              title="Data Storage"
              subtitle="Device storage + Firebase cloud"
              onPress={() => Alert.alert(
                'Data Storage',
                'Your data is stored securely:\n\n• Locally on your device (AsyncStorage)\n• In Firebase cloud services (Google)\n\nWe do NOT use cookies. This is a mobile app.\n\nYou can export or delete your data anytime from Settings.',
                [{ text: 'OK' }]
              )}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.card}>
            <SettingItem
              icon="help-circle-outline"
              title="Help Center"
              subtitle="Get help and support"
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="chatbubble-outline"
              title="Contact Us"
              subtitle="Send us a message"
              onPress={() => navigation.navigate('ContactUs')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="information-circle-outline"
              title="About"
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert('EPQ', 'Version 1.0.0\n\nEducation • Professional • Quorum\n\nConnecting parents with qualified teachers worldwide.')}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="bug-outline"
              title="Debug User Info"
              subtitle="Show current user data"
              onPress={showDebugInfo}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DANGER ZONE</Text>
          <View style={styles.card}>
            <SettingItem
              icon="log-out-outline"
              title="Log Out"
              subtitle="Sign out of your account"
              onPress={handleLogout}
              iconColor={colors.error}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="trash-outline"
              title="Delete Account"
              subtitle="Permanently delete your account"
              onPress={handleDeleteAccount}
              iconColor={colors.error}
            />
          </View>
        </View>

        {/* App Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EPQ v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for education</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    ...commonStyles.rowBetween,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    ...commonStyles.card,
    overflow: 'hidden',
  },
  settingItem: {
    ...commonStyles.row,
    padding: 16,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 48,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
