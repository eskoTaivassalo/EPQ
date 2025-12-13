import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';
import { ROLE_CONFIG, getRoleConfig } from '../../config/roleConfig';
import { setUser } from '../../store/slices/authSlice';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';

const RoleSelectionScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { userId, availableRoles, mainProfile, firebaseUserData } = route.params || {};

  const handleRoleSelect = async (selectedRole) => {
    try {
      
      // Get role config using getRoleConfig which handles legacy roles
      const roleConfig = getRoleConfig(selectedRole);
      if (!roleConfig) {
        return;
      }

      // Fetch role-specific data
      const roleInfo = getRoleCollectionInfo(selectedRole);
      
      const { serviceType, collection: collectionName } = roleInfo;
      const roleProfileRef = doc(db, 'serviceTypes', serviceType, collectionName, userId);
      const roleProfileSnap = await getDoc(roleProfileRef);

      let roleData = null;
      if (roleProfileSnap.exists()) {
        roleData = roleProfileSnap.data();
      }

      // Update Redux with user data
      dispatch(setUser({
        uid: userId,
        email: mainProfile.email || firebaseUserData?.email,
        name: mainProfile.displayName || firebaseUserData?.displayName,
        displayName: mainProfile.displayName || firebaseUserData?.displayName,
        photoURL: mainProfile.photoURL || firebaseUserData?.photoURL,
        emailVerified: firebaseUserData?.emailVerified || false,
        role: selectedRole,
        userType: selectedRole,
        primaryRole: selectedRole,
        roles: availableRoles,
        timestamp: Date.now(),
        ...roleData,
      }));

      // Navigation is handled by App.js based on Redux state
      // The app will automatically navigate to the appropriate screen
    } catch (error) {
      // Error selecting role
    }
  };



  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WatercolorBackground />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Select Your Role</Text>
          <Text style={styles.subtitle}>
            You have multiple roles. Please select which one you'd like to use.
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {availableRoles?.map((role) => {
            const roleConfig = getRoleConfig(role); // Use getRoleConfig instead of direct lookup
            if (!roleConfig) return null;

            return (
              <TouchableOpacity
                key={role}
                style={[styles.roleCard, { borderColor: roleConfig.colors.primary }]}
                onPress={() => handleRoleSelect(role)}
              >
                <View style={[styles.roleIcon, { backgroundColor: roleConfig.colors.primary + '20' }]}>
                  <Ionicons 
                    name={roleConfig.icon} 
                    size={40} 
                    color={roleConfig.colors.primary} 
                  />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>{roleConfig.name}</Text>
                  <Text style={styles.roleDescription}>{roleConfig.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  rolesContainer: {
    gap: 15,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    borderWidth: 2,
    ...commonStyles.shadow,
  },
  roleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

export default RoleSelectionScreen;
