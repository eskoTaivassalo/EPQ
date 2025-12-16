/**
 * Script to clean invalid data from Firestore
 * Run with: node scripts/clean-invalid-data.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanInvalidSlots() {
  console.log('\n🔍 Checking availabilitySlots...');
  const slotsRef = db.collection('availabilitySlots');
  const snapshot = await slotsRef.get();
  
  let invalidCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let isInvalid = false;
    
    // Check if start/end exist and are valid
    if (!data.start || !data.end) {
      console.log(`❌ Slot ${doc.id}: Missing start/end`);
      isInvalid = true;
    } else {
      try {
        const start = data.start.toDate ? data.start.toDate() : new Date(data.start);
        const end = data.end.toDate ? data.end.toDate() : new Date(data.end);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.log(`❌ Slot ${doc.id}: Invalid dates - start: ${data.start}, end: ${data.end}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Slot ${doc.id}: Error parsing dates - ${e.message}`);
        isInvalid = true;
      }
    }
    
    if (isInvalid) {
      batch.delete(doc.ref);
      invalidCount++;
      batchCount++;
      
      // Firestore batch limit is 500
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} deletions`);
        batchCount = 0;
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`💾 Committed final batch of ${batchCount} deletions`);
  }
  
  console.log(`✅ Deleted ${invalidCount} invalid slots`);
  return invalidCount;
}

async function cleanInvalidBookings() {
  console.log('\n🔍 Checking bookings...');
  const bookingsRef = db.collection('bookings');
  const snapshot = await bookingsRef.get();
  
  let invalidCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let isInvalid = false;
    
    // Check if date exists and is valid
    if (!data.date) {
      console.log(`❌ Booking ${doc.id}: Missing date`);
      isInvalid = true;
    } else {
      try {
        const date = data.date.toDate ? data.date.toDate() : new Date(data.date);
        
        if (isNaN(date.getTime())) {
          console.log(`❌ Booking ${doc.id}: Invalid date - ${data.date}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Booking ${doc.id}: Error parsing date - ${e.message}`);
        isInvalid = true;
      }
    }
    
    // Check start/end if they exist
    if (data.start) {
      try {
        const start = data.start.toDate ? data.start.toDate() : new Date(data.start);
        if (isNaN(start.getTime())) {
          console.log(`❌ Booking ${doc.id}: Invalid start - ${data.start}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Booking ${doc.id}: Error parsing start - ${e.message}`);
        isInvalid = true;
      }
    }
    
    if (data.end) {
      try {
        const end = data.end.toDate ? data.end.toDate() : new Date(data.end);
        if (isNaN(end.getTime())) {
          console.log(`❌ Booking ${doc.id}: Invalid end - ${data.end}`);
          isInvalid = true;
        }
      } catch (e) {
        console.log(`❌ Booking ${doc.id}: Error parsing end - ${e.message}`);
        isInvalid = true;
      }
    }
    
    if (isInvalid) {
      batch.delete(doc.ref);
      invalidCount++;
      batchCount++;
      
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`💾 Committed batch of ${batchCount} deletions`);
        batchCount = 0;
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`💾 Committed final batch of ${batchCount} deletions`);
  }
  
  console.log(`✅ Deleted ${invalidCount} invalid bookings`);
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
