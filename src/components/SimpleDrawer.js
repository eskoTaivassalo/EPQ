import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

/**
 * SimpleDrawer - Kevyt drawer-valikko ilman natiiviriippuvuuksia
 * Käyttää React Native:n Modal + Animated komponentteja
 */
export default function SimpleDrawer({ visible, onClose, navigation, menuItems, userType, onLogout }) {
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
    // Pieni viive jotta drawer sulkeutuu ensin
    setTimeout(() => {
      navigation.navigate(screenName);
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
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
              <Text style={styles.appName}>EPQ</Text>
              <Text style={styles.userTypeLabel}>
                {userType === 'teacher' ? '👨‍🏫 Teacher' : '👨‍👩‍👧 Parent'}
              </Text>
            </View>

            {/* Menu items */}
            <ScrollView style={styles.menuContainer}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleNavigate(item.screen)}
                >
                  <Ionicons 
                    name={item.icon} 
                    size={22} 
                    color={colors.primary} 
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
        
        {/* Tausta joka sulkee drawerin kun klikataan */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: 280,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  drawer: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 30,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  userTypeLabel: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    marginRight: 15,
    width: 24,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFF5F5',
  },
  logoutLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  version: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
