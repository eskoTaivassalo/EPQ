import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../styles/commonStyles';

export default function ChatButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.navigate('Conversations')} style={{ paddingHorizontal: 8 }}>
      <Ionicons name="chatbubble-ellipses" size={22} color={colors.white} />
    </TouchableOpacity>
  );
}
