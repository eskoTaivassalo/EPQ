/**
 * One-time migration script to normalize teacher phone fields.
 * Copies legacy locations (profile.phoneNumber, phoneNumber) into flat 'phone'.
 * Usage: Run inside app context after Firebase init.
 */
import { db } from '../src/config/firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

export async function migrateTeacherPhones() {
  const teachersCol = collection(db, 'teachers');
  const snap = await getDocs(teachersCol);
  let updated = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const legacy = data.phoneNumber || data.profile?.phoneNumber;
    if (legacy && !data.phone) {
      await updateDoc(doc(db, 'teachers', docSnap.id), { phone: legacy });
      updated++;
      console.log(`✅ Migrated phone for teacher ${docSnap.id}`);
    }
  }
  console.log(`Migration complete. Updated ${updated} documents.`);
}

// If run directly (e.g. with node -r esbuild-register scripts/migrateTeacherPhones.js)
if (require.main === module) {
  migrateTeacherPhones().catch(e => console.error('Migration error', e));
}
