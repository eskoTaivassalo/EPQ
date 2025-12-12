import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { hideToast } from '../store/slices/toastSlice';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Toast() {
  const { visible, message, type } = useSelector((state) => state.toast);
  const dispatch = useDispatch();
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.8)).current;
  const wave = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide down, fade in, and scale up
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous wave animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(wave, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Auto hide after 4 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          dispatch(hideToast());
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible, dispatch]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'info':
        return 'information-circle';
      default:
        return 'checkmark-circle';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#2196F3';
      case 'error':
        return '#F44336';
      case 'info':
        return '#2196F3';
      default:
        return '#2196F3';
    }
  };

  // Interpolate wave animation for subtle floating effect
  const waveTranslateY = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8], // Subtle up and down movement
  });

  const waveRotate = wave.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-1deg', '1deg', '-1deg'], // Gentle rocking
  });

  // Animate gradient colors for wave effect
  const gradientStartX = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const gradientEndX = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: Animated.add(translateY, waveTranslateY) },
            { scale },
            { rotate: waveRotate },
          ],
          opacity,
        },
      ]}
    >
      <AnimatedLinearGradient
        colors={['#1976D2', '#2196F3', '#42A5F5', '#2196F3', '#1976D2']}
        start={{ x: gradientStartX, y: 0 }}
        end={{ x: gradientEndX, y: 0 }}
        style={styles.gradient}
      >
        <Ionicons name={getIcon()} size={24} color="#FFF" style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
      </AnimatedLinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
});
