import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';
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

  // Jos recipientId on annettu, navigoi HETI suoraan keskusteluun
  useEffect(() => {
    if (recipientId && user?.uid) {
      navigation.replace('ConversationThread', {
        teacherId: role === 'parent' ? recipientId : user.uid,
        parentId: role === 'parent' ? user.uid : recipientId,
        recipientName: recipientName
      });
    }
  }, [recipientId, navigation, role, user?.uid, recipientName]);


  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listConversationsForUser(user.uid, role);
      
      // Load names BEFORE setting items to avoid showing IDs
      const ids = Array.from(new Set(rows.map(r => r.counterpartId).filter(Boolean)));
      const map = {};
      const collectionName = role === 'teacher' ? 'students' : 'teachers';
      
      await Promise.all(ids.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'serviceTypes', 'education', collectionName, id));
          const data = snap.exists() ? snap.data() : null;
          map[id] = data?.name || data?.fullName || data?.displayName || id;
        } catch (err) {
          console.warn('Failed to load name for', id, err);
          map[id] = id;
        }
      }));
      
      setNameMap(map);
      setItems(rows);
    } catch (e) {
      setError(e.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, role]);

  useEffect(() => { 
    // Lataa keskustelut vain jos ei olla navigoitu suoraan keskusteluun
    if (!recipientId) {
      load();
    }
  }, [load, recipientId]);

  const renderItem = ({ item }) => {
    const isSupport = item.type === 'support';
    const displayName = isSupport 
      ? item.counterpartName || item.counterpartEmail || nameMap[item.counterpartId] || 'Support'
      : nameMap[item.counterpartId] || item.counterpartId;
    
    const categoryIcon = isSupport && item.category === 'technical' ? 'bug' : 
                        isSupport && item.category === 'billing' ? 'card' :
                        isSupport && item.category === 'feedback' ? 'chatbubble' :
                        isSupport ? 'help-circle' : 'person';
    
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && isSupport && styles.unreadCard]}
        onPress={() => {
          if (isSupport) {
            // Support conversation: pass both user IDs (order doesn't matter in subscribeToSupportConversation)
            navigation.navigate('ConversationThread', {
              isSupportConversation: true,
              userId1: user.uid,
              userId2: item.counterpartId,
              recipientName: displayName,
              category: item.category,
              subject: item.subject,
            });
          } else {
            // Regular teacher<->parent conversation
            navigation.navigate('ConversationThread', {
              teacherId: role === 'teacher' ? user.uid : item.counterpartId,
              parentId: role === 'parent' ? user.uid : item.counterpartId,
              recipientName: displayName,
            });
          }
        }}
      >
        <View style={[styles.avatar, isSupport && styles.supportAvatar]}>
          <Ionicons name={categoryIcon} size={24} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.name}>{displayName}</Text>
            {isSupport && item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
              </View>
            )}
            {!item.isRead && isSupport && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          {isSupport && item.subject && (
            <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
          )}
          <Text style={styles.preview} numberOfLines={1}>{item.lastMessage || ''}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 28 }} />
      </View>

      {error && (
        <View style={commonStyles.emptyState}><Text style={{ color: colors.error }}>{error}</Text></View>
      )}
      {!error && items.length === 0 && !loading && (
        <View style={commonStyles.emptyState}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} style={commonStyles.emptyStateIcon} />
          <Text style={commonStyles.emptyStateText}>No conversations yet</Text>
        </View>
      )}
      {!error && (
        <FlatList data={items} keyExtractor={(it, idx) => it.counterpartId + ':' + idx} renderItem={renderItem} contentContainerStyle={{ padding: 16 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { ...commonStyles.rowBetween, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.secondary },
  backBtn: { padding: 6 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  emptyText: { ...commonStyles.emptyStateText, marginTop: 8 },
  card: { ...commonStyles.card, ...commonStyles.row, marginBottom: 10 },
  unreadCard: { backgroundColor: '#FFFBEB', borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  supportAvatar: { backgroundColor: '#F59E0B' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  subject: { fontSize: 13, fontWeight: '500', color: colors.text, marginTop: 2 },
  preview: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  categoryBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryText: { fontSize: 9, fontWeight: '700', color: '#F59E0B' },
  newBadge: { backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
});
