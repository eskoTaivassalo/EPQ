import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AppLogo from './AppLogo';
import { colors } from '../styles/commonStyles';

/**
 * FullScreenSplash - Koko näytön latausnäkymä logolla
 * Käytetään navigoinnin aikana ennen varsinaisen näkymän latausta
 */
const FullScreenSplash = ({ navigation, route }) => {
  const { targetScreen, targetParams } = route.params || {};

  useEffect(() => {
    // Näytä splash lyhyesti, sitten siirry varsinaiseen näkymään
    const timer = setTimeout(() => {
      if (targetScreen) {
        // Käytä replace:a jotta ei tule slide-animaatiota
        navigation.replace(targetScreen, targetParams);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [navigation, targetScreen, targetParams]);

  return (
    <View style={styles.container}>
      <AppLogo size={180} />
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  spinner: {
    marginTop: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
});

export default FullScreenSplash;
