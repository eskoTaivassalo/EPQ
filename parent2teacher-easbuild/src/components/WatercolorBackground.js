import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Reusable watercolor splash background component
 * Use this as the first child in any screen to add decorative background
 */
const WatercolorBackground = ({ variant = 'default' }) => {
  return (
    <View style={styles.decorativeBackground}>
      <View style={[styles.watercolorSplash, styles.splash1]} />
      <View style={[styles.watercolorSplash, styles.splash2]} />
      <View style={[styles.watercolorSplash, styles.splash3]} />
      {variant === 'full' && <View style={[styles.watercolorSplash, styles.splash4]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  decorativeBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  watercolorSplash: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0.15,
  },
  splash1: {
    width: 300,
    height: 300,
    backgroundColor: '#667eea',
    top: -100,
    left: -50,
    transform: [{ rotate: '-15deg' }],
  },
  splash2: {
    width: 250,
    height: 250,
    backgroundColor: '#f093fb',
    top: 150,
    right: -80,
    transform: [{ rotate: '25deg' }],
  },
  splash3: {
    width: 200,
    height: 200,
    backgroundColor: '#4facfe',
    bottom: 100,
    left: -30,
    transform: [{ rotate: '45deg' }],
  },
  splash4: {
    width: 280,
    height: 280,
    backgroundColor: '#43e97b',
    bottom: -100,
    right: -100,
    transform: [{ rotate: '-30deg' }],
  },
});

export default WatercolorBackground;
