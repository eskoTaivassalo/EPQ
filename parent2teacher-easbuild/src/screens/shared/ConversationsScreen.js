import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { listConversationsForUser } from '../../services/communicationService';
import { db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function ConversationsScreen({ navigation, route }) {
  const { user } = useAuth();
  const role = (user?.userType || user?.type) === 'teacher' ? 'teacher' : 'parent';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [nameMap, setNameMap] = useState({});

  // Check if we should start a new conversation immediately
  const { recipientId, recipientName } = route?.params || {};

  const loadNames = useCallback(async (rows) => {
    try {
      const ids = Array.from(new Set(rows.map(r => r.counterpartId).filter(Boolean)));
      const map = {};
      // Teachers see parents; parents see teachers
      const collection = role === 'teacher' ? 'parents' : 'teachers';
      for (const id of ids) {
        try {
          const snap = await getDoc(doc(db, collection, id));
          const data = snap.exists() ? snap.data() : null;
          map[id] = data?.name || data?.fullName || id;
        } catch {}
      }
      setNameMap(map);
    } catch {}
  }, [role]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading conversations for:', user.uid, 'role:', role);
      const rows = await listConversationsForUser(user.uid, role);
      console.log('✅ Loaded conversations:', rows.length);
      setItems(rows);
      loadNames(rows);
    } catch (e) {
      console.error('❌ Conversations error:', e);
      console.error('Error code:', e.code);
      console.error('Error message:', e.message);
      setError(e.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, role, loadNames]);

  useEffect(() => { load(); }, [load]);

  // If recipientId provided, navigate directly to conversation thread
  useEffect(() => {
    if (recipientId && !loading) {
      navigation.replace('ConversationThread', {
        teacherId: role === 'parent' ? recipientId : user.uid,
        parentId: role === 'parent' ? user.uid : recipientId,
        recipientName: recipientName
      });
    }
  }, [recipientId, loading, navigation, role, user?.uid, recipientName]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ConversationThread', {
        teacherId: role === 'teacher' ? user.uid : item.counterpartId,
        parentId: role === 'parent' ? user.uid : item.counterpartId,
      })}
    >
      <View style={styles.avatar}><Ionicons name="person" size={24} color={colors.white} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{nameMap[item.counterpartId] || item.counterpartId}</Text>
        <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      )}
      {!loading && error && (
        <View style={styles.center}><Text style={{ color: colors.error }}>{error}</Text></View>
      )}
      {!loading && !error && items.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No conversations yet</Text>
        </View>
      )}
      {!loading && !error && items.length > 0 && (
        <FlatList data={items} keyExtractor={(it, idx) => it.counterpartId + ':' + idx} renderItem={renderItem} contentContainerStyle={{ padding: 16 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.secondary },
  backBtn: { padding: 6 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { marginTop: 8, color: colors.textSecondary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 14, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  preview: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
