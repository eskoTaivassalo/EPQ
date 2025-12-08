import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { hasAdminPermission } from '../../middleware/adminAuth';
import { colors } from '../../styles/commonStyles';

const AdminBookings = () => {
  const navigation = useNavigation();
  const authState = useSelector(state => state.auth);

  useEffect(() => {
    // Security check - redirect if not admin
    if (!hasAdminPermission(authState)) {
      navigation.replace('Dashboard');
    }
  }, [authState]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Bookings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="calendar" size={64} color={colors.gray} />
          <Text style={styles.placeholderTitle}>Bookings Management Coming Soon</Text>
          <Text style={styles.placeholderText}>
            This screen will allow you to:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>📅 View all system bookings</Text>
            <Text style={styles.featureItem}>🔍 Search and filter bookings</Text>
            <Text style={styles.featureItem}>✏️ Edit booking details</Text>
            <Text style={styles.featureItem}>❌ Cancel problematic bookings</Text>
            <Text style={styles.featureItem}>📊 Export booking data</Text>
            <Text style={styles.featureItem}>⚠️ Handle booking disputes</Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  featureList: {
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 300,
  },
  featureItem: {
    fontSize: 16,
    color: colors.text,
    marginVertical: 8,
    paddingLeft: 10,
  },
});

export default AdminBookings;
