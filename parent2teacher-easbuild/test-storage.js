/**
 * 🧪 Firebase Storage Test
 * 
 * Tämä scripti testaa Firebase Storage -yhteyttä
 */

import { storage } from './src/config/firebaseConfig.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function testFirebaseStorage() {
  console.log('🧪 Testing Firebase Storage connection...\n');

  // 1. Tarkista että storage on alustettu
  console.log('1️⃣ Checking storage initialization...');
  if (!storage) {
    console.error('❌ Firebase Storage is NOT initialized!');
    console.log('\n📝 Solution:');
    console.log('   - Check that firebaseConfig.js exports storage');
    console.log('   - Verify EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET in environment');
    return;
  }
  console.log('✅ Firebase Storage initialized');
  console.log('   App:', storage.app.name);
  console.log('   Bucket:', storage.app.options.storageBucket);

  // 2. Testaa yksinkertainen lataus
  console.log('\n2️⃣ Testing upload...');
  try {
    const testData = new Blob(['Hello Firebase Storage!'], { type: 'text/plain' });
    const testRef = ref(storage, 'test/test-file.txt');
    
    console.log('   Uploading test file...');
    await uploadBytes(testRef, testData);
    console.log('✅ Upload successful!');

    // 3. Testaa URL:n haku
    console.log('\n3️⃣ Testing download URL...');
    const downloadURL = await getDownloadURL(testRef);
    console.log('✅ Download URL retrieved:');
    console.log('   ', downloadURL);

    console.log('\n✅ All tests passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Build new development build: eas build --profile development --platform android');
    console.log('   2. Install the new build on your device');
    console.log('   3. Test image upload in the app');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'storage/unauthorized') {
      console.log('\n📝 Solution:');
      console.log('   - Check Firebase Storage Rules in Firebase Console');
      console.log('   - Make sure authenticated users have write permission');
      console.log('   - Rules should include: allow write: if request.auth != null;');
    } else if (error.code === 'storage/unknown') {
      console.log('\n📝 Solution:');
      console.log('   - Firebase Storage might not be enabled in Firebase Console');
      console.log('   - Go to Firebase Console > Storage > Get Started');
    }
  }
}

// Suorita testi
testFirebaseStorage().catch(console.error);
