/**
 * Script to clean invalid data from Firestore using Web SDK
 * Run with: node scripts/clean-invalid-data-web.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

// Import Firebase config
const firebaseConfig = {
  // You need to add your Firebase config here
  // Copy from src/config/firebaseConfig.js
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanInvalidSlots() {
  console.log('\n🔍 Checking availabilitySlots...');
  const slotsRef = collection(db, 'availabilitySlots');
  const snapshot = await getDocs(slotsRef);
  
  console.log(`Found ${snapshot.docs.length} slots total`);
  
  let invalidCount = 0;
  let batch = writeBatch(db);
  let batchCount = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    let isInvalid = false;
    
    // Check if start/end exist and are valid
    if (!data.start || !data.end) {
      console.log(`❌ Slot ${docSnap.id}: Missing start/end`);
      isInvalid = true;
    } else {
      try {
        const start = data.start.toDate ? data.start.toDate() : new Date(data.start);
        const end = data.end.toDate ? data.end.toDate() : new Date(data.end);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.log(`❌ Slot ${docSnap.id}: Invalid dates - start: ${data.start}, end: ${data.end}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Slot ${docSnap.id}: Error parsing dates - ${e.message}`);
        isInvalid = true;
      }
    }
    
    if (isInvalid) {
      batch.delete(docSnap.ref);
      invalidCount++;
      batchCount++;
      
      // Firestore batch limit is 500
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} deletions`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`💾 Committed final batch of ${batchCount} deletions`);
  }
  
  console.log(`✅ Deleted ${invalidCount} invalid slots out of ${snapshot.docs.length} total`);
  return invalidCount;
}

async function cleanInvalidBookings() {
  console.log('\n🔍 Checking bookings...');
  const bookingsRef = collection(db, 'bookings');
  const snapshot = await getDocs(bookingsRef);
  
  console.log(`Found ${snapshot.docs.length} bookings total`);
  
  let invalidCount = 0;
  let batch = writeBatch(db);
  let batchCount = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    let isInvalid = false;
    
    // Check if date exists and is valid
    if (!data.date) {
      console.log(`❌ Booking ${docSnap.id}: Missing date`);
      isInvalid = true;
    } else {
      try {
        const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
        
        if (isNaN(date.getTime())) {
          console.log(`❌ Booking ${docSnap.id}: Invalid date - ${data.date}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Booking ${docSnap.id}: Error parsing date - ${e.message}`);
        isInvalid = true;
      }
    }
    
    // Check start/end if they exist
    if (data.start) {
      try {
        const start = data.start.toDate ? data.start.toDate() : new Date(data.start);
        if (isNaN(start.getTime())) {
          console.log(`❌ Booking ${docSnap.id}: Invalid start - ${data.start}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Booking ${docSnap.id}: Error parsing start - ${e.message}`);
        isInvalid = true;
      }
    }
    
    if (data.end) {
      try {
        const end = data.end.toDate ? data.end.toDate() : new Date(data.end);
        if (isNaN(end.getTime())) {
          console.log(`❌ Booking ${docSnap.id}: Invalid end - ${data.end}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Booking ${docSnap.id}: Error parsing end - ${e.message}`);
        isInvalid = true;
      }
    }
    
    if (isInvalid) {
      batch.delete(docSnap.ref);
      invalidCount++;
      batchCount++;
      
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} deletions`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`💾 Committed final batch of ${batchCount} deletions`);
  }
  
  console.log(`✅ Deleted ${invalidCount} invalid bookings out of ${snapshot.docs.length} total`);
  return invalidCount;
}

async function main() {
  console.log('🚀 Starting data cleanup...');
  console.log('⚠️  This will DELETE documents with invalid dates!');
  
  try {
    const slotsDeleted = await cleanInvalidSlots();
    const bookingsDeleted = await cleanInvalidBookings();
    
    console.log('\n✨ Cleanup complete!');
    console.log(`📊 Total deleted: ${slotsDeleted + bookingsDeleted} documents`);
    console.log(`   - Slots: ${slotsDeleted}`);
    console.log(`   - Bookings: ${bookingsDeleted}`);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
