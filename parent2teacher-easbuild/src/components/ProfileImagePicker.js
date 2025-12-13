import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import imagePickerService from '../services/imagePickerService';
import { colors, commonStyles } from '../styles/commonStyles';

/**
 * 📸 ProfileImagePicker
 * 
 * Komponentti profiilikuvan valitsemiseen ja ottamiseen.
 * Näyttää nykyisen profiilikuvan tai placeholderin.
 */
const ProfileImagePicker = ({ 
  imageUri, 
  onImageSelected, 
  size = 120,
  editable = true 
}) => {
  const [loading, setLoading] = useState(false);

  /**
   * Käsittele kuvan valinta
   */
  const handleSelectImage = async () => {
    if (!editable) return;

    try {
      setLoading(true);
      
      // Näytä valintalomake
      const result = await imagePickerService.showImagePickerOptions();
      
      if (result && result.uri) {
        onImageSelected(result.uri);
      }
    } catch (error) {
      Alert.alert('Virhe', 'Kuvan valitseminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Poista profiilikuva
   */
  const handleRemoveImage = () => {
    if (!editable) return;

    Alert.alert(
      'Poista profiilikuva',
      'Haluatko varmasti poistaa profiilikuvan?',
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Poista',
          style: 'destructive',
          onPress: () => onImageSelected(null)
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.imageContainer, { width: size, height: size }]}>
        {loading ? (
          // Latausanimaatio
          <View style={[styles.imagePlaceholder, { width: size, height: size }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : imageUri ? (
          // Valittu profiilikuva
          <>
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, { width: size, height: size }]}
              resizeMode="cover"
            />
            {editable && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveImage}
              >
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          // Placeholder
          <View style={[styles.imagePlaceholder, { width: size, height: size }]}>
            <Ionicons name="person" size={size * 0.5} color="#ccc" />
          </View>
        )}

        {/* Muokkaa-painike */}
        {editable && (
          <TouchableOpacity
            style={[styles.editButton, { bottom: -5, right: -5 }]}
            onPress={handleSelectImage}
            disabled={loading}
          >
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Ohjeteksti */}
      {editable && !imageUri && (
        <Text style={styles.helpText}>
          Lisää profiilikuva napauttamalla kamera-ikonia
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 100,
    overflow: 'visible', // Sallii painikkeiden näkymisen reunojen yli
  },
  image: {
    borderRadius: 100,
    backgroundColor: '#f0f0f0',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  imagePlaceholder: {
    borderRadius: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ddd',
  },
  editButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...commonStyles.shadow,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...commonStyles.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  helpText: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default ProfileImagePicker;
