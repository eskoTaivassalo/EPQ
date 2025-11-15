import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../styles/commonStyles';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.section}>General</Text>
      <Text style={styles.item}>• Language</Text>
      <Text style={styles.item}>• Notifications</Text>
      <Text style={styles.item}>• Privacy</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 8 },
  item: { fontSize: 14, color: colors.textLight, marginBottom: 6 },
});
