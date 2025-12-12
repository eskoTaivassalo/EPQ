import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, commonStyles } from '../styles/commonStyles';
import AppLogo from './AppLogo';

/**
 * SimpleDrawer - Kevyt drawer-valikko ilman natiiviriippuvuuksia
 * Käyttää React Native:n Modal + Animated komponentteja
 */
export default function SimpleDrawer({ visible, onClose, navigation, menuItems, userType, onLogout, roleColors }) {
  const slideAnim = React.useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNavigate = (screenName) => {
    onClose();
    requestAnimationFrame(() => {
      navigation.push(screenName);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Tausta joka sulkee drawerin kun klikataan */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        {/* Drawer-sisältö oikealla */}
        <Animated.View 
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <SafeAreaView style={styles.drawer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <AppLogo size={90} />
                <Text style={[styles.userTypeLabel, { color: roleColors?.primary || colors.primary }]}>
                  {userType === 'teacher' ? 'Teacher' : 'Parent'}
                </Text>
              </View>
            </View>

            {/* Menu items */}
            <ScrollView 
              style={styles.menuContainer}
              contentContainerStyle={styles.menuContentContainer}
            >
              {(menuItems || []).map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleNavigate(item.screen)}
                >
                  <Ionicons 
                    name={item.icon} 
                    size={22} 
                    color={roleColors?.primary || colors.primary} 
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons 
                    name="chevron-forward" 
                    size={18} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Logout button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                onClose();
                setTimeout(() => {
                  onLogout();
                }, 100);
              }}
            >
              <Ionicons 
                name="log-out-outline" 
                size={22} 
                color={colors.error} 
                style={styles.menuIcon}
              />
              <Text style={styles.logoutLabel}>Log Out</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.version}>v1.0.0</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: 300,
    backgroundColor: '#F8F9FA',
    ...commonStyles.shadowHeavy,
  },
  drawer: {
    flex: 1,
  }, 
  header: {
    padding: 16,
    paddingTop: 24,
    borderBottomLeftRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 6,
    letterSpacing: 1,
  },
  userTypeLabel: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  menuContentContainer: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  menuItem: {
    ...commonStyles.card,
    ...commonStyles.row,
    paddingVertical: 16,
    marginBottom: 8,
  },
  menuIcon: {
    marginRight: 16,
    width: 24,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  logoutButton: {
    ...commonStyles.row,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
  },
});
