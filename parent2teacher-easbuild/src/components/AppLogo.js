import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

// Simple reusable logo component; tweak size via props
const AppLogo = ({ size = 72, style, source }) => {
  // Default to the app logo if no source provided (using logo2.png which has no gray background)
  const logoSource = source || require('../../assets/logo2.png');
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={logoSource}
        resizeMode="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Make logo background transparent to blend with app background
    overflow: 'hidden',
    borderRadius: 999, // Makes it circular/rounded
  }
});

export default AppLogo;
