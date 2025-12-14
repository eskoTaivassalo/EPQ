/**
 * DevOps Performance Dashboard
 * Näyttää reaaliaikaiset performance metriikat ja Redux state
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useSelector } from 'react-redux';
import performanceTracker from '../../utils/performanceTracker';

const DevOpsPerformanceDashboard = ({ navigation }) => {
  const [metrics, setMetrics] = useState({});
  const [reduxState, setReduxState] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to Redux state changes
  const auth = useSelector(state => state.auth);
  const bookings = useSelector(state => state.bookings);
  const notifications = useSelector(state => state.notifications);

  useEffect(() => {
    // Update metrics every 500ms
    const interval = setInterval(() => {
      setMetrics({ ...performanceTracker.getAllMetrics?.() || {} });
      setReduxState({
        auth: {
          isLoggedIn: auth?.token !== null,
          userRole: auth?.user?.role,
        },
        bookings: {
          loading: bookings?.loading,
          count: bookings?.bookings?.length || 0,
          error: bookings?.error ? true : false,
        },
        notifications: {
          loading: notifications?.loading,
          count: notifications?.notifications?.length || 0,
          cacheValid: notifications?.cacheValidUntil > Date.now(),
        },
      });
    }, 500);

    return () => clearInterval(interval);
  }, [auth, bookings, notifications]);

  const MetricRow = ({ label, value, color = '#666' }) => (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color }]}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );

  const clearMetrics = () => {
    performanceTracker.clear?.();
    setMetrics({});
    setRefreshTrigger(prev => prev + 1);
    alert('📊 Metrics cleared');
  };

  const exportMetrics = () => {
    const summary = performanceTracker.summary?.();
    console.log('📤 DEVOPS EXPORT:\n', summary);
    alert('📤 Check console for full metrics export');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🔧 DevOps Performance Dashboard</Text>
          <Text style={styles.subtitle}>Real-time metrics & state monitoring</Text>
        </View>

        {/* Redux State Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Redux State</Text>

          {/* Auth */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Auth</Text>
            <MetricRow
              label="Logged In"
              value={reduxState.auth?.isLoggedIn ? '✅ Yes' : '❌ No'}
              color={reduxState.auth?.isLoggedIn ? '#22c55e' : '#ef4444'}
            />
            <MetricRow label="Role" value={reduxState.auth?.userRole || '—'} />
          </View>

          {/* Bookings */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Bookings</Text>
            <MetricRow
              label="Loading"
              value={reduxState.bookings?.loading ? '⏳ Yes' : '✅ No'}
              color={reduxState.bookings?.loading ? '#f59e0b' : '#22c55e'}
            />
            <MetricRow label="Count" value={reduxState.bookings?.count || '0'} />
            <MetricRow
              label="Error"
              value={reduxState.bookings?.error ? '❌ Yes' : '✅ No'}
              color={reduxState.bookings?.error ? '#ef4444' : '#22c55e'}
            />
          </View>

          {/* Notifications */}
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Notifications</Text>
            <MetricRow
              label="Loading"
              value={reduxState.notifications?.loading ? '⏳ Yes' : '✅ No'}
              color={reduxState.notifications?.loading ? '#f59e0b' : '#22c55e'}
            />
            <MetricRow label="Count" value={reduxState.notifications?.count || '0'} />
            <MetricRow
              label="Cache Valid"
              value={reduxState.notifications?.cacheValid ? '✅ Yes' : '❌ No'}
              color={reduxState.notifications?.cacheValid ? '#22c55e' : '#ef4444'}
            />
          </View>
        </View>

        {/* Performance Metrics Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Performance Metrics</Text>
          {Object.keys(metrics).length === 0 ? (
            <Text style={styles.emptyText}>Navigate to BookingsScreen to capture metrics</Text>
          ) : (
            Object.entries(metrics).map(([key, value]) => (
              <MetricRow
                key={key}
                label={key}
                value={typeof value === 'number' ? `${value.toFixed(2)}ms` : String(value)}
              />
            ))
          )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Instructions</Text>
          <Text style={styles.instructionText}>
            1. Navigate to BookingsScreen{'\n'}
            2. Watch metrics update in real-time{'\n'}
            3. Tap "Export Metrics" to save to console{'\n'}
            4. Check console logs for detailed timing information
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonWarning} onPress={clearMetrics}>
            <Text style={styles.buttonText}>🗑️ Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonPrimary} onPress={exportMetrics}>
            <Text style={styles.buttonText}>📤 Export</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  subsection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  instructionText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#e5e5e5',
    alignItems: 'center',
  },
  buttonPrimary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  buttonWarning: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default DevOpsPerformanceDashboard;
