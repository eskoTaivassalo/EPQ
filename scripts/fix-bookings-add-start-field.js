/**
 * Script to fix old bookings that are missing the 'start' and 'end' fields
 * This adds proper timestamps based on the availability slot data
 */

const admin = require('firebase-admin');

// Parse command line arguments
const args = process.argv.slice(2);
const serviceAccountPath = args.find(arg => arg.startsWith('--serviceAccount='))?.split('=')[1];
const projectId = args.find(arg => arg.startsWith('--projectId='))?.split('=')[1];

if (!serviceAccountPath || !projectId) {
  console.error('Usage: node fix-bookings-add-start-field.js --serviceAccount=<path> --projectId=<id>');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath.startsWith('.') 
  ? require('path').resolve(__dirname, '..', serviceAccountPath)
  : serviceAccountPath
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: projectId
});

const db = admin.firestore();

async function fixBookings() {
  try {
    console.log('🔍 Fetching all bookings...');
    
    const bookingsSnapshot = await db.collection('bookings').get();
    console.log(`📋 Found ${bookingsSnapshot.size} bookings`);
    
    let fixedCount = 0;
    let alreadyCorrect = 0;
    let failedCount = 0;
    
    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
      const bookingId = doc.id;
      
      // Check if start and end fields are missing
      if (booking.start && booking.end) {
        console.log(`✅ Booking ${bookingId} already has start/end fields`);
        alreadyCorrect++;
        continue;
      }
      
      console.log(`\n🔧 Fixing booking ${bookingId}...`);
      console.log(`   Current data: date=${booking.date}, slotId=${booking.slotId}`);
      
      // Try to get the slot data
      if (booking.slotId) {
        try {
          const slotDoc = await db.collection('availabilitySlots').doc(booking.slotId).get();
          
          if (slotDoc.exists) {
            const slot = slotDoc.data();
            
            // Update booking with start and end from slot
            await db.collection('bookings').doc(bookingId).update({
              start: slot.start,
              end: slot.end
            });
            
            console.log(`   ✅ Updated with start=${slot.start}, end=${slot.end}`);
            fixedCount++;
          } else {
            console.log(`   ⚠️ Slot ${booking.slotId} not found, cannot fix this booking`);
            failedCount++;
          }
        } catch (error) {
          console.error(`   ❌ Error fetching slot: ${error.message}`);
          failedCount++;
        }
      } else {
        console.log(`   ⚠️ No slotId, cannot determine start/end times`);
        failedCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Fixed: ${fixedCount}`);
    console.log(`   ✓ Already correct: ${alreadyCorrect}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   📋 Total: ${bookingsSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixBookings();
