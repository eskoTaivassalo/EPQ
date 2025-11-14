import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebaseConfig';

/**
 * 📸 ImagePickerService
 * 
 * Palvelu kuvien valintaan, ottamiseen ja lataamiseen Firebase Storageen.
 */
class ImagePickerService {
  
  /**
   * 🎯 Pyydä kameran käyttöoikeudet
   */
  async requestCameraPermissions() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Kameran käyttöoikeus tarvitaan',
          'Tämä sovellus tarvitsee luvan käyttää kameraa profiilikuvien ottamiseen.'
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * 🎯 Pyydä kuvagallerian käyttöoikeudet
   */
  async requestMediaLibraryPermissions() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Kuvagallerian käyttöoikeus tarvitaan',
          'Tämä sovellus tarvitsee luvan käyttää kuvagalleriaa profiilikuvien valitsemiseen.'
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * 📷 Ota kuva kameralla
   * 
   * @returns {Object|null} - Kuvan URI ja metadata tai null jos peruutettu
   */
  async takePhoto() {
    try {
      // Pyydä oikeudet
      const hasPermission = await this.requestCameraPermissions();
      if (!hasPermission) {
        return null;
      }

      // Avaa kamera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Neliön muotoinen kuva
        quality: 0.8, // Optimoi tiedostokokoa
      });

      if (result.canceled) {
        console.log('📷 User canceled taking photo');
        return null;
      }

      console.log('✅ Photo taken:', result.assets[0]);
      return result.assets[0];
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('Virhe', 'Kuvan ottaminen epäonnistui');
      return null;
    }
  }

  /**
   * 🖼️ Valitse kuva galleriasta
   * 
   * @returns {Object|null} - Kuvan URI ja metadata tai null jos peruutettu
   */
  async pickImage() {
    try {
      // Pyydä oikeudet
      const hasPermission = await this.requestMediaLibraryPermissions();
      if (!hasPermission) {
        return null;
      }

      // Avaa galleria
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Neliön muotoinen kuva
        quality: 0.8, // Optimoi tiedostokokoa
      });

      if (result.canceled) {
        console.log('🖼️ User canceled picking image');
        return null;
      }

      console.log('✅ Image picked:', result.assets[0]);
      return result.assets[0];
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Virhe', 'Kuvan valitseminen epäonnistui');
      return null;
    }
  }

  /**
   * ☁️ Lataa kuva Firebase Storageen
   * 
   * @param {string} imageUri - Paikallinen kuvan URI
   * @param {string} userId - Käyttäjän ID
   * @param {string} fileName - Tiedoston nimi (oletus: 'profile.jpg')
   * @returns {string|null} - Kuvan julkinen URL tai null jos epäonnistui
   */
  async uploadImage(imageUri, userId, fileName = 'profile.jpg') {
    try {
      console.log('☁️ Uploading image to Firebase Storage...');
      console.log('  URI:', imageUri);
      console.log('  User ID:', userId);
      console.log('  File name:', fileName);

      // Tarkista että storage on alustettu
      if (!storage) {
        throw new Error('Firebase Storage ei ole alustettu');
      }

      // Hae kuva binäärimuodossa
      const response = await fetch(imageUri);
      const blob = await response.blob();

      console.log('  Blob size:', blob.size, 'bytes');
      console.log('  Blob type:', blob.type);

      // Luo viittaus Firebase Storageen
      const storageRef = ref(storage, `profiles/${userId}/${fileName}`);

      // Lataa kuva
      console.log('  Uploading to path:', `profiles/${userId}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, blob);
      console.log('✅ Image uploaded successfully');

      // Hae julkinen URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('✅ Download URL:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      Alert.alert('Virhe', 'Kuvan lataaminen epäonnistui');
      return null;
    }
  }

  /**
   * 🗑️ Poista kuva Firebase Storagesta
   * 
   * @param {string} userId - Käyttäjän ID
   * @param {string} fileName - Tiedoston nimi (oletus: 'profile.jpg')
   * @returns {boolean} - True jos onnistui, false jos epäonnistui
   */
  async deleteImage(userId, fileName = 'profile.jpg') {
    try {
      console.log('🗑️ Deleting image from Firebase Storage...');
      console.log('  User ID:', userId);
      console.log('  File name:', fileName);

      // Tarkista että storage on alustettu
      if (!storage) {
        throw new Error('Firebase Storage ei ole alustettu');
      }

      const storageRef = ref(storage, `profiles/${userId}/${fileName}`);

      await deleteObject(storageRef);
      console.log('✅ Image deleted successfully');

      return true;
    } catch (error) {
      // Jos tiedostoa ei löydy, palautetaan true (ei ongelmaa)
      if (error.code === 'storage/object-not-found') {
        console.log('ℹ️ Image not found, nothing to delete');
        return true;
      }

      console.error('❌ Error deleting image:', error);
      return false;
    }
  }

  /**
   * 🎨 Näytä valintalomake: Kamera vai Galleria
   * 
   * @returns {Object|null} - Kuvan URI ja metadata tai null jos peruutettu
   */
  async showImagePickerOptions() {
    return new Promise((resolve) => {
      Alert.alert(
        'Valitse profiilikuva',
        'Mistä haluat valita profiilikuvan?',
        [
          {
            text: '📷 Ota kuva',
            onPress: async () => {
              const result = await this.takePhoto();
              resolve(result);
            }
          },
          {
            text: '🖼️ Valitse galleriasta',
            onPress: async () => {
              const result = await this.pickImage();
              resolve(result);
            }
          },
          {
            text: 'Peruuta',
            style: 'cancel',
            onPress: () => resolve(null)
          }
        ]
      );
    });
  }
}

export default new ImagePickerService();
